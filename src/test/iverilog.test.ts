// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import LinterDiagnosticManager from '../linter/LinterDiagnosticManager';
import LintRunManager from '../linter/LintRunManager';
import IcarusLinter, {
  buildIcarusArgs,
  parseIcarusDiagnostics,
  splitCommandLineArgs,
} from '../linter/IcarusLinter';

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
  test('splits custom command-line arguments', () => {
    assert.deepStrictEqual(splitCommandLineArgs(''), []);
    assert.deepStrictEqual(splitCommandLineArgs('  -Wall   -DNAME=VALUE  '), [
      '-Wall',
      '-DNAME=VALUE',
    ]);
    assert.deepStrictEqual(
      splitCommandLineArgs('-DMSG="hello world" -I \'quoted include\' "-DNAME=foo bar"'),
      ['-DMSG=hello world', '-I', 'quoted include', '-DNAME=foo bar']
    );
    assert.deepStrictEqual(splitCommandLineArgs('-DNAME=\\"quoted\\" "unterminated value'), [
      '-DNAME="quoted"',
      'unterminated value',
    ]);
  });

  test('builds argv without shell quoting', () => {
    const includePath = path.join(os.tmpdir(), 'iverilog include path');
    const projectIncludePath = path.join(os.tmpdir(), 'iverilog project include');
    const documentPath = path.join(os.tmpdir(), 'iverilog source path', 'bad file.v');
    const args = buildIcarusArgs({
      languageId: 'systemverilog',
      standards: new Map<string, string>([
        ['verilog', 'Verilog-2005'],
        ['systemverilog', 'SystemVerilog2012'],
      ]),
      includePaths: [includePath, projectIncludePath],
      defineArgs: ['SIM', 'WIDTH=32'],
      customArguments: '-Wall -DMSG="hello world"',
      documentPath,
    });

    assert.deepStrictEqual(args, [
      '-t',
      'null',
      '-g2012',
      '-I',
      includePath,
      '-I',
      projectIncludePath,
      '-D',
      'SIM',
      '-D',
      'WIDTH=32',
      '-Wall',
      '-DMSG=hello world',
      documentPath,
    ]);
    assert.ok(!args.some((arg) => arg.startsWith('-I "')), 'Include path must not be shell quoted');
    assert.ok(!args.includes(`"${documentPath}"`), 'Document path must not be shell quoted');
  });

  test('builds Verilog standard arg and omits unknown language standard', () => {
    const standards = new Map<string, string>([
      ['verilog', 'Verilog-95'],
      ['systemverilog', 'SystemVerilog2005'],
    ]);

    assert.deepStrictEqual(
      buildIcarusArgs({
        languageId: 'verilog',
        standards,
        includePaths: [],
        customArguments: '',
        documentPath: '/tmp/test.v',
      }),
      ['-t', 'null', '-g1995', '/tmp/test.v']
    );
    assert.deepStrictEqual(
      buildIcarusArgs({
        languageId: 'vhdl',
        standards,
        includePaths: [],
        customArguments: '',
        documentPath: '/tmp/test.v',
      }),
      ['-t', 'null', '/tmp/test.v']
    );
  });

  test('parses Icarus diagnostics with colons and continuation lines', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'iverilog-parse-'));
    const tempFilePath = path.join(tempRoot, 'bad.v');
    fs.writeFileSync(tempFilePath, ['module bad;', 'wire a;', 'endmodule'].join('\n'));

    try {
      const document = await vscode.workspace.openTextDocument(tempFilePath);
      const output = [
        'bad.v:1: syntax error',
        'bad.v:2: error: Module test was already declared here: ./float_add.v:6',
        '       extra context line',
        `${tempFilePath}:3: warning: trailing text`,
      ].join('\n');

      const diagMap = parseIcarusDiagnostics(output, tempRoot, document);
      const diagnostics = diagMap.get(tempFilePath) ?? [];

      assert.strictEqual(diagnostics.length, 3);
      assert.strictEqual(diagnostics[0].message, 'syntax error');
      assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
      assert.strictEqual(
        diagnostics[1].message,
        'Module test was already declared here: ./float_add.v:6\n       extra context line'
      );
      assert.strictEqual(diagnostics[1].range.start.line, 1);
      assert.strictEqual(diagnostics[2].severity, vscode.DiagnosticSeverity.Warning);
      assert.ok(diagnostics.every((diagnostic) => diagnostic.source === 'iverilog'));
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('maps severity strings to diagnostics', () => {
    class TestLinter extends IcarusLinter {
      public mapSeverity(value: string): vscode.DiagnosticSeverity {
        return this.convertToSeverity(value);
      }
    }

    const diagnostics = vscode.languages.createDiagnosticCollection('iverilog-severity-test');
    const linter = new TestLinter(
      new LinterDiagnosticManager(diagnostics),
      new LintRunManager()
    );

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
      const linter = new IcarusLinter(
        new LinterDiagnosticManager(diagnostics),
        new LintRunManager()
      );
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
