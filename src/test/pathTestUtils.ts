// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'mshr-h.veriloghdl';

export function getRepositoryRoot(): string {
  return vscode.extensions.getExtension(EXTENSION_ID)?.extensionPath
    ?? path.resolve(__dirname, '..', '..', '..');
}

export function normalizeFsPath(inputPath: string): string {
  const normalized = path.normalize(inputPath).replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function sameFsPath(actual: string | undefined, expected: string): boolean {
  return actual !== undefined && normalizeFsPath(actual) === normalizeFsPath(expected);
}

export function assertSameFsPath(actual: string | undefined, expected: string): void {
  assert.ok(
    sameFsPath(actual, expected),
    `Expected filesystem path ${actual ?? '(undefined)'} to equal ${expected}`
  );
}

export function endsWithPathSegments(inputPath: string | undefined, ...segments: string[]): boolean {
  if (inputPath === undefined) {
    return false;
  }
  return normalizeFsPath(inputPath).endsWith(normalizeFsPath(path.join(...segments)));
}

export function displayPath(inputPath: string): string {
  return inputPath.replace(/\\/g, '/');
}
