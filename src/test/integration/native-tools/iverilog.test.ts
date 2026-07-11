// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import IcarusLinter from '../../../linter/IcarusLinter';
import LinterDiagnosticManager from '../../../linter/LinterDiagnosticManager';
import LintRunManager from '../../../linter/LintRunManager';
import { requireNativeTool } from '../../support/nativeTool';

suite('Icarus Linter', () => {
  test('reports diagnostics for syntax errors', async function () {
    this.timeout(8000);
    const iverilogPath = requireNativeTool(this, 'iverilog');
    const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
    const iverilogConfig = vscode.workspace.getConfiguration('verilog.linting.iverilog');
    const previousLintPath = lintConfig.get('path');
    const previousArgs = iverilogConfig.get('arguments');
    const previousInclude = iverilogConfig.get('includePath');
    const previousRunAtFile = iverilogConfig.get('runAtFileLocation');
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'iverilog-test-'));
    const tempFilePath = path.join(tempRoot, 'bad.v');
    fs.writeFileSync(tempFilePath, 'module m\nendmodule\n');

    const collection = vscode.languages.createDiagnosticCollection('iverilog-test');
    const diagnosticManager = new LinterDiagnosticManager(collection);
    let linter: IcarusLinter | undefined;

    try {
      await lintConfig.update('path', path.dirname(iverilogPath), vscode.ConfigurationTarget.Global);
      await iverilogConfig.update('arguments', '', vscode.ConfigurationTarget.Global);
      await iverilogConfig.update('includePath', [], vscode.ConfigurationTarget.Global);
      await iverilogConfig.update('runAtFileLocation', true, vscode.ConfigurationTarget.Global);

      linter = new IcarusLinter(diagnosticManager, new LintRunManager());
      const document = await vscode.workspace.openTextDocument(tempFilePath);
      await linter.startLint(document);

      assert.ok(
        (collection.get(document.uri) ?? []).length > 0,
        'Expected diagnostics from iverilog'
      );
    } finally {
      linter?.dispose();
      diagnosticManager.dispose();
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
