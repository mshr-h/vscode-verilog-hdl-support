#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'dist/extension.js',
  'dist/slangServerWasiHost.js',
  'resources/slang-server/slang-server.wasm',
  'resources/slang-server/slang-server.meta.json',
  'resources/slang-server/config.schema.json',
  'resources/slang-server/licenses/slang-server.LICENSE',
  'resources/slang-server/licenses/slang.LICENSE',
  'resources/slang-server/licenses/reflect-cpp.LICENSE',
  'resources/slang-server/licenses/ctre.LICENSE',
  'resources/slang-server/licenses/fmt.LICENSE',
  'resources/slang-server/licenses/tomlplusplus.LICENSE',
  'resources/slang-server/licenses/third-party-notices.txt',
];

const vscodeignore = fs.existsSync(path.join(root, '.vscodeignore'))
  ? fs.readFileSync(path.join(root, '.vscodeignore'), 'utf8')
  : '';
const ignorePatterns = vscodeignore
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
const errors = [];

for (const file of requiredFiles) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing VSIX resource: ${file}`);
  } else if (fs.statSync(abs).size === 0) {
    errors.push(`Empty VSIX resource: ${file}`);
  }
}

for (const pattern of ignorePatterns) {
  if (pattern === 'resources/**' || pattern === 'resources/slang-server/**') {
    errors.push(`.vscodeignore excludes bundled slang-server resources with pattern: ${pattern}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

console.log('VSIX resource validation passed.');
