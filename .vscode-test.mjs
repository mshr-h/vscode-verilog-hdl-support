import { defineConfig } from '@vscode/test-cli';
import * as os from 'node:os';
import * as path from 'node:path';

const testTempRoot = path.join(
	process.platform === 'win32' ? os.tmpdir() : '/tmp',
	`veriloghdl-vscode-test-${process.pid}`,
);

export default defineConfig({
	files: 'out/src/test/*.test.js',
	installExtensions: ['ms-vscode.wasm-wasi-core'],
	launchArgs: [
		`--user-data-dir=${path.join(testTempRoot, 'user-data')}`,
	],
});
