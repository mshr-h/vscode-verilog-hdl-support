// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import VerilatorLinter from '../linter/VerilatorLinter';
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

suite('Verilator Linter', () => {
  test('reports diagnostics for syntax errors', async function () {
    this.timeout(10000);
    const verilatorPath = which.sync('verilator', { nothrow: true });
    if (!verilatorPath) {
      this.skip();
      return;
    }

    const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
    const verilatorConfig = vscode.workspace.getConfiguration('verilog.linting.verilator');
    const previousLintPath = lintConfig.get('path');
    const previousArgs = verilatorConfig.get('arguments');
    const previousInclude = verilatorConfig.get('includePath');
    const previousRunAtFile = verilatorConfig.get('runAtFileLocation');
    const previousUseWSL = verilatorConfig.get('useWSL');

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verilator-test-'));
    const tempFilePath = path.join(tempRoot, 'bad.sv');
    fs.writeFileSync(tempFilePath, 'module m\nendmodule\n');

    try {
      await lintConfig.update('path', path.dirname(verilatorPath), vscode.ConfigurationTarget.Global);
      await verilatorConfig.update('arguments', '', vscode.ConfigurationTarget.Global);
      await verilatorConfig.update('includePath', [], vscode.ConfigurationTarget.Global);
      await verilatorConfig.update('runAtFileLocation', true, vscode.ConfigurationTarget.Global);
      await verilatorConfig.update('useWSL', false, vscode.ConfigurationTarget.Global);

      const diagnostics = vscode.languages.createDiagnosticCollection('verilator-test');
      const linter = new VerilatorLinter(diagnostics, createLogger('VerilatorLinterTest'));
      const document = await vscode.workspace.openTextDocument(tempFilePath);

      linter.startLint(document);
      const results = await waitForDiagnostics(diagnostics, document.uri, 4000);

      assert.ok(results.length > 0, 'Expected diagnostics from verilator');
    } finally {
      await lintConfig.update('path', previousLintPath, vscode.ConfigurationTarget.Global);
      await verilatorConfig.update('arguments', previousArgs, vscode.ConfigurationTarget.Global);
      await verilatorConfig.update('includePath', previousInclude, vscode.ConfigurationTarget.Global);
      await verilatorConfig.update(
        'runAtFileLocation',
        previousRunAtFile,
        vscode.ConfigurationTarget.Global
      );
      await verilatorConfig.update('useWSL', previousUseWSL, vscode.ConfigurationTarget.Global);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
