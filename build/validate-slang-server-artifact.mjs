#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requireWasm = process.argv.includes('--require-wasm');
const resourceDir = path.join(root, 'resources', 'slang-server');
const wasmPath = path.join(resourceDir, 'slang-server.wasm');
const metadataPath = path.join(resourceDir, 'slang-server.meta.json');
const lockPath = path.join(root, 'build', 'slang-server.lock.json');
const schemaPath = path.join(resourceDir, 'config.schema.json');
const licenseDir = path.join(resourceDir, 'licenses');

const errors = [];
const warnings = [];

validateFile(metadataPath, 'metadata');
validateFile(lockPath, 'lock file');
validateFile(schemaPath, 'config schema');
validateFile(wasmPath, 'wasm artifact');
validateFile(path.join(licenseDir, 'slang.LICENSE'), 'slang license');
validateFile(path.join(licenseDir, 'slang-server.LICENSE'), 'slang-server license');
validateFile(path.join(licenseDir, 'reflect-cpp.LICENSE'), 'reflect-cpp license');
validateFile(path.join(licenseDir, 'ctre.LICENSE'), 'ctre license');
validateFile(path.join(licenseDir, 'fmt.LICENSE'), 'fmt license');
validateFile(path.join(licenseDir, 'tomlplusplus.LICENSE'), 'tomlplusplus license');
validateFile(path.join(licenseDir, 'third-party-notices.txt'), 'third-party notices');
validateFile(path.join(root, 'build', 'build-slang-server-wasm.mjs'), 'WASM build script');
validateFile(path.join(root, 'build', 'slang-server-patches', 'wasm32-wasi-single-thread.patch'), 'WASM build patch');

const metadata = readJson(metadataPath, 'metadata');
const lock = readJson(lockPath, 'lock file');

if (metadata) {
  requireString(metadata.slangServerVersion, 'slangServerVersion', 'metadata');
  requireString(metadata.slangServerCommit, 'slangServerCommit', 'metadata');
  requireString(metadata.slangCommit, 'slangCommit', 'metadata');
  requireEqual(metadata.target, 'wasm32-wasi', 'metadata.target');
  requireBoolean(metadata.features?.threads, 'metadata.features.threads');
  requireBoolean(metadata.features?.externalBuildCommands, 'metadata.features.externalBuildCommands');
  requireBoolean(metadata.features?.wcp, 'metadata.features.wcp');
}

if (lock) {
  requireString(lock.slangServer?.repo, 'slangServer.repo', 'lock file');
  requireString(lock.slangServer?.commit, 'slangServer.commit', 'lock file');
  requireString(lock.submodules?.slang?.commit, 'submodules.slang.commit', 'lock file');
  requireString(lock.toolchain?.wasiSdkVersion, 'toolchain.wasiSdkVersion', 'lock file');
  requireString(lock.toolchain?.wasiSdkSha256, 'toolchain.wasiSdkSha256', 'lock file');
  requireEqual(lock.target, 'wasm32-wasi', 'lock.target');
  if (lock.artifact?.sha256 && fs.existsSync(wasmPath)) {
    requireEqual(sha256(wasmPath), lock.artifact.sha256, 'artifact.sha256');
  }
  for (const patch of lock.patches ?? []) {
    const patchPath = path.join(root, patch.path);
    validateFile(patchPath, `patch ${patch.path}`);
    if (patch.sha256 && fs.existsSync(patchPath)) {
      requireEqual(sha256(patchPath), patch.sha256, `patch ${patch.path} sha256`);
    }
  }
}

if (metadata && lock) {
  requireEqual(metadata.slangServerCommit, lock.slangServer?.commit, 'metadata.slangServerCommit');
  requireEqual(metadata.slangCommit, lock.submodules?.slang?.commit, 'metadata.slangCommit');
}

if (fs.existsSync(wasmPath)) {
  if (isWasmBinary(wasmPath)) {
    console.log(`OK: ${relative(wasmPath)} is a WebAssembly binary.`);
  } else {
    const message = `${relative(wasmPath)} is not a WebAssembly binary.`;
    if (requireWasm) {
      errors.push(message);
    } else {
      warnings.push(`${message} Replace the placeholder before production packaging.`);
    }
  }
}

for (const filePath of [
  path.join(licenseDir, 'slang.LICENSE'),
  path.join(licenseDir, 'slang-server.LICENSE'),
  path.join(licenseDir, 'third-party-notices.txt'),
]) {
  if (fs.existsSync(filePath) && /\bplaceholder\b|Before publishing|TBD/i.test(fs.readFileSync(filePath, 'utf8'))) {
    errors.push(`${relative(filePath)} still contains placeholder text.`);
  }
}

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}
if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}
console.log('slang-server artifact metadata validation passed.');

function validateFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${label}: ${relative(filePath)}`);
    return;
  }
  if (fs.statSync(filePath).size === 0) {
    errors.push(`Empty ${label}: ${relative(filePath)}`);
  }
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid ${label} JSON: ${relative(filePath)} (${error.message})`);
    return undefined;
  }
}

function requireString(value, field, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`Missing ${field} in ${label}.`);
  }
}

function requireBoolean(value, field) {
  if (typeof value !== 'boolean') {
    errors.push(`Missing boolean ${field}.`);
  }
}

function requireEqual(actual, expected, field) {
  if (actual !== expected) {
    errors.push(`${field} must be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function isWasmBinary(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const magic = Buffer.alloc(4);
    fs.readSync(fd, magic, 0, magic.length, 0);
    return magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6d;
  } finally {
    fs.closeSync(fd);
  }
}

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}
