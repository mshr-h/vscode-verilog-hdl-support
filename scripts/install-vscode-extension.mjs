#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [, , execPath, extensionsDir, extensionId] = process.argv;
if (!execPath || !extensionsDir || !extensionId) {
  console.error('usage: install-vscode-extension.mjs <vscode-exec-path> <extensions-dir> <extension-id>');
  process.exit(2);
}

const cliPath = resolveCodeCli(execPath);
fs.mkdirSync(extensionsDir, { recursive: true });

const result = spawnSync(cliPath, [
  '--extensions-dir',
  extensionsDir,
  '--install-extension',
  extensionId,
  '--force',
], {
  encoding: 'utf8',
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

function resolveCodeCli(inputPath) {
  const candidates = [
    path.resolve(path.dirname(inputPath), '../Resources/app/bin/code'),
    path.resolve(path.dirname(inputPath), '../Resources/app/bin/code-insiders'),
    path.resolve(path.dirname(inputPath), '../../Resources/app/bin/code'),
    path.resolve(path.dirname(inputPath), '../../Resources/app/bin/code-insiders'),
    inputPath,
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return inputPath;
}
