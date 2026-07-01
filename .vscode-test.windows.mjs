import { defineConfig } from '@vscode/test-cli';
import * as os from 'node:os';
import * as path from 'node:path';

const testTempRoot = path.join(os.tmpdir(), `veriloghdl-vscode-test-${process.pid}`);

export default defineConfig({
	files: [
		'out/src/test/wslPathConverter.test.js',
		'out/src/test/verilator.test.js',
		'out/src/test/slang.test.js',
	],
	installExtensions: ['ms-vscode.wasm-wasi-core'],
	launchArgs: [
		`--user-data-dir=${path.join(testTempRoot, 'user-data')}`,
	],
});
