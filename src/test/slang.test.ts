// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import LinterDiagnosticManager from '../linter/LinterDiagnosticManager';
import LintRunManager from '../linter/LintRunManager';
import SlangLinter, {
  buildSlangArgs,
  buildSlangCommand,
  getSlangPaths,
  parseSlangDiagnostics,
  parseSlangDiagnosticsByFile,
} from '../linter/SlangLinter';

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

async function withSlangConfig(
  slangPath: string,
  options: {
    arguments?: string;
    includePath?: string[];
    runAtFileLocation?: boolean;
    useWSL?: boolean;
  },
  run: () => Promise<void>
): Promise<void> {
  const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
  const slangConfig = vscode.workspace.getConfiguration('verilog.linting.slang');
  const previousLintPath = lintConfig.get('path');
  const previousArgs = slangConfig.get('arguments');
  const previousInclude = slangConfig.get('includePath');
  const previousRunAtFile = slangConfig.get('runAtFileLocation');
  const previousUseWSL = slangConfig.get('useWSL');

  try {
    await lintConfig.update('path', path.dirname(slangPath), vscode.ConfigurationTarget.Global);
    await slangConfig.update('arguments', options.arguments ?? '', vscode.ConfigurationTarget.Global);
    await slangConfig.update(
      'includePath',
      options.includePath ?? [],
      vscode.ConfigurationTarget.Global
    );
    await slangConfig.update(
      'runAtFileLocation',
      options.runAtFileLocation ?? true,
      vscode.ConfigurationTarget.Global
    );
    await slangConfig.update('useWSL', options.useWSL ?? false, vscode.ConfigurationTarget.Global);

    await run();
  } finally {
    await lintConfig.update('path', previousLintPath, vscode.ConfigurationTarget.Global);
    await slangConfig.update('arguments', previousArgs, vscode.ConfigurationTarget.Global);
    await slangConfig.update('includePath', previousInclude, vscode.ConfigurationTarget.Global);
    await slangConfig.update('runAtFileLocation', previousRunAtFile, vscode.ConfigurationTarget.Global);
    await slangConfig.update('useWSL', previousUseWSL, vscode.ConfigurationTarget.Global);
  }
}

function createTempSvFile(tempRoot: string, name: string, contents: string): string {
  const tempFilePath = path.join(tempRoot, name);
  fs.writeFileSync(tempFilePath, contents);
  return tempFilePath;
}

suite('Slang Linter', () => {
  test('builds command and args without WSL shell strings', () => {
    const documentPath = '/tmp/slang source/top file.sv';
    const docFolder = '/tmp/slang source';
    const includePath = '/tmp/slang include';
    const projectIncludePath = '/tmp/slang project include';
    const commandInfo = buildSlangCommand({
      isWindows: false,
      useWSL: false,
      linterInstalledPath: '/tools/bin',
    });
    const args = commandInfo.leadingArgs.concat(
      buildSlangArgs({
        docFolder,
        includePaths: [includePath, projectIncludePath],
        defineArgs: ['SIM', 'WIDTH=32'],
        customArguments: '--single-unit --top "top mod"',
        documentPath,
      })
    );

    assert.strictEqual(commandInfo.command, '/tools/bin/slang');
    assert.deepStrictEqual(args, [
      '-I',
      docFolder,
      '-I',
      includePath,
      '-I',
      projectIncludePath,
      '-D',
      'SIM',
      '-D',
      'WIDTH=32',
      '--single-unit',
      '--top',
      'top mod',
      documentPath,
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('[windows] builds Windows WSL command with converted generated paths', () => {
    const commandInfo = buildSlangCommand({
      isWindows: true,
      useWSL: true,
      linterInstalledPath: '',
    });
    const paths = getSlangPaths({
      documentPath: 'C:\\workspace\\rtl dir\\top file.sv',
      isWindows: true,
      useWSL: true,
      runAtFileLocation: true,
      convertToWslPath: (inputPath) =>
        inputPath.replace(/^C:\\/, '/mnt/c/').replace(/\\/g, '/'),
    });
    const args = commandInfo.leadingArgs.concat(
      buildSlangArgs({
        docFolder: paths.docFolder,
        includePaths: [],
        customArguments: '--lint-only',
        documentPath: paths.docUri,
      })
    );

    assert.strictEqual(commandInfo.command, 'wsl');
    assert.strictEqual(args[0], 'slang');
    assert.strictEqual(paths.docUri, '/mnt/c/workspace/rtl dir/top file.sv');
    assert.strictEqual(paths.docFolder, '/mnt/c/workspace/rtl dir');
    assert.strictEqual(paths.cwd, 'C:\\workspace\\rtl dir');
    assert.deepStrictEqual(args, [
      'slang',
      '-I',
      '/mnt/c/workspace/rtl dir',
      '--lint-only',
      '/mnt/c/workspace/rtl dir/top file.sv',
    ]);
  });

  test('parses diagnostics with warnings, errors, brackets, and colons', () => {
    const documentPath = '/tmp/slang source/top file.sv';
    const stderr = [
      `${documentPath}:3:12: error: expected module item: got 'endmodule'`,
      `${documentPath}:4:2: warning: unused signal [foo:bar] [-Wunused]`,
      '/tmp/other.sv:1:1: error: ignored',
    ].join('\n');
    const diagnostics = parseSlangDiagnostics({
      stderr,
      documentPath,
      isWindows: false,
      useWSL: false,
    });

    assert.strictEqual(diagnostics.length, 2);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(diagnostics[0].range.start.line, 2);
    assert.strictEqual(diagnostics[0].range.start.character, 11);
    assert.strictEqual(diagnostics[0].message, "expected module item: got 'endmodule'");
    assert.strictEqual(diagnostics[0].source, 'slang');
    assert.strictEqual(diagnostics[1].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(diagnostics[1].code, 'unused');
  });

  test('parses compile-unit diagnostics across multiple files', () => {
    const ownerPath = '/tmp/slang source/top file.sv';
    const childPath = '/tmp/slang source/child.sv';
    const stderr = [
      `${ownerPath}:3:12: error: top error`,
      `${childPath}:4:2: warning: child warning [-Wunused]`,
    ].join('\n');

    const diagnosticsByFile = parseSlangDiagnosticsByFile({
      stderr,
      documentPath: ownerPath,
      isWindows: false,
      useWSL: false,
    });

    assert.strictEqual(diagnosticsByFile.get(ownerPath)?.[0]?.message, 'top error');
    assert.strictEqual(diagnosticsByFile.get(childPath)?.[0]?.message, 'child warning');
  });

  test('resolves relative compile-unit diagnostics from cwd', () => {
    const ownerPath = '/tmp/slang source/top file.sv';
    const childPath = '/tmp/slang source/child.sv';
    const stderr = 'child.sv:1:7: error: expected semicolon';

    const diagnosticsByFile = parseSlangDiagnosticsByFile({
      stderr,
      documentPath: ownerPath,
      isWindows: false,
      useWSL: false,
      cwd: '/tmp/slang source',
    });

    assert.strictEqual(diagnosticsByFile.get(childPath)?.[0]?.message, 'expected semicolon');
  });

  test('does not import child_process or call child exec', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'src', 'linter', 'SlangLinter.ts'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'SlangLinter must not import child_process');
    assert.ok(!source.includes('child.exec'), 'SlangLinter must not call child_process.exec');
    assert.ok(!source.includes('exec(command'), 'SlangLinter must not call exec(command)');
  });

  test('reports diagnostics for syntax errors with installed slang', async function () {
    this.timeout(10000);
    const slangPath = which.sync('slang', { nothrow: true });
    if (!slangPath) {
      this.skip();
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'slang-test-'));
    const tempFilePath = createTempSvFile(tempRoot, 'bad.sv', 'module bad\nendmodule\n');
    const diagnostics = vscode.languages.createDiagnosticCollection('slang-test');

    try {
      await withSlangConfig(slangPath, {}, async () => {
        const linter = new SlangLinter(
          new LinterDiagnosticManager(diagnostics),
          new LintRunManager()
        );
        const document = await vscode.workspace.openTextDocument(tempFilePath);

        await linter.startLint(document);
        const results = await waitForDiagnostics(diagnostics, document.uri, 4000);

        assert.ok(
          results.some(
            (diag) => diag.source === 'slang' && diag.severity === vscode.DiagnosticSeverity.Error
          ),
          `Expected a slang syntax error diagnostic\n${formatDiagnosticsDump(
            diagnostics,
            document.uri
          )}`
        );
      });
    } finally {
      diagnostics.dispose();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('handles diagnostics for files with spaces in paths with installed slang', async function () {
    this.timeout(10000);
    const slangPath = which.sync('slang', { nothrow: true });
    if (!slangPath) {
      this.skip();
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'slang space-test-'));
    const tempFilePath = createTempSvFile(tempRoot, 'bad file.sv', 'module bad\nendmodule\n');
    const diagnostics = vscode.languages.createDiagnosticCollection('slang-space-test');

    try {
      await withSlangConfig(slangPath, {}, async () => {
        const linter = new SlangLinter(
          new LinterDiagnosticManager(diagnostics),
          new LintRunManager()
        );
        const document = await vscode.workspace.openTextDocument(tempFilePath);

        await linter.startLint(document);
        const results = await waitForDiagnostics(diagnostics, document.uri, 4000);

        assert.ok(
          results.some(
            (diag) => diag.source === 'slang' && diag.severity === vscode.DiagnosticSeverity.Error
          ),
          `Expected a slang diagnostic for a file with spaces\n${formatDiagnosticsDump(
            diagnostics,
            document.uri
          )}`
        );
      });
    } finally {
      diagnostics.dispose();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

});
