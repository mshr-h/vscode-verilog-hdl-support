#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.env.VERILOGHDL_REPO_ROOT
  ? path.resolve(process.env.VERILOGHDL_REPO_ROOT)
  : path.resolve(new URL('..', import.meta.url).pathname);
const lockPath = process.env.VERILOGHDL_SLANG_LOCK_FILE
  ? path.resolve(process.env.VERILOGHDL_SLANG_LOCK_FILE)
  : path.join(repoRoot, 'build', 'slang-server.lock.json');
const wasmDir = process.env.VERILOGHDL_WASM_DIR
  ? path.resolve(process.env.VERILOGHDL_WASM_DIR)
  : path.join(repoRoot, 'resources', 'wasm');

const requiredFiles = [
  'slang-server.wasm',
  'slang-server.meta.json',
  path.join('licenses', 'slang-server.LICENSE'),
  path.join('licenses', 'slang.LICENSE'),
  path.join('licenses', 'THIRD_PARTY_NOTICES.md')
];

function fail(message) {
  console.error(`error: ${message}`);
  process.exitCode = 1;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} is not readable JSON: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

const lock = readJson(lockPath, 'lock file');
if (!lock) {
  process.exit(process.exitCode ?? 1);
}

for (const relativePath of requiredFiles) {
  const filePath = path.join(wasmDir, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`missing required WASM bundle file: ${path.relative(repoRoot, filePath)}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

const wasmPath = path.join(wasmDir, 'slang-server.wasm');
const metadataPath = path.join(wasmDir, 'slang-server.meta.json');
const metadata = readJson(metadataPath, 'WASM metadata');
if (!metadata) {
  process.exit(process.exitCode ?? 1);
}

const actualSize = fs.statSync(wasmPath).size;
const actualSha = sha256(wasmPath);
const sizeLimit = Number(lock.wasmSizeLimitBytes ?? Number(lock.wasmSizeLimitMb) * 1024 * 1024);

const expectedFields = [
  ['slangServerCommit', lock.slangServerCommit],
  ['slangCommit', lock.slangCommit],
  ['wasiSdkVersion', lock.wasiSdkVersion],
  ['buildType', lock.buildType]
];

for (const [field, expected] of expectedFields) {
  if (metadata[field] !== expected) {
    fail(`metadata ${field} mismatch: expected ${expected}, got ${metadata[field] ?? '<missing>'}`);
  }
}

if (metadata.wasmSha256 && metadata.wasmSha256 !== actualSha) {
  fail(`metadata wasmSha256 mismatch: expected ${actualSha}, got ${metadata.wasmSha256}`);
}

if (metadata.wasmSizeBytes !== undefined && Number(metadata.wasmSizeBytes) !== actualSize) {
  fail(`metadata wasmSizeBytes mismatch: expected ${actualSize}, got ${metadata.wasmSizeBytes}`);
}

if (Number.isFinite(sizeLimit) && actualSize > sizeLimit) {
  fail(`WASM bundle exceeds size limit: ${actualSize} bytes > ${sizeLimit} bytes`);
}

if (!process.exitCode) {
  console.log(`WASM bundle verified: ${path.relative(repoRoot, wasmPath)} (${actualSize} bytes, sha256 ${actualSha})`);
}
