import { defineConfig } from '@vscode/test-cli';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const tempRoot = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const workspaceRoot = fs.mkdtempSync(path.join(tempRoot, 'vh-slang-index-'));
const userDataRoot = fs.mkdtempSync(path.join(tempRoot, 'vh-slang-user-'));
const repoRoot = path.dirname(fileURLToPath(import.meta.url));
fs.cpSync(
  path.join(repoRoot, 'src', 'test', 'fixtures', 'slang-wasm-indexing'),
  workspaceRoot,
  { recursive: true }
);

export default defineConfig({
  files: 'out/src/test/integration/slangWasmIndexing.test.js',
  installExtensions: ['ms-vscode.wasm-wasi-core'],
  launchArgs: [
    workspaceRoot,
    `--user-data-dir=${userDataRoot}`,
  ],
});
