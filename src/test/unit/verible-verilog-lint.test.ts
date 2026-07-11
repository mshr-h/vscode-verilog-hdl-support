// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  buildVeribleVerilogLintArgs,
  parseVeribleVerilogLintDiagnostics,
} from '../../linter/VeribleVerilogLintLinter';

suite('Verible Verilog Lint', () => {
  test('builds argv without shell quoting', () => {
    const documentPath = path.join(os.tmpdir(), 'verible source path', 'bad file.sv');
    const args = buildVeribleVerilogLintArgs({
      customArguments: '--ruleset=all --waiver_files "waiver file.vbl"',
      documentPath,
    });

    assert.deepStrictEqual(args, ['--ruleset=all', '--waiver_files', 'waiver file.vbl', documentPath]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('parses diagnostics with paths, rules, and colons', () => {
    const cwd = path.join(os.tmpdir(), 'verible cwd with spaces');
    const documentPath = path.join(cwd, 'bad file.sv');
    const output = [
      'bad file.sv:2:5: syntax error: unexpected token [syntax-error]',
      `${documentPath}:4:3-8: Symbol warning text [explicit-parameter-storage-type]`,
      '/tmp/other.sv:1:1: ignored [rule]',
    ].join('\n');

    const diagnostics = parseVeribleVerilogLintDiagnostics({
      output,
      cwd,
      documentPath,
      isWindows: false,
    });

    assert.strictEqual(diagnostics.length, 2);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(diagnostics[0].range.start.line, 1);
    assert.strictEqual(diagnostics[0].range.start.character, 4);
    assert.strictEqual(diagnostics[0].message, 'syntax error: unexpected token');
    assert.strictEqual(diagnostics[0].code, 'syntax-error');
    assert.strictEqual(diagnostics[0].source, 'verible-verilog-lint');
    assert.strictEqual(diagnostics[1].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(diagnostics[1].range.end.character, 7);
  });
});
