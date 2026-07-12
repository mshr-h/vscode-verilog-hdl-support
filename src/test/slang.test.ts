// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  buildSlangArgs,
  buildSlangCommand,
  getSlangPaths,
  parseSlangDiagnostics,
} from '../linter/SlangLinter';

suite('Slang Linter', () => {
  test('builds command and args without WSL shell strings', () => {
    const documentPath = '/tmp/slang source/top file.sv';
    const docFolder = '/tmp/slang source';
    const includePath = '/tmp/slang include';
    const commandInfo = buildSlangCommand({
      isWindows: false,
      useWSL: false,
      linterInstalledPath: '/tools/bin',
    });
    const args = commandInfo.leadingArgs.concat(
      buildSlangArgs({
        docFolder,
        includePaths: [includePath],
        customArguments: '--single-unit --top "top mod"',
        documentPath,
      })
    );

    assert.strictEqual(commandInfo.command, '/tools/bin/slang');
    assert.deepStrictEqual(args, [
      '-I',
      docFolder,
      '-I',
      includePath,
      '--single-unit',
      '--top',
      'top mod',
      documentPath,
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('[windows] builds Windows WSL command with converted generated paths', () => {
    const commandInfo = buildSlangCommand({
      isWindows: true,
      useWSL: true,
      linterInstalledPath: '',
    });
    const paths = getSlangPaths({
      documentPath: 'C:\\workspace\\rtl dir\\top file.sv',
      isWindows: true,
      useWSL: true,
      runAtFileLocation: true,
      convertToWslPath: (inputPath) =>
        inputPath.replace(/^C:\\/, '/mnt/c/').replace(/\\/g, '/'),
    });
    const args = commandInfo.leadingArgs.concat(
      buildSlangArgs({
        docFolder: paths.docFolder,
        includePaths: [],
        customArguments: '--lint-only',
        documentPath: paths.docUri,
      })
    );

    assert.strictEqual(commandInfo.command, 'wsl');
    assert.strictEqual(args[0], 'slang');
    assert.strictEqual(paths.docUri, '/mnt/c/workspace/rtl dir/top file.sv');
    assert.strictEqual(paths.docFolder, '/mnt/c/workspace/rtl dir');
    assert.strictEqual(paths.cwd, 'C:\\workspace\\rtl dir');
    assert.deepStrictEqual(args, [
      'slang',
      '-I',
      '/mnt/c/workspace/rtl dir',
      '--lint-only',
      '/mnt/c/workspace/rtl dir/top file.sv',
    ]);
  });

  test('parses diagnostics with warnings, errors, brackets, and colons', () => {
    const documentPath = '/tmp/slang source/top file.sv';
    const stderr = [
      `${documentPath}:3:12: error: expected module item: got 'endmodule'`,
      `${documentPath}:4:2: warning: unused signal [foo:bar] [-Wunused]`,
      '/tmp/other.sv:1:1: error: ignored',
    ].join('\n');
    const diagnostics = parseSlangDiagnostics({
      stderr,
      documentPath,
      isWindows: false,
      useWSL: false,
    });

    assert.strictEqual(diagnostics.length, 2);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(diagnostics[0].range.start.line, 2);
    assert.strictEqual(diagnostics[0].range.start.character, 11);
    assert.strictEqual(diagnostics[0].message, "expected module item: got 'endmodule'");
    assert.strictEqual(diagnostics[0].source, 'slang');
    assert.strictEqual(diagnostics[1].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(diagnostics[1].code, 'unused');
  });

  test('does not import child_process or call child exec', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'src', 'linter', 'SlangLinter.ts'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'SlangLinter must not import child_process');
    assert.ok(!source.includes('child.exec'), 'SlangLinter must not call child_process.exec');
    assert.ok(!source.includes('exec(command'), 'SlangLinter must not call exec(command)');
  });
});
