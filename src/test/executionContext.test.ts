// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { ExecutionContext } from '../tools/ExecutionContext';

suite('ExecutionContext', () => {
  test('prepares native Linux/macOS execution', async () => {
    const prepared = await new ExecutionContext({
      isWindows: false,
      useWSL: false,
      linterInstalledPath: '/tools/bin',
      windowsExecutable: 'tool.exe',
      unixExecutable: 'tool',
      runAtFileLocation: true,
    }).prepare({
      documentPath: '/workspace/rtl/top.sv',
      includePaths: ['/workspace/include'],
    });

    assert.strictEqual(prepared.command, '/tools/bin/tool');
    assert.deepStrictEqual(prepared.leadingArgs, []);
    assert.strictEqual(prepared.documentPath, '/workspace/rtl/top.sv');
    assert.strictEqual(prepared.documentFolder, '/workspace/rtl');
    assert.deepStrictEqual(prepared.includePaths, ['/workspace/include']);
    assert.strictEqual(prepared.cwd, '/workspace/rtl');
  });

  test('[windows] prepares native Windows execution with slash-normalized generated paths', async () => {
    const prepared = await new ExecutionContext({
      isWindows: true,
      useWSL: false,
      linterInstalledPath: 'C:\\tools',
      windowsExecutable: 'tool.exe',
      unixExecutable: 'tool',
      runAtFileLocation: true,
    }).prepare({
      documentPath: 'C:\\workspace\\rtl dir\\top file.sv',
      includePaths: ['C:\\workspace\\include dir'],
    });

    assert.strictEqual(prepared.command, 'C:\\tools\\tool.exe');
    assert.strictEqual(prepared.documentPath, 'C:/workspace/rtl dir/top file.sv');
    assert.strictEqual(prepared.documentFolder, 'C:/workspace/rtl dir');
    assert.deepStrictEqual(prepared.includePaths, ['C:\\workspace\\include dir']);
    assert.strictEqual(prepared.cwd, 'C:/workspace/rtl dir');
  });

  test('[windows] prepares WSL execution and converts generated/include paths once', async () => {
    const convertedInputs: string[] = [];
    const prepared = await new ExecutionContext({
      isWindows: true,
      useWSL: true,
      linterInstalledPath: '',
      windowsExecutable: 'tool.exe',
      unixExecutable: 'tool',
      runAtFileLocation: false,
      workspaceFolder: 'C:\\workspace',
      convertToWslPathFn: async (inputPath, options) => {
        assert.strictEqual(options?.wslCommand, 'wsl');
        convertedInputs.push(inputPath);
        return inputPath.replace(/^C:\\/, '/mnt/c/').replace(/\\/g, '/');
      },
    }).prepare({
      documentPath: 'C:\\workspace\\rtl\\top.sv',
      includePaths: ['C:\\workspace\\include', 'C:\\workspace\\include'],
    });

    assert.strictEqual(prepared.command, 'wsl');
    assert.deepStrictEqual(prepared.leadingArgs, ['tool']);
    assert.strictEqual(prepared.documentPath, '/mnt/c/workspace/rtl/top.sv');
    assert.strictEqual(prepared.documentFolder, '/mnt/c/workspace/rtl');
    assert.deepStrictEqual(prepared.includePaths, [
      '/mnt/c/workspace/include',
      '/mnt/c/workspace/include',
    ]);
    assert.strictEqual(prepared.cwd, 'C:\\workspace');
    assert.deepStrictEqual(convertedInputs, [
      'C:\\workspace\\rtl\\top.sv',
      'C:\\workspace\\rtl',
      'C:\\workspace\\include',
    ]);
  });

  test('[windows] preserves Slang WSL raw cwd mode', async () => {
    const prepared = await new ExecutionContext({
      isWindows: true,
      useWSL: true,
      linterInstalledPath: '',
      windowsExecutable: 'slang.exe',
      unixExecutable: 'slang',
      runAtFileLocation: true,
      cwdMode: 'hostRawForWsl',
      convertToWslPathFn: async (inputPath) =>
        inputPath.replace(/^C:\\/, '/mnt/c/').replace(/\\/g, '/'),
    }).prepare({
      documentPath: 'C:\\workspace\\rtl dir\\top file.sv',
      includePaths: [],
    });

    assert.strictEqual(prepared.command, 'wsl');
    assert.deepStrictEqual(prepared.leadingArgs, ['slang']);
    assert.strictEqual(prepared.cwd, 'C:\\workspace\\rtl dir');
  });

  test('builds Verilator and Slang command shapes', () => {
    const verilator = new ExecutionContext({
      isWindows: true,
      useWSL: false,
      linterInstalledPath: 'C:\\tools',
      windowsExecutable: 'verilator_bin.exe',
      unixExecutable: 'verilator',
      runAtFileLocation: false,
    }).buildCommand();
    const slangWsl = new ExecutionContext({
      isWindows: true,
      useWSL: true,
      linterInstalledPath: 'C:\\tools',
      windowsExecutable: 'slang.exe',
      unixExecutable: 'slang',
      runAtFileLocation: false,
    }).buildCommand();

    assert.strictEqual(verilator.command, 'C:\\tools\\verilator_bin.exe');
    assert.deepStrictEqual(verilator.leadingArgs, []);
    assert.strictEqual(slangWsl.command, 'C:\\tools\\wsl');
    assert.deepStrictEqual(slangWsl.leadingArgs, ['slang']);
  });
});
