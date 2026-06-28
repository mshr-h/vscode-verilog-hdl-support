#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const lock = readJson(path.join(root, 'build', 'slang-server.lock.json'));
const args = parseArgs(process.argv.slice(2));
const sourceDir = path.resolve(args.source ?? process.env.SLANG_SERVER_SOURCE_DIR ?? path.join(root, '.build', 'slang-server-src'));
const buildDir = path.resolve(args.buildDir ?? process.env.SLANG_SERVER_BUILD_DIR ?? path.join(root, '.build', 'slang-server-wasi'));
const wasiSdkInput = args.wasiSdk ?? process.env.WASI_SDK_ROOT;
const wasiSdkRoot = wasiSdkInput ? path.resolve(wasiSdkInput) : '';
const patchPath = path.join(root, 'build', 'slang-server-patches', 'wasm32-wasi-single-thread.patch');
const outputPath = path.join(root, 'resources', 'slang-server', 'slang-server.wasm');

if (!wasiSdkRoot || !fs.existsSync(wasiSdkRoot)) {
  fail('Set WASI_SDK_ROOT or pass --wasi-sdk /path/to/wasi-sdk-27.0.');
}

ensureSourceCheckout();
applyPatchIfNeeded();
configureAndBuild();
stripArtifact();

console.log(`Wrote ${path.relative(root, outputPath)}.`);

function ensureSourceCheckout() {
  if (!fs.existsSync(sourceDir)) {
    fs.mkdirSync(path.dirname(sourceDir), { recursive: true });
    run('git', ['clone', '--recursive', lock.slangServer.repo, sourceDir], root);
  }

  if (!commitExists(sourceDir, lock.slangServer.commit)) {
    run('git', ['fetch', '--tags', '--force', 'origin', lock.slangServer.commit], sourceDir);
  }
  run('git', ['checkout', lock.slangServer.commit], sourceDir);
  run('git', ['submodule', 'update', '--init', '--recursive'], sourceDir);

  const slangCommit = runCapture('git', ['-C', path.join(sourceDir, 'external', 'slang'), 'rev-parse', 'HEAD']);
  if (slangCommit !== lock.submodules.slang.commit) {
    fail(`slang submodule mismatch: expected ${lock.submodules.slang.commit}, got ${slangCommit}.`);
  }
}

function applyPatchIfNeeded() {
  if (canApply(['apply', '--check', patchPath])) {
    run('git', ['apply', patchPath], sourceDir);
    return;
  }
  if (canApply(['apply', '--reverse', '--check', patchPath])) {
    console.log('WASI patch already applied.');
    return;
  }
  fail(`Cannot apply ${path.relative(root, patchPath)} to ${sourceDir}.`);
}

function configureAndBuild() {
  const toolchainFile = path.join(wasiSdkRoot, 'share', 'cmake', 'wasi-sdk.cmake');
  if (!fs.existsSync(toolchainFile)) {
    fail(`Missing WASI CMake toolchain: ${toolchainFile}`);
  }

  fs.mkdirSync(buildDir, { recursive: true });
  run('cmake', [
    '-S', sourceDir,
    '-B', buildDir,
    '-G', 'Ninja',
    `-DCMAKE_TOOLCHAIN_FILE=${toolchainFile}`,
    '-DCMAKE_BUILD_TYPE=Release',
    '-DSLANG_SERVER_INCLUDE_TESTS=OFF',
    '-DSLANG_SERVER_INCLUDE_INSTALL=OFF',
    '-DSLANG_USE_THREADS=OFF',
    '-DCMAKE_DISABLE_PRECOMPILE_HEADERS=ON',
    '-DCMAKE_CXX_SCAN_FOR_MODULES=OFF',
  ], root);
  run('cmake', ['--build', buildDir, '--target', 'slang_server', '-j', String(args.jobs ?? '8')], root);
}

function stripArtifact() {
  const built = path.join(buildDir, 'bin', 'slang-server');
  if (!fs.existsSync(built)) {
    fail(`Build did not produce ${built}.`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const strip = path.join(wasiSdkRoot, 'bin', 'llvm-strip');
  if (fs.existsSync(strip)) {
    run(strip, ['-o', outputPath, built], root);
  } else {
    fs.copyFileSync(built, outputPath);
  }
}

function canApply(gitArgs) {
  try {
    execFileSync('git', gitArgs, { cwd: sourceDir, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function commitExists(repoDir, commit) {
  try {
    execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: repoDir, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function run(command, commandArgs, cwd) {
  execFileSync(command, commandArgs, { cwd, stdio: 'inherit' });
}

function runCapture(command, commandArgs) {
  return execFileSync(command, commandArgs, { encoding: 'utf8' }).trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source') {
      result.source = argv[++i];
    } else if (arg === '--build-dir') {
      result.buildDir = argv[++i];
    } else if (arg === '--wasi-sdk') {
      result.wasiSdk = argv[++i];
    } else if (arg === '--jobs') {
      result.jobs = argv[++i];
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }
  return result;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
