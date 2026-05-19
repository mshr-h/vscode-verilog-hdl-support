import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: [
		'out/src/test/wslPathConverter.test.js',
		'out/src/test/verilator.test.js',
		'out/src/test/slang.test.js',
	],
});
