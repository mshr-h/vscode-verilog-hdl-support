// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import LinterDiagnosticManager from '../../../linter/LinterDiagnosticManager';
import LintRunManager from '../../../linter/LintRunManager';
import VerilatorLinter from '../../../linter/VerilatorLinter';
import { requireNativeTool } from '../../support/nativeTool';

interface VerilatorConfigOptions {
  arguments?: string;
  includePath?: string[];
  runAtFileLocation?: boolean;
}

async function withVerilatorConfig(
  verilatorPath: string,
  options: VerilatorConfigOptions,
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
    await lintConfig.update('path', path.dirname(verilatorPath), vscode.ConfigurationTarget.Global);
    await verilatorConfig.update(
      'arguments',
      options.arguments ?? '',
      vscode.ConfigurationTarget.Global
    );
    await verilatorConfig.update(
      'includePath',
      options.includePath ?? [],
      vscode.ConfigurationTarget.Global
    );
    await verilatorConfig.update(
      'runAtFileLocation',
      options.runAtFileLocation ?? true,
      vscode.ConfigurationTarget.Global
    );
    await verilatorConfig.update('useWSL', false, vscode.ConfigurationTarget.Global);
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

async function runVerilator(
  verilatorPath: string,
  tempPrefix: string,
  files: Record<string, string>,
  documentName: string,
  options: VerilatorConfigOptions,
  verify: (diagnostics: readonly vscode.Diagnostic[]) => void
): Promise<void> {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(tempRoot, name), contents);
  }

  try {
    await withVerilatorConfig(
      verilatorPath,
      {
        ...options,
        includePath: options.includePath?.map((includePath) =>
          includePath === '$TEMP' ? tempRoot : includePath
        ),
      },
      async () => {
        const collection = vscode.languages.createDiagnosticCollection(`verilator-${tempPrefix}`);
        const diagnosticManager = new LinterDiagnosticManager(collection);
        const linter = new VerilatorLinter(diagnosticManager, new LintRunManager());

        try {
          const document = await vscode.workspace.openTextDocument(
            path.join(tempRoot, documentName)
          );
          await linter.startLint(document);
          verify(collection.get(document.uri) ?? []);
        } finally {
          linter.dispose();
          diagnosticManager.dispose();
        }
      }
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

const floatAddExample = `module float_add (
);

endmodule

module test (
);
float_add fa (
);

endmodule
`;

const includeTestExample = `\`include "float_add.v"

module test (
);
float_add fa (
);

endmodule
`;

suite('Verilator Linter', () => {
  test('reports diagnostics for syntax errors', async function () {
    this.timeout(10000);
    const verilatorPath = requireNativeTool(this, 'verilator');

    await runVerilator(
      verilatorPath,
      'verilator-test-',
      { 'bad.sv': 'module m\nendmodule\n' },
      'bad.sv',
      {},
      (diagnostics) => assert.ok(diagnostics.length > 0, 'Expected diagnostics from verilator')
    );
  });

  test('parses warning diagnostics with severity', async function () {
    this.timeout(10000);
    const verilatorPath = requireNativeTool(this, 'verilator');

    await runVerilator(
      verilatorPath,
      'verilator-warning-test-',
      { 'warn.sv': 'module m(input logic a);\nendmodule\n' },
      'warn.sv',
      { arguments: '-Wall' },
      (diagnostics) => {
        assert.ok(
          diagnostics.some(
            (diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Warning
          ),
          'Expected at least one warning diagnostic from verilator'
        );
      }
    );
  });

  test('handles diagnostics for files with spaces in paths', async function () {
    this.timeout(10000);
    const verilatorPath = requireNativeTool(this, 'verilator');

    await runVerilator(
      verilatorPath,
      'verilator space-test-',
      { 'bad space.sv': 'module m\nendmodule\n' },
      'bad space.sv',
      {},
      (diagnostics) => {
        assert.ok(diagnostics.length > 0, 'Expected diagnostics for a file with spaces in its path');
      }
    );
  });

  test('reports diagnostics for include file content duplicates', async function () {
    this.timeout(10000);
    const verilatorPath = requireNativeTool(this, 'verilator');

    await runVerilator(
      verilatorPath,
      'verilator-include-test-',
      { 'float_add.v': floatAddExample, 'test.v': includeTestExample },
      'test.v',
      { includePath: ['$TEMP'] },
      assertHasWarningOrError
    );
  });

  test('resolves include when runAtFileLocation is false', async function () {
    this.timeout(10000);
    const verilatorPath = requireNativeTool(this, 'verilator');

    await runVerilator(
      verilatorPath,
      'verilator-include-root-test-',
      { 'float_add.v': floatAddExample, 'test.v': includeTestExample },
      'test.v',
      { includePath: ['$TEMP'], runAtFileLocation: false },
      assertHasWarningOrError
    );
  });
});

function assertHasWarningOrError(diagnostics: readonly vscode.Diagnostic[]): void {
  assert.ok(
    diagnostics.some(
      (diagnostic) =>
        diagnostic.severity === vscode.DiagnosticSeverity.Error ||
        diagnostic.severity === vscode.DiagnosticSeverity.Warning
    ),
    'Expected diagnostics when processing the included file'
  );
}
