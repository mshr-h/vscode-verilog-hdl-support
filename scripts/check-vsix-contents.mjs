#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const requiredEntries = [
  'resources/wasm/slang-server.wasm',
  'resources/wasm/slang-server.meta.json',
  'resources/wasm/licenses/slang-server.LICENSE',
  'resources/wasm/licenses/slang.LICENSE',
  'resources/wasm/licenses/THIRD_PARTY_NOTICES.md'
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
  if (!entries.has(requiredEntry) && !entries.has(`extension/${requiredEntry}`)) {
    fail(`VSIX is missing ${requiredEntry}`);
  }
}

if (!process.exitCode) {
  const source = process.env.VERILOGHDL_VSIX_LISTING_FILE
    ? path.basename(process.env.VERILOGHDL_VSIX_LISTING_FILE)
    : process.argv[2] ?? 'current package tree';
  console.log(`VSIX contents verified: ${source}`);
}
