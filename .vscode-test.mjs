import { defineConfig } from '@vscode/test-cli';
import * as os from 'node:os';
import * as path from 'node:path';

const testTempRoot = path.join(
	process.platform === 'win32' ? os.tmpdir() : '/tmp',
	`veriloghdl-vscode-test-${process.pid}`,
);

export default defineConfig({
	files: [
		'out/src/test/doctor.test.js',
		'out/src/test/format.test.js',
		'out/src/test/iverilog.test.js',
		'out/src/test/lintManager.test.js',
		'out/src/test/linterDiagnosticManager.test.js',
		'out/src/test/lintRunManager.test.js',
		'out/src/test/logtape.test.js',
		'out/src/test/modelsim.test.js',
		'out/src/test/slangServerRuntime.test.js',
		'out/src/test/tclsp.test.js',
		'out/src/test/toolRunner.test.js',
		'out/src/test/verible-verilog-lint.test.js',
		'out/src/test/verilator.test.js',
		'out/src/test/workspace.test.js',
		'out/src/test/wslPathConverter.test.js',
		'out/src/test/xvlog.test.js',
	],
	launchArgs: [
		`--user-data-dir=${path.join(testTempRoot, 'user-data')}`,
		`--extensions-dir=${path.join(testTempRoot, 'extensions')}`,
	],
});
