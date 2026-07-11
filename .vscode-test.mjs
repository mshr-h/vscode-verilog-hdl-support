import { defineConfig } from '@vscode/test-cli';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const systemTempRoot = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const testTempRoot = fs.mkdtempSync(path.join(systemTempRoot, 'vh-test-'));

process.once('exit', () => {
	fs.rmSync(testTempRoot, { recursive: true, force: true });
});

export default defineConfig([
	{
		label: 'core',
		files: [
			'out/src/test/unit/*.test.js',
			'out/src/test/extension/*.test.js',
		],
		launchArgs: [
			`--user-data-dir=${path.join(testTempRoot, 'core-user-data')}`,
		],
	},
	{
		label: 'native-tools',
		files: 'out/src/test/integration/native-tools/*.test.js',
		launchArgs: [
			`--user-data-dir=${path.join(testTempRoot, 'native-tools-user-data')}`,
		],
	},
]);
