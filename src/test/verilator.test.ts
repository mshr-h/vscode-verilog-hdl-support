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

async function withVerilatorConfig(
  verilatorPath: string,
  options: {
    arguments?: string;
    includePath?: string[];
    runAtFileLocation?: boolean;
    useWSL?: boolean;
  },
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
    await verilatorConfig.update('useWSL', options.useWSL ?? false, vscode.ConfigurationTarget.Global);

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

function createTempSvFile(tempRoot: string, name: string, contents: string): string {
  const tempFilePath = path.join(tempRoot, name);
  fs.writeFileSync(tempFilePath, contents);
  return tempFilePath;
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
    const verilatorPath = which.sync('verilator', { nothrow: true });
    if (!verilatorPath) {
      this.skip();
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verilator-test-'));
    const tempFilePath = createTempSvFile(tempRoot, 'bad.sv', 'module m\nendmodule\n');

    try {
      await withVerilatorConfig(verilatorPath, {}, async () => {
        const diagnostics = vscode.languages.createDiagnosticCollection('verilator-test');
        const linter = new VerilatorLinter(diagnostics, createLogger('VerilatorLinterTest'));
        const document = await vscode.workspace.openTextDocument(tempFilePath);

        linter.startLint(document);
        const results = await waitForDiagnostics(diagnostics, document.uri, 4000);

        assert.ok(results.length > 0, 'Expected diagnostics from verilator');
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('parses warning diagnostics with severity', async function () {
    this.timeout(10000);
    const verilatorPath = which.sync('verilator', { nothrow: true });
    if (!verilatorPath) {
      this.skip();
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verilator-warning-test-'));
    const tempFilePath = createTempSvFile(
      tempRoot,
      'warn.sv',
      'module m(input logic a);\nendmodule\n'
    );

    try {
      await withVerilatorConfig(verilatorPath, { arguments: '-Wall' }, async () => {
        const diagnostics = vscode.languages.createDiagnosticCollection('verilator-warning-test');
        const linter = new VerilatorLinter(diagnostics, createLogger('VerilatorLinterWarningTest'));
        const document = await vscode.workspace.openTextDocument(tempFilePath);

        linter.startLint(document);
        const results = await waitForDiagnostics(diagnostics, document.uri, 4000);

        assert.ok(
          results.some((diag) => diag.severity === vscode.DiagnosticSeverity.Warning),
          'Expected at least one warning diagnostic from verilator'
        );
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('handles diagnostics for files with spaces in paths', async function () {
    this.timeout(10000);
    const verilatorPath = which.sync('verilator', { nothrow: true });
    if (!verilatorPath) {
      this.skip();
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verilator space-test-'));
    const tempFilePath = createTempSvFile(tempRoot, 'bad space.sv', 'module m\nendmodule\n');

    try {
      await withVerilatorConfig(verilatorPath, {}, async () => {
        const diagnostics = vscode.languages.createDiagnosticCollection('verilator-space-test');
        const linter = new VerilatorLinter(diagnostics, createLogger('VerilatorLinterSpaceTest'));
        const document = await vscode.workspace.openTextDocument(tempFilePath);

        linter.startLint(document);
        const results = await waitForDiagnostics(diagnostics, document.uri, 4000);

        assert.ok(
          results.length > 0,
          'Expected diagnostics for a file with spaces in its path'
        );
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('reports diagnostics for include file content duplicates', async function () {
    this.timeout(10000);
    const verilatorPath = which.sync('verilator', { nothrow: true });
    if (!verilatorPath) {
      this.skip();
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verilator-include-test-'));
    createTempSvFile(tempRoot, 'float_add.v', floatAddExample);
    const tempFilePath = createTempSvFile(tempRoot, 'test.v', includeTestExample);

    try {
      await withVerilatorConfig(verilatorPath, { includePath: [tempRoot] }, async () => {
        const diagnostics = vscode.languages.createDiagnosticCollection('verilator-include-test');
        const linter = new VerilatorLinter(diagnostics, createLogger('VerilatorLinterIncludeTest'));
        const document = await vscode.workspace.openTextDocument(tempFilePath);

        linter.startLint(document);
        const results = await waitForDiagnostics(diagnostics, document.uri, 4000);

        assert.ok(
          results.some(
            (diag) =>
              diag.severity === vscode.DiagnosticSeverity.Error ||
              diag.severity === vscode.DiagnosticSeverity.Warning
          ),
          'Expected duplicate module diagnostics from included file content'
        );
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('resolves include when runAtFileLocation is false', async function () {
    this.timeout(10000);
    const verilatorPath = which.sync('verilator', { nothrow: true });
    if (!verilatorPath) {
      this.skip();
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verilator-include-root-test-'));
    createTempSvFile(tempRoot, 'float_add.v', floatAddExample);
    const tempFilePath = createTempSvFile(tempRoot, 'test.v', includeTestExample);

    try {
      await withVerilatorConfig(
        verilatorPath,
        { includePath: [tempRoot], runAtFileLocation: false },
        async () => {
          const diagnostics = vscode.languages.createDiagnosticCollection(
            'verilator-include-root-test'
          );
          const linter = new VerilatorLinter(
            diagnostics,
            createLogger('VerilatorLinterIncludeRootTest')
          );
          const document = await vscode.workspace.openTextDocument(tempFilePath);

          linter.startLint(document);
          const results = await waitForDiagnostics(diagnostics, document.uri, 4000);

          assert.ok(
            results.some(
              (diag) =>
                diag.severity === vscode.DiagnosticSeverity.Error ||
                diag.severity === vscode.DiagnosticSeverity.Warning
            ),
            'Expected diagnostics when include path is configured'
          );
        }
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
