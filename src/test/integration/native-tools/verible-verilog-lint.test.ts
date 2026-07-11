// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import LinterDiagnosticManager from '../../../linter/LinterDiagnosticManager';
import LintRunManager from '../../../linter/LintRunManager';
import VeribleVerilogLintLinter from '../../../linter/VeribleVerilogLintLinter';
import { requireNativeTool } from '../../support/nativeTool';

suite('Verible Verilog Lint', () => {
  test('reports diagnostics for syntax errors', async function () {
    this.timeout(8000);
    const veriblePath = requireNativeTool(this, 'verible-verilog-lint');
    const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
    const veribleConfig = vscode.workspace.getConfiguration('verilog.linting.veribleVerilogLint');
    const previousLintPath = lintConfig.get('path');
    const previousArgs = veribleConfig.get('arguments');
    const previousRunAtFile = veribleConfig.get('runAtFileLocation');
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verible-lint-test-'));
    const tempFilePath = path.join(tempRoot, 'bad.sv');
    fs.writeFileSync(tempFilePath, 'module m\nendmodule\n');

    const collection = vscode.languages.createDiagnosticCollection('verible-verilog-lint-test');
    const diagnosticManager = new LinterDiagnosticManager(collection);
    let linter: VeribleVerilogLintLinter | undefined;

    try {
      await lintConfig.update('path', path.dirname(veriblePath), vscode.ConfigurationTarget.Global);
      await veribleConfig.update('arguments', '', vscode.ConfigurationTarget.Global);
      await veribleConfig.update('runAtFileLocation', true, vscode.ConfigurationTarget.Global);

      linter = new VeribleVerilogLintLinter(diagnosticManager, new LintRunManager());
      const document = await vscode.workspace.openTextDocument(tempFilePath);
      await linter.startLint(document);

      assert.ok(
        (collection.get(document.uri) ?? []).length > 0,
        'Expected diagnostics from verible-verilog-lint'
      );
    } finally {
      linter?.dispose();
      diagnosticManager.dispose();
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
