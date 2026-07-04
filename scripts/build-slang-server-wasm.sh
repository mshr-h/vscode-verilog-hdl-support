#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
lock_file="$repo_root/build/slang-server.lock.json"
cache_root="${SLANG_WASM_CACHE_DIR:-$repo_root/.cache/slang-server-wasm}"
source_dir="$cache_root/source"
build_dir="$cache_root/build"
downloads_dir="$cache_root/downloads"
install_dir="$cache_root/tools"
wasm_dir="$repo_root/resources/wasm"
licenses_dir="$wasm_dir/licenses"

json_get() {
  local expr="$1"
  node -e "const lock=require(process.argv[1]); const value=$expr; if (value === undefined || value === null) process.exit(2); process.stdout.write(String(value));" "$lock_file"
}

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: required tool '$1' was not found" >&2
    exit 1
  fi
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

download() {
  local url="$1"
  local out="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 --retry-delay 5 -o "$out" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$out" "$url"
  else
    echo "error: curl or wget is required to download $url" >&2
    exit 1
  fi
}

host_key() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$os:$arch" in
    Linux:x86_64) echo "linux-x64" ;;
    Darwin:x86_64) echo "darwin-x64" ;;
    Darwin:arm64) echo "darwin-arm64" ;;
    *)
      echo "error: unsupported host for automatic WASI SDK install: $os $arch" >&2
      echo "Set WASI_SDK_PATH to a WASI SDK $(json_get 'lock.wasiSdkVersion') install." >&2
      exit 1
      ;;
  esac
}

detect_wasi_sdk_version() {
  local sdk="$1"
  local clang="$sdk/bin/clang"
  if [[ ! -x "$clang" ]]; then
    echo ""
    return
  fi
  "$clang" --version 2>/dev/null | sed -n 's/.*wasi-sdk-\([0-9][^ )]*\).*/\1/p' | head -n 1
}

validate_wasi_sdk() {
  local sdk="$1"
  local expected_version="$2"
  local detected_version clang_version
  detected_version="$(detect_wasi_sdk_version "$sdk")"
  if [[ "$detected_version" == "$expected_version" ]]; then
    return 0
  fi
  if [[ "$(basename "$sdk")" == *"$expected_version"* || "$(basename "$(dirname "$sdk")")" == *"$expected_version"* ]]; then
    clang_version="$("$sdk/bin/clang" --version 2>/dev/null || true)"
    if [[ "$clang_version" == *"wasi-sdk"* && "$clang_version" == *"Target: wasm32-unknown-wasi"* ]]; then
      return 0
    fi
  fi
  return 1
}

find_wasi_sdk_dir() {
  local sdk_parent="$1"
  local clang
  clang="$(find "$sdk_parent" -maxdepth 3 \( -type f -o -type l \) -path '*/bin/clang' | head -n 1)"
  if [[ -n "$clang" ]]; then
    dirname "$(dirname "$clang")"
  fi
}

ensure_wasi_sdk() {
  local expected_version actual_version key url archive sdk_parent sdk_dir
  expected_version="$(json_get 'lock.wasiSdkVersion')"

  if [[ -n "${WASI_SDK_PATH:-}" ]]; then
    if ! validate_wasi_sdk "$WASI_SDK_PATH" "$expected_version"; then
      actual_version="$(detect_wasi_sdk_version "$WASI_SDK_PATH")"
      echo "error: WASI_SDK_PATH version mismatch: expected $expected_version, got ${actual_version:-unknown}" >&2
      exit 1
    fi
    echo "$WASI_SDK_PATH"
    return
  fi

  key="$(host_key)"
  url="$(node -e "const lock=require(process.argv[1]); process.stdout.write(lock.wasiSdkUrls['$key'] || '')" "$lock_file")"
  if [[ -z "$url" ]]; then
    echo "error: lock file has no WASI SDK URL for $key" >&2
    exit 1
  fi

  sdk_parent="$install_dir/wasi-sdk-$expected_version-$key"
  sdk_dir="$sdk_parent/wasi-sdk-$expected_version"
  if [[ ! -x "$sdk_dir/bin/clang" ]]; then
    sdk_dir="$(find_wasi_sdk_dir "$sdk_parent")"
  fi
  if [[ -z "$sdk_dir" || ! -x "$sdk_dir/bin/clang" ]]; then
    mkdir -p "$downloads_dir" "$sdk_parent"
    archive="$downloads_dir/$(basename "$url")"
    if [[ ! -f "$archive" ]]; then
      echo "Downloading WASI SDK $expected_version for $key" >&2
      download "$url" "$archive"
    fi
    rm -rf "$sdk_parent"
    mkdir -p "$sdk_parent"
    tar -xzf "$archive" -C "$sdk_parent"
    sdk_dir="$(find_wasi_sdk_dir "$sdk_parent")"
  fi

  if [[ -z "$sdk_dir" || ! -x "$sdk_dir/bin/clang" ]]; then
    echo "error: could not find clang in downloaded WASI SDK" >&2
    exit 1
  fi
  if ! validate_wasi_sdk "$sdk_dir" "$expected_version"; then
    actual_version="$(detect_wasi_sdk_version "$sdk_dir")"
    echo "error: downloaded WASI SDK version mismatch: expected $expected_version, got ${actual_version:-unknown}" >&2
    exit 1
  fi
  echo "$sdk_dir"
}

require_tool node
require_tool git
require_tool cmake
require_tool ninja
require_tool tar

slang_server_url="$(json_get 'lock.slangServerUrl')"
slang_server_commit="$(json_get 'lock.slangServerCommit')"
slang_commit="$(json_get 'lock.slangCommit')"
build_type="$(json_get 'lock.buildType')"
generator="$(json_get 'lock.cmakeGenerator')"
wasi_sdk_path="$(ensure_wasi_sdk)"
wasi_toolchain_file="$wasi_sdk_path/share/cmake/wasi-sdk-pthread.cmake"
if [[ ! -f "$wasi_toolchain_file" ]]; then
  wasi_toolchain_file="$wasi_sdk_path/share/cmake/wasi-sdk.cmake"
fi

mkdir -p "$cache_root" "$wasm_dir" "$licenses_dir"

if [[ ! -d "$source_dir/.git" ]]; then
  git clone "$slang_server_url" "$source_dir"
else
  git -C "$source_dir" fetch --tags --prune origin
fi

git -C "$source_dir" checkout --force "$slang_server_commit"
git -C "$source_dir" submodule update --init --recursive
git -C "$source_dir" reset --hard
git -C "$source_dir" clean -fdx
git -C "$source_dir" submodule foreach --recursive 'git reset --hard && git clean -fdx'

actual_slang_commit="$(git -C "$source_dir/external/slang" rev-parse HEAD)"
if [[ "$actual_slang_commit" != "$slang_commit" ]]; then
  echo "error: external/slang commit mismatch: expected $slang_commit, got $actual_slang_commit" >&2
  exit 1
fi

node "$repo_root/scripts/patch-slang-server-wasi.mjs" "$source_dir"

rm -rf "$build_dir"
cmake -S "$source_dir" -B "$build_dir" \
  -G "$generator" \
  -DCMAKE_BUILD_TYPE="$build_type" \
  -DCMAKE_CXX_SCAN_FOR_MODULES=OFF \
  -DCMAKE_TOOLCHAIN_FILE="$wasi_toolchain_file" \
  -DCMAKE_C_FLAGS="-D_WASI_EMULATED_PTHREAD" \
  -DCMAKE_CXX_FLAGS="-D_WASI_EMULATED_PTHREAD" \
  -DCMAKE_EXE_LINKER_FLAGS="-lpthread" \
  -DSLANG_SERVER_INCLUDE_TESTS=OFF \
  -DSLANG_SERVER_INCLUDE_INSTALL=OFF \
  -DSLANG_INCLUDE_TESTS=OFF \
  -DSLANG_INCLUDE_TOOLS=OFF \
  -DSLANG_USE_THREADS=OFF \
  -DSLANG_USE_MIMALLOC=OFF

if cmake --build "$build_dir" --target help | grep -Eq '(^|[[:space:]])slang_server([[:space:]]|:|$)'; then
  cmake --build "$build_dir" --target slang_server --config "$build_type"
else
  echo "warning: target slang_server was not listed; building the default CMake target" >&2
  cmake --build "$build_dir" --config "$build_type"
fi

wasm_output="$(find "$build_dir" -type f \( -name 'slang-server.wasm' -o -name 'slang_server.wasm' \) | head -n 1)"
if [[ -z "$wasm_output" && -f "$build_dir/bin/slang-server" ]]; then
  wasm_output="$build_dir/bin/slang-server"
fi
if [[ -z "$wasm_output" ]]; then
  echo "error: could not locate slang-server.wasm under $build_dir" >&2
  exit 1
fi

cp "$wasm_output" "$wasm_dir/slang-server.wasm"

if [[ -f "$source_dir/LICENSE" ]]; then
  cp "$source_dir/LICENSE" "$licenses_dir/slang-server.LICENSE"
fi
if [[ -f "$source_dir/external/slang/LICENSE" ]]; then
  cp "$source_dir/external/slang/LICENSE" "$licenses_dir/slang.LICENSE"
fi

cat >"$licenses_dir/THIRD_PARTY_NOTICES.md" <<EOF
# Bundled slang-server.wasm third-party notices

This bundle is built from:

- hudson-trading/slang-server@$slang_server_commit
- MikePopoloski/slang@$slang_commit

The primary upstream license files are bundled beside this notice as:

- slang-server.LICENSE
- slang.LICENSE

Refresh this notice from the locked upstream checkout whenever the lock file is
updated or the WASM build starts bundling additional third-party components.
EOF

smoke_status="skipped"
smoke_output="wasmtime not found"
if command -v wasmtime >/dev/null 2>&1; then
  set +e
  smoke_output="$(wasmtime --dir "$repo_root" "$wasm_dir/slang-server.wasm" --version 2>&1)"
  smoke_code=$?
  set -e
  if [[ $smoke_code -eq 0 ]]; then
    smoke_status="passed"
  else
    smoke_status="failed"
  fi
fi

wasm_size="$(wc -c <"$wasm_dir/slang-server.wasm" | tr -d ' ')"
wasm_sha="$(sha256_file "$wasm_dir/slang-server.wasm")"
cmake_version="$(cmake --version | head -n 1)"
ninja_version="$(ninja --version)"
wasi_clang_version="$("$wasi_sdk_path/bin/clang" --version | head -n 1)"
build_timestamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

BUILD_METADATA_OUT="$wasm_dir/slang-server.meta.json" \
SLANG_SERVER_REPO="$(json_get 'lock.slangServerRepo')" \
SLANG_SERVER_COMMIT="$slang_server_commit" \
SLANG_COMMIT="$slang_commit" \
WASI_SDK_VERSION="$(json_get 'lock.wasiSdkVersion')" \
BUILD_TYPE="$build_type" \
CMAKE_GENERATOR="$generator" \
BUILD_TIMESTAMP="$build_timestamp" \
WASM_SHA="$wasm_sha" \
WASM_SIZE="$wasm_size" \
CMAKE_VERSION="$cmake_version" \
NINJA_VERSION="$ninja_version" \
WASI_CLANG_VERSION="$wasi_clang_version" \
SMOKE_STATUS="$smoke_status" \
SMOKE_OUTPUT="$smoke_output" \
node <<'EOF'
const fs = require('fs');
const metadata = {
  slangServerRepo: process.env.SLANG_SERVER_REPO,
  slangServerCommit: process.env.SLANG_SERVER_COMMIT,
  slangCommit: process.env.SLANG_COMMIT,
  wasiSdkVersion: process.env.WASI_SDK_VERSION,
  buildType: process.env.BUILD_TYPE,
  cmakeGenerator: process.env.CMAKE_GENERATOR,
  buildTimestamp: process.env.BUILD_TIMESTAMP,
  wasmSha256: process.env.WASM_SHA,
  wasmSizeBytes: Number(process.env.WASM_SIZE),
  tools: {
    cmake: process.env.CMAKE_VERSION,
    ninja: process.env.NINJA_VERSION,
    wasiClang: process.env.WASI_CLANG_VERSION
  },
  smokeTest: {
    status: process.env.SMOKE_STATUS,
    output: process.env.SMOKE_OUTPUT
  }
};
fs.writeFileSync(process.env.BUILD_METADATA_OUT, `${JSON.stringify(metadata, null, 2)}\n`);
EOF

echo "Built $wasm_dir/slang-server.wasm"
echo "SHA256: $wasm_sha"
echo "Size: $wasm_size bytes"
echo "Smoke test: $smoke_status"
