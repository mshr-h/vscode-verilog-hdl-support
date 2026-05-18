// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { buildXvlogArgs, parseXvlogDiagnostics } from '../linter/XvlogLinter';

suite('Xvlog Linter', () => {
  test('builds args with automatic flags and split custom args', () => {
    const includePath = path.join(os.tmpdir(), 'xvlog include');
    const documentPath = path.join(os.tmpdir(), 'xvlog source', 'top file.sv');
    const args = buildXvlogArgs({
      languageId: 'systemverilog',
      includePaths: [includePath],
      customArguments: '--define FOO="bar baz"',
      documentPath,
    });

    assert.deepStrictEqual(args, [
      '-nolog',
      '-sv',
      '-i',
      includePath,
      '--define',
      'FOO=bar baz',
      documentPath,
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('parses diagnostics with paths containing spaces', () => {
    const stdout = [
      'ERROR: [VRFC 10-123] syntax error near module: detail [/tmp/xvlog source/top file.sv:5]',
      'WARNING: [VRFC 10-456] signal is unused [C:/xvlog source/top file.sv:7]',
    ].join('\n');
    const diagnostics = parseXvlogDiagnostics(stdout);

    assert.strictEqual(diagnostics.length, 2);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(diagnostics[0].code, 'VRFC 10-123');
    assert.strictEqual(
      diagnostics[0].message,
      '[VRFC 10-123] syntax error near module: detail'
    );
    assert.strictEqual(diagnostics[0].range.start.line, 4);
    assert.strictEqual(diagnostics[0].source, 'xvlog');
    assert.strictEqual(diagnostics[1].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(diagnostics[1].range.start.line, 6);
  });

  test('does not import child_process or call child exec', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'src', 'linter', 'XvlogLinter.ts'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'XvlogLinter must not import child_process');
    assert.ok(!source.includes('child.exec'), 'XvlogLinter must not call child_process.exec');
    assert.ok(!source.includes('exec(command'), 'XvlogLinter must not call exec(command)');
  });
});
