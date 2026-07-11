// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  buildVerilatorArgs,
  buildVerilatorCommand,
  buildVerilatorRunInputs,
  convertDiagnosticPathsFromWsl,
  getVerilatorPaths,
  parseVerilatorDiagnostics,
} from '../../linter/VerilatorLinter';

suite('Verilator Linter', () => {
  test('builds non-Windows command and args without shell quoting', () => {
    const documentPath = '/tmp/verilator source/top file.sv';
    const docFolder = '/tmp/verilator source';
    const includePath = '/tmp/verilator include';
    const projectIncludePath = '/tmp/verilator project include';
    const commandInfo = buildVerilatorCommand({
      isWindows: false,
      useWSL: false,
      linterInstalledPath: '/tools/bin',
    });
    const args = commandInfo.leadingArgs.concat(
      buildVerilatorArgs({
        languageId: 'systemverilog',
        docFolder,
        includePaths: [includePath, projectIncludePath],
        defineArgs: ['SIM', 'WIDTH=32'],
        customArguments: '--timing --top-module "top mod"',
        documentPath,
      })
    );

    assert.strictEqual(commandInfo.command, '/tools/bin/verilator');
    assert.deepStrictEqual(args, [
      '-sv',
      '--lint-only',
      `-I${docFolder}`,
      `-I${includePath}`,
      `-I${projectIncludePath}`,
      '-DSIM',
      '-DWIDTH=32',
      '--timing',
      '--top-module',
      'top mod',
      documentPath,
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('builds Verilog args without SystemVerilog flag', () => {
    const args = buildVerilatorArgs({
      languageId: 'verilog',
      docFolder: '/tmp/rtl',
      includePaths: [],
      customArguments: '',
      documentPath: '/tmp/rtl/top.v',
    });

    assert.deepStrictEqual(args, ['--lint-only', '-I/tmp/rtl', '/tmp/rtl/top.v']);
  });

  test('[windows] builds Windows command and slash-normalized generated paths without WSL', () => {
    const commandInfo = buildVerilatorCommand({
      isWindows: true,
      useWSL: false,
      linterInstalledPath: 'C:\\tools',
    });
    const paths = getVerilatorPaths({
      documentPath: 'C:\\workspace\\rtl dir\\top file.sv',
      isWindows: true,
      useWSL: false,
      runAtFileLocation: true,
    });
    const args = commandInfo.leadingArgs.concat(
      buildVerilatorArgs({
        languageId: 'systemverilog',
        docFolder: paths.docFolder,
        includePaths: ['C:\\workspace\\include dir'],
        customArguments: '',
        documentPath: paths.docUri,
      })
    );

    assert.strictEqual(commandInfo.command, 'C:\\tools\\verilator_bin.exe');
    assert.strictEqual(paths.docUri, 'C:/workspace/rtl dir/top file.sv');
    assert.strictEqual(paths.docFolder, 'C:/workspace/rtl dir');
    assert.strictEqual(paths.cwd, 'C:/workspace/rtl dir');
    assert.deepStrictEqual(args, [
      '-sv',
      '--lint-only',
      '-IC:/workspace/rtl dir',
      '-IC:\\workspace\\include dir',
      'C:/workspace/rtl dir/top file.sv',
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('[windows] builds Windows WSL command with converted run input paths', async () => {
    const convertedInputs: string[] = [];
    const inputs = await buildVerilatorRunInputs({
      documentPath: 'C:\\workspace\\rtl\\top.sv',
      languageId: 'systemverilog',
      isWindows: true,
      useWSL: true,
      runAtFileLocation: true,
      linterInstalledPath: '',
      includePaths: ['C:\\workspace\\include dir'],
      customArguments: '--trace',
      sourcePaths: ['C:\\workspace\\rtl\\top.sv', 'C:\\workspace\\rtl\\child.sv'],
      convertToWslPathFn: async (inputPath, options) => {
        assert.strictEqual(options?.wslCommand, 'wsl');
        convertedInputs.push(inputPath);
        return inputPath.replace(/^C:\\/, '/mnt/c/').replace(/\\/g, '/');
      },
    });

    assert.strictEqual(inputs.command, 'wsl');
    assert.strictEqual(inputs.args[0], 'verilator');
    assert.strictEqual(inputs.cwd, 'C:/workspace/rtl');
    assert.deepStrictEqual(convertedInputs, [
      'C:\\workspace\\rtl\\top.sv',
      'C:\\workspace\\rtl',
      'C:\\workspace\\include dir',
      'C:\\workspace\\rtl\\top.sv',
      'C:\\workspace\\rtl\\child.sv',
    ]);
    assert.deepStrictEqual(inputs.args, [
      'verilator',
      '-sv',
      '--lint-only',
      '-I/mnt/c/workspace/rtl',
      '-I/mnt/c/workspace/include dir',
      '--trace',
      '/mnt/c/workspace/rtl/top.sv',
      '/mnt/c/workspace/rtl/child.sv',
    ]);
    assert.ok(
      !inputs.args.some((arg) => arg.includes('C:\\workspace')),
      'WSL args must not contain raw Windows include paths'
    );
  });

  test('parses Verilator diagnostics for errors, warnings, paths, and colons', () => {
    const sourcePath = '/tmp/verilator space-test/top file.sv';
    const stderr = [
      `%Error-NEEDTIMINGOPT: ${sourcePath}:3:12: Use --timing or --no-timing to specify how delays should be handled: more detail`,
      '%Warning-WIDTH: /tmp/rtl/warn.v:7:5: Operator expects 8 bits on the LHS, but RHS generates 1 bit',
      '%Warning-WIDTHTRUNC: /tmp/rtl/warn.v:8:7: Operator ASSIGNW expects 1 bits on the Assign RHS, but Assign RHS generates 2 bits',
      "%Warning-WIDTHEXPAND: /tmp/rtl/warn.v:9:9: Operator EQ expects 2 bits on the LHS, but LHS generates 1 bits",
      '                : ... note line',
    ].join('\n');
    const diagnostics = parseVerilatorDiagnostics({
      stderr,
      isWindows: false,
      useWSL: false,
    });

    const sourceDiagnostics = diagnostics.get(sourcePath) ?? [];
    const warningDiagnostics = diagnostics.get('/tmp/rtl/warn.v') ?? [];

    assert.strictEqual(sourceDiagnostics.length, 1);
    assert.strictEqual(sourceDiagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(sourceDiagnostics[0].code, 'NEEDTIMINGOPT');
    assert.strictEqual(sourceDiagnostics[0].range.start.line, 2);
    assert.strictEqual(sourceDiagnostics[0].range.start.character, 11);
    assert.strictEqual(
      sourceDiagnostics[0].message,
      'Use --timing or --no-timing to specify how delays should be handled: more detail'
    );
    assert.strictEqual(sourceDiagnostics[0].source, 'verilator');

    assert.strictEqual(warningDiagnostics.length, 3);
    assert.strictEqual(warningDiagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(warningDiagnostics[0].code, 'WIDTH');
    assert.strictEqual(warningDiagnostics[1].code, 'WIDTH');
    assert.strictEqual(warningDiagnostics[2].code, 'WIDTH');
  });

  test('[windows] converts WSL diagnostic paths back to Windows paths', async () => {
    const diagnostics = parseVerilatorDiagnostics({
      stderr: '%Error: /mnt/c/workspace/rtl/top.sv:4:2: syntax error, unexpected endmodule',
      isWindows: true,
      useWSL: true,
    });
    const convertedDiagnostics = await convertDiagnosticPathsFromWsl(diagnostics, {
      convertFromWslPathFn: async (inputPath) =>
        inputPath.replace(/^\/mnt\/c\//, 'C:/').replace(/\//g, '\\'),
    });

    const windowsPath = 'C:\\workspace\\rtl\\top.sv';
    const sourceDiagnostics = convertedDiagnostics.get(windowsPath) ?? [];
    assert.strictEqual(sourceDiagnostics.length, 1);
    assert.strictEqual(sourceDiagnostics[0].source, 'verilator');
    assert.strictEqual(sourceDiagnostics[0].range.start.line, 3);
    assert.strictEqual(sourceDiagnostics[0].range.start.character, 1);
  });

  test('[windows] converts each unique WSL diagnostic path once and merges converted paths', async () => {
    const firstDiagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'first',
      vscode.DiagnosticSeverity.Error
    );
    const secondDiagnostic = new vscode.Diagnostic(
      new vscode.Range(1, 0, 1, 1),
      'second',
      vscode.DiagnosticSeverity.Warning
    );
    const thirdDiagnostic = new vscode.Diagnostic(
      new vscode.Range(2, 0, 2, 1),
      'third',
      vscode.DiagnosticSeverity.Error
    );
    const diagnostics = new Map<string, vscode.Diagnostic[]>([
      ['/mnt/c/workspace/rtl/top.sv', [firstDiagnostic, secondDiagnostic]],
      ['/home/user/link/top.sv', [thirdDiagnostic]],
    ]);
    const convertedCalls: string[] = [];

    const convertedDiagnostics = await convertDiagnosticPathsFromWsl(diagnostics, {
      convertFromWslPathFn: async (inputPath) => {
        convertedCalls.push(inputPath);
        return 'C:\\workspace\\rtl\\top.sv';
      },
    });

    assert.deepStrictEqual(convertedCalls, ['/mnt/c/workspace/rtl/top.sv', '/home/user/link/top.sv']);
    assert.deepStrictEqual(convertedDiagnostics.get('C:\\workspace\\rtl\\top.sv'), [
      firstDiagnostic,
      secondDiagnostic,
      thirdDiagnostic,
    ]);
  });

  test('compiled BaseLinter does not import child_process or call exec', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'linter', 'BaseLinter.js'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'BaseLinter must not import child_process');
    assert.ok(!source.includes('execSync'), 'BaseLinter must not call execSync');
    assert.ok(!source.includes('child.exec'), 'BaseLinter must not call child_process.exec');
  });

  test('does not import child_process or call exec in VerilatorLinter', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'linter', 'VerilatorLinter.js'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'VerilatorLinter must not import child_process');
    assert.ok(!source.includes('child.exec'), 'VerilatorLinter must not call child_process.exec');
  });

});
