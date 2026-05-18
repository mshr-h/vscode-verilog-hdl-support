// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import VeribleVerilogLintLinter, {
  buildVeribleVerilogLintArgs,
  parseVeribleVerilogLintDiagnostics,
} from '../linter/VeribleVerilogLintLinter';

async function waitForDiagnostics(
  collection: vscode.DiagnosticCollection,
  uri: vscode.Uri,
  timeoutMs: number
): Promise<readonly vscode.Diagnostic[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = collection.get(uri);
    if (current && current.length > 0) {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return collection.get(uri) ?? [];
}

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

  test('reports diagnostics for syntax errors', async function () {
    this.timeout(8000);
    const veriblePath = which.sync('verible-verilog-lint', { nothrow: true });
    if (!veriblePath) {
      this.skip();
      return;
    }

    const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
    const veribleConfig = vscode.workspace.getConfiguration('verilog.linting.veribleVerilogLint');
    const previousLintPath = lintConfig.get('path');
    const previousArgs = veribleConfig.get('arguments');
    const previousRunAtFile = veribleConfig.get('runAtFileLocation');

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verible-lint-test-'));
    const tempFilePath = path.join(tempRoot, 'bad.sv');
    fs.writeFileSync(tempFilePath, 'module m\nendmodule\n');

    try {
      await lintConfig.update('path', path.dirname(veriblePath), vscode.ConfigurationTarget.Global);
      await veribleConfig.update('arguments', '', vscode.ConfigurationTarget.Global);
      await veribleConfig.update('runAtFileLocation', true, vscode.ConfigurationTarget.Global);

      const diagnostics = vscode.languages.createDiagnosticCollection('verible-verilog-lint-test');
      const linter = new VeribleVerilogLintLinter(
        diagnostics
      );
      const document = await vscode.workspace.openTextDocument(tempFilePath);

      linter.startLint(document);
      const results = await waitForDiagnostics(diagnostics, document.uri, 3000);

      assert.ok(results.length > 0, 'Expected diagnostics from verible-verilog-lint');
    } finally {
      await lintConfig.update('path', previousLintPath, vscode.ConfigurationTarget.Global);
      await veribleConfig.update('arguments', previousArgs, vscode.ConfigurationTarget.Global);
      await veribleConfig.update(
        'runAtFileLocation',
        previousRunAtFile,
        vscode.ConfigurationTarget.Global
      );
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
