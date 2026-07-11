import { defineConfig } from '@vscode/test-cli';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const systemTempRoot = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const tempRoot = fs.mkdtempSync(path.join(systemTempRoot, 'vh-slang-index-'));
const workspaceRoot = path.join(tempRoot, 'workspace');
const userDataRoot = path.join(tempRoot, 'user-data');
const repoRoot = path.dirname(fileURLToPath(import.meta.url));
fs.cpSync(
  path.join(repoRoot, 'src', 'test', 'fixtures', 'slang-wasm-indexing'),
  workspaceRoot,
  { recursive: true }
);

process.once('exit', () => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

export default defineConfig({
  files: 'out/src/test/integration/wasm/slangWasmIndexing.test.js',
  installExtensions: ['ms-vscode.wasm-wasi-core'],
  launchArgs: [
    workspaceRoot,
    `--user-data-dir=${userDataRoot}`,
  ],
});
