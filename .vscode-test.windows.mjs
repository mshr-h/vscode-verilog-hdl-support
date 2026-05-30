import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: [
		'out/src/test/verilator.test.js',
	],
});
