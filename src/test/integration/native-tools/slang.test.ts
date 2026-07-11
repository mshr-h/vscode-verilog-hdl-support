// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import LinterDiagnosticManager from '../../../linter/LinterDiagnosticManager';
import LintRunManager from '../../../linter/LintRunManager';
import SlangLinter from '../../../linter/SlangLinter';
import { requireNativeTool } from '../../support/nativeTool';

function formatDiagnosticsDump(
  collection: vscode.DiagnosticCollection,
  expectedUri: vscode.Uri
): string {
  const lines = [`Expected document URI: ${expectedUri.toString()}`, 'Diagnostic collection:'];

  collection.forEach((uri, diagnostics) => {
    lines.push(`- ${uri.toString()}`);
    for (const diagnostic of diagnostics) {
      lines.push(
        `  source=${diagnostic.source ?? ''} severity=${diagnostic.severity} code=${
          diagnostic.code?.toString() ?? ''
        } message=${diagnostic.message}`
      );
    }
  });

  return lines.join('\n');
}

async function withSlangConfig(slangPath: string, run: () => Promise<void>): Promise<void> {
  const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
  const slangConfig = vscode.workspace.getConfiguration('verilog.linting.slang');
  const previousLintPath = lintConfig.get('path');
  const previousArgs = slangConfig.get('arguments');
  const previousInclude = slangConfig.get('includePath');
  const previousRunAtFile = slangConfig.get('runAtFileLocation');
  const previousUseWSL = slangConfig.get('useWSL');

  try {
    await lintConfig.update('path', path.dirname(slangPath), vscode.ConfigurationTarget.Global);
    await slangConfig.update('arguments', '', vscode.ConfigurationTarget.Global);
    await slangConfig.update('includePath', [], vscode.ConfigurationTarget.Global);
    await slangConfig.update('runAtFileLocation', true, vscode.ConfigurationTarget.Global);
    await slangConfig.update('useWSL', false, vscode.ConfigurationTarget.Global);
    await run();
  } finally {
    await lintConfig.update('path', previousLintPath, vscode.ConfigurationTarget.Global);
    await slangConfig.update('arguments', previousArgs, vscode.ConfigurationTarget.Global);
    await slangConfig.update('includePath', previousInclude, vscode.ConfigurationTarget.Global);
    await slangConfig.update(
      'runAtFileLocation',
      previousRunAtFile,
      vscode.ConfigurationTarget.Global
    );
    await slangConfig.update('useWSL', previousUseWSL, vscode.ConfigurationTarget.Global);
  }
}

async function assertSlangDiagnostic(
  slangPath: string,
  tempPrefix: string,
  fileName: string,
  failureMessage: string
): Promise<void> {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  const tempFilePath = path.join(tempRoot, fileName);
  fs.writeFileSync(tempFilePath, 'module bad\nendmodule\n');

  try {
    await withSlangConfig(slangPath, async () => {
      const collection = vscode.languages.createDiagnosticCollection(`slang-${tempPrefix}`);
      const diagnosticManager = new LinterDiagnosticManager(collection);
      const linter = new SlangLinter(diagnosticManager, new LintRunManager());

      try {
        const document = await vscode.workspace.openTextDocument(tempFilePath);
        await linter.startLint(document);
        const results = collection.get(document.uri) ?? [];

        assert.ok(
          results.some(
            (diagnostic) =>
              diagnostic.source === 'slang' &&
              diagnostic.severity === vscode.DiagnosticSeverity.Error
          ),
          `${failureMessage}\n${formatDiagnosticsDump(collection, document.uri)}`
        );
      } finally {
        linter.dispose();
        diagnosticManager.dispose();
      }
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

suite('Slang Linter', () => {
  test('reports diagnostics for syntax errors with installed slang', async function () {
    this.timeout(10000);
    const slangPath = requireNativeTool(this, 'slang');

    await assertSlangDiagnostic(
      slangPath,
      'slang-test-',
      'bad.sv',
      'Expected a slang syntax error diagnostic'
    );
  });

  test('handles diagnostics for files with spaces in paths with installed slang', async function () {
    this.timeout(10000);
    const slangPath = requireNativeTool(this, 'slang');

    await assertSlangDiagnostic(
      slangPath,
      'slang space-test-',
      'bad file.sv',
      'Expected a slang diagnostic for a file with spaces'
    );
  });
});
