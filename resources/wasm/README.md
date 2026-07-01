# Bundled slang-server WASM

The bundled runtime loads these files:

- `resources/wasm/slang-server.wasm`
- `resources/wasm/slang-server.meta.json`
- `resources/wasm/licenses/*`

`slang-server.wasm` and `slang-server.meta.json` are generated artifacts and
are intentionally ignored by Git. Build them locally or in CI before packaging a
release VSIX. License notices, this README, the lock file, and the build scripts
are tracked.

Build or refresh the artifact with:

```sh
npm run build:slang-wasm
npm run verify:wasm-bundle
```

The build script reads `build/slang-server.lock.json`, checks out the locked
`hudson-trading/slang-server` commit, verifies the locked `external/slang`
submodule commit, installs or validates WASI SDK 25.0, builds with CMake/Ninja,
copies the WASM artifact here, and writes metadata containing commit IDs, tool
versions, SHA256, size, and smoke-test status.

Set `WASI_SDK_PATH` to use an existing WASI SDK installation. Its detected
version must match the lock file.

Development and tests handle a missing WASM artifact gracefully. Release
packaging runs `npm run verify:wasm-bundle` and fails when the artifact,
metadata, or license notices are missing.
