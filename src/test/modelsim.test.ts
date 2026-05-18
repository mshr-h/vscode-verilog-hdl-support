// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  buildModelsimArgs,
  parseModelsimDiagnostics,
} from '../linter/ModelsimLinter';

suite('Modelsim Linter', () => {
  test('builds args with work library and custom args', () => {
    const documentPath = path.join(os.tmpdir(), 'modelsim source', 'top file.v');
    const args = buildModelsimArgs({
      workLibrary: 'work lib',
      customArguments: '+define+MSG="hello world" -sv',
      documentPath,
    });

    assert.deepStrictEqual(args, [
      '-nologo',
      '-work',
      'work lib',
      documentPath,
      '+define+MSG=hello world',
      '-sv',
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('parses diagnostics with messages containing colons', () => {
    const documentPath = path.join(os.tmpdir(), 'modelsim source', 'top file.v');
    const stdout = [
      `** Error: ${documentPath}(8): near "endmodule": syntax error: unexpected token`,
      `** Warning: ${documentPath}(12): Undefined variable: "foo".`,
      '** Error: /tmp/other.v(1): ignored',
    ].join('\n');
    const diagnostics = parseModelsimDiagnostics(stdout, documentPath);

    assert.strictEqual(diagnostics.length, 2);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(diagnostics[0].range.start.line, 7);
    assert.strictEqual(diagnostics[0].message, 'near "endmodule": syntax error: unexpected token');
    assert.strictEqual(diagnostics[0].source, 'modelsim');
    assert.strictEqual(diagnostics[1].severity, vscode.DiagnosticSeverity.Warning);
  });

  test('does not import child_process or call child exec', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'src', 'linter', 'ModelsimLinter.ts'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'ModelsimLinter must not import child_process');
    assert.ok(!source.includes('child.exec'), 'ModelsimLinter must not call child_process.exec');
    assert.ok(!source.includes('exec(command'), 'ModelsimLinter must not call exec(command)');
  });
});
