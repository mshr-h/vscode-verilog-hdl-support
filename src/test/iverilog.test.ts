// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import IcarusLinter from '../linter/IcarusLinter';
import { createLogger } from '../logger';

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

suite('Icarus Linter', () => {
  test('maps severity strings to diagnostics', () => {
    class TestLinter extends IcarusLinter {
      public mapSeverity(value: string): vscode.DiagnosticSeverity {
        return this.convertToSeverity(value);
      }
    }

    const diagnostics = vscode.languages.createDiagnosticCollection('iverilog-severity-test');
    const linter = new TestLinter(diagnostics, createLogger('IcarusSeverityTest'));

    assert.strictEqual(linter.mapSeverity('error'), vscode.DiagnosticSeverity.Error);
    assert.strictEqual(linter.mapSeverity('warning'), vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(linter.mapSeverity('note'), vscode.DiagnosticSeverity.Information);
  });

  test('reports diagnostics for syntax errors', async function () {
    this.timeout(8000);
    const iverilogPath = which.sync('iverilog', { nothrow: true });
    if (!iverilogPath) {
      this.skip();
      return;
    }

    const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
    const iverilogConfig = vscode.workspace.getConfiguration('verilog.linting.iverilog');
    const previousLintPath = lintConfig.get('path');
    const previousArgs = iverilogConfig.get('arguments');
    const previousInclude = iverilogConfig.get('includePath');
    const previousRunAtFile = iverilogConfig.get('runAtFileLocation');

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'iverilog-test-'));
    const tempFilePath = path.join(tempRoot, 'bad.v');
    fs.writeFileSync(tempFilePath, 'module m\nendmodule\n');

    try {
      await lintConfig.update('path', path.dirname(iverilogPath), vscode.ConfigurationTarget.Global);
      await iverilogConfig.update('arguments', '', vscode.ConfigurationTarget.Global);
      await iverilogConfig.update('includePath', [], vscode.ConfigurationTarget.Global);
      await iverilogConfig.update('runAtFileLocation', true, vscode.ConfigurationTarget.Global);

      const diagnostics = vscode.languages.createDiagnosticCollection('iverilog-test');
      const linter = new IcarusLinter(diagnostics, createLogger('IcarusLinterTest'));
      const document = await vscode.workspace.openTextDocument(tempFilePath);

      linter.startLint(document);
      const results = await waitForDiagnostics(diagnostics, document.uri, 3000);

      assert.ok(results.length > 0, 'Expected diagnostics from iverilog');
    } finally {
      await lintConfig.update('path', previousLintPath, vscode.ConfigurationTarget.Global);
      await iverilogConfig.update('arguments', previousArgs, vscode.ConfigurationTarget.Global);
      await iverilogConfig.update('includePath', previousInclude, vscode.ConfigurationTarget.Global);
      await iverilogConfig.update(
        'runAtFileLocation',
        previousRunAtFile,
        vscode.ConfigurationTarget.Global
      );
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
