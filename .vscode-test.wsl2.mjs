import { defineConfig } from '@vscode/test-cli';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const systemTempRoot = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const testTempRoot = fs.mkdtempSync(path.join(systemTempRoot, 'vh-wsl2-test-'));

process.once('exit', () => {
	fs.rmSync(testTempRoot, { recursive: true, force: true });
});

export default defineConfig({
	files: 'out/src/test/integration/wsl2/*.test.js',
	env: {
		VERILOGHDL_RUN_WSL2_TESTS: '1',
	},
	launchArgs: [
		`--user-data-dir=${path.join(testTempRoot, 'user-data')}`,
	],
});
