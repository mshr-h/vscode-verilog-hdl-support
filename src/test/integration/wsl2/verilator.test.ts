// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import LinterDiagnosticManager from '../../../linter/LinterDiagnosticManager';
import LintRunManager from '../../../linter/LintRunManager';
import VerilatorLinter from '../../../linter/VerilatorLinter';

interface VerilatorWslOptions {
  arguments?: string;
}

async function withVerilatorWslConfig(
  options: VerilatorWslOptions,
  run: () => Promise<void>
): Promise<void> {
  const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
  const verilatorConfig = vscode.workspace.getConfiguration('verilog.linting.verilator');
  const previousLintPath = lintConfig.get('path');
  const previousArgs = verilatorConfig.get('arguments');
  const previousInclude = verilatorConfig.get('includePath');
  const previousRunAtFile = verilatorConfig.get('runAtFileLocation');
  const previousUseWSL = verilatorConfig.get('useWSL');

  try {
    await lintConfig.update('path', path.dirname('wsl'), vscode.ConfigurationTarget.Global);
    await verilatorConfig.update(
      'arguments',
      options.arguments ?? '',
      vscode.ConfigurationTarget.Global
    );
    await verilatorConfig.update('includePath', [], vscode.ConfigurationTarget.Global);
    await verilatorConfig.update('runAtFileLocation', true, vscode.ConfigurationTarget.Global);
    await verilatorConfig.update('useWSL', true, vscode.ConfigurationTarget.Global);
    await run();
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
  }
}

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

async function runVerilatorWsl(
  tempPrefix: string,
  fileName: string,
  contents: string,
  options: VerilatorWslOptions,
  verify: (
    diagnostics: readonly vscode.Diagnostic[],
    collection: vscode.DiagnosticCollection,
    uri: vscode.Uri
  ) => void
): Promise<void> {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  const tempFilePath = path.join(tempRoot, fileName);
  fs.writeFileSync(tempFilePath, contents);

  try {
    await withVerilatorWslConfig(options, async () => {
      const collection = vscode.languages.createDiagnosticCollection(`verilator-${tempPrefix}`);
      const diagnosticManager = new LinterDiagnosticManager(collection);
      const linter = new VerilatorLinter(diagnosticManager, new LintRunManager());

      try {
        const document = await vscode.workspace.openTextDocument(tempFilePath);
        await linter.startLint(document);
        verify(collection.get(document.uri) ?? [], collection, document.uri);
      } finally {
        linter.dispose();
        diagnosticManager.dispose();
      }
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

suite('Verilator Linter', () => {
  test('[windows-wsl2] reports diagnostics using Verilator under WSL2', async function () {
    this.timeout(20000);
    if (process.platform !== 'win32' || process.env.VERILOGHDL_RUN_WSL2_TESTS !== '1') {
      this.skip();
      return;
    }

    await runVerilatorWsl(
      'verilator wsl2-test-',
      'bad file.sv',
      'module m\nendmodule\n',
      {},
      (diagnostics) => {
        assert.ok(
          diagnostics.some(
            (diagnostic) =>
              diagnostic.source === 'verilator' &&
              diagnostic.severity === vscode.DiagnosticSeverity.Error
          ),
          'Expected a Verilator syntax error diagnostic from WSL2'
        );
      }
    );
  });

  test('[windows-wsl2] reproduces #512: WIDTH warning is published on Windows document URI', async function () {
    this.timeout(20000);
    if (process.platform !== 'win32' || process.env.VERILOGHDL_RUN_WSL2_TESTS !== '1') {
      this.skip();
      return;
    }

    await runVerilatorWsl(
      'verilator wsl2-width-test-',
      'width_warning.sv',
      [
        'module width_warning(input logic [1:0] cmd_addr, output logic cmd_x_sel);',
        'wire axes_sel_reg = cmd_addr[1:0];',
        "assign cmd_x_sel = axes_sel_reg == 2'd0;",
        'endmodule',
        '',
      ].join('\n'),
      { arguments: '-Wall' },
      (diagnostics, collection, uri) => {
        assert.ok(
          diagnostics.some(
            (diagnostic) =>
              diagnostic.source === 'verilator' &&
              diagnostic.severity === vscode.DiagnosticSeverity.Warning &&
              diagnostic.code === 'WIDTH'
          ),
          `Expected Verilator WIDTH warning on Windows document URI\n${formatDiagnosticsDump(
            collection,
            uri
          )}`
        );
      }
    );
  });
});
