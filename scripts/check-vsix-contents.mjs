#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const requiredEntries = [
  'package.json',
  'dist/extension.js',
  'configs/verilog.configuration.json',
  'syntaxes/systemverilog.tmLanguage.json',
  'snippets/verilog.json',
  'media/fliplot/defaults.json',
  'THIRD_PARTY_NOTICES.md',
];

const forbiddenPrefixes = [
  'src/',
  'test/',
  'out/',
  'examples/',
  'resources/wasm/',
  'build/',
  '.cache/',
];

const forbiddenFragments = [
  'slangServer',
  'slang-server.wasm',
  'hdl-projects',
  'slang-wasm-indexing',
];

function fail(message) {
  console.error(`error: ${message}`);
  process.exitCode = 1;
}
function normalizeEntry(line) {
  return line
    .replace(/\\/g, '/')
    .replace(/^extension\//, '')
    .replace(/^[\s│├└─]+/, '')
    .trim();
}

function readListing() {
  if (process.env.VERILOGHDL_VSIX_LISTING_FILE) {
    return fs.readFileSync(process.env.VERILOGHDL_VSIX_LISTING_FILE, 'utf8');
  }

  const vsixPath = process.argv[2];
  if (vsixPath) {
    return execFileSync('unzip', ['-Z1', vsixPath], { encoding: 'utf8' });
  }

  return execFileSync('npx', ['--yes', '@vscode/vsce', 'ls'], { encoding: 'utf8' });
}

let listing;
try {
  listing = readListing();
} catch (error) {
  fail(`could not read VSIX contents: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(process.exitCode ?? 1);
}

const entries = new Set(
  listing
    .split(/\r?\n/)
    .map(normalizeEntry)
    .filter(Boolean)
);

for (const requiredEntry of requiredEntries) {
  if (!entries.has(requiredEntry)) {
    fail(`VSIX is missing ${requiredEntry}`);
  }
}

for (const entry of entries) {
  const forbiddenPrefix = forbiddenPrefixes.find((prefix) => entry.startsWith(prefix));
  if (forbiddenPrefix) {
    fail(`VSIX contains forbidden path ${entry}`);
  }
  const forbiddenFragment = forbiddenFragments.find((fragment) => entry.includes(fragment));
  if (forbiddenFragment) {
    fail(`VSIX contains forbidden artifact ${entry}`);
  }
}

if (!process.exitCode) {
  const source = process.env.VERILOGHDL_VSIX_LISTING_FILE
    ? path.basename(process.env.VERILOGHDL_VSIX_LISTING_FILE)
    : process.argv[2] ?? 'current package tree';
  console.log(`VSIX contents verified: ${source}`);
}
