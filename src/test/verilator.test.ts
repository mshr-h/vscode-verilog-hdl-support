// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import LinterDiagnosticManager from '../linter/LinterDiagnosticManager';
import LintRunManager from '../linter/LintRunManager';
import VerilatorLinter, {
  buildVerilatorArgs,
  buildVerilatorCommand,
  buildVerilatorRunInputs,
  convertDiagnosticPathsFromWsl,
  getVerilatorPaths,
  parseVerilatorDiagnostics,
} from '../linter/VerilatorLinter';

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
  test('builds non-Windows command and args without shell quoting', () => {
    const documentPath = '/tmp/verilator source/top file.sv';
    const docFolder = '/tmp/verilator source';
    const includePath = '/tmp/verilator include';
    const commandInfo = buildVerilatorCommand({
      isWindows: false,
      useWSL: false,
      linterInstalledPath: '/tools/bin',
    });
    const args = commandInfo.leadingArgs.concat(
      buildVerilatorArgs({
        languageId: 'systemverilog',
        docFolder,
        includePaths: [includePath],
        customArguments: '--timing --top-module "top mod"',
        documentPath,
      })
    );

    assert.strictEqual(commandInfo.command, '/tools/bin/verilator');
    assert.deepStrictEqual(args, [
      '-sv',
      '--lint-only',
      `-I${docFolder}`,
      `-I${includePath}`,
      '--timing',
      '--top-module',
      'top mod',
      documentPath,
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('builds Verilog args without SystemVerilog flag', () => {
    const args = buildVerilatorArgs({
      languageId: 'verilog',
      docFolder: '/tmp/rtl',
      includePaths: [],
      customArguments: '',
      documentPath: '/tmp/rtl/top.v',
    });

    assert.deepStrictEqual(args, ['--lint-only', '-I/tmp/rtl', '/tmp/rtl/top.v']);
  });

  test('[windows] builds Windows command and slash-normalized generated paths without WSL', () => {
    const commandInfo = buildVerilatorCommand({
      isWindows: true,
      useWSL: false,
      linterInstalledPath: 'C:\\tools',
    });
    const paths = getVerilatorPaths({
      documentPath: 'C:\\workspace\\rtl dir\\top file.sv',
      isWindows: true,
      useWSL: false,
      runAtFileLocation: true,
    });
    const args = commandInfo.leadingArgs.concat(
      buildVerilatorArgs({
        languageId: 'systemverilog',
        docFolder: paths.docFolder,
        includePaths: ['C:\\workspace\\include dir'],
        customArguments: '',
        documentPath: paths.docUri,
      })
    );

    assert.strictEqual(commandInfo.command, 'C:\\tools\\verilator_bin.exe');
    assert.strictEqual(paths.docUri, 'C:/workspace/rtl dir/top file.sv');
    assert.strictEqual(paths.docFolder, 'C:/workspace/rtl dir');
    assert.strictEqual(paths.cwd, 'C:/workspace/rtl dir');
    assert.deepStrictEqual(args, [
      '-sv',
      '--lint-only',
      '-IC:/workspace/rtl dir',
      '-IC:\\workspace\\include dir',
      'C:/workspace/rtl dir/top file.sv',
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('[windows] builds Windows WSL command with converted run input paths', async () => {
    const convertedInputs: string[] = [];
    const inputs = await buildVerilatorRunInputs({
      documentPath: 'C:\\workspace\\rtl\\top.sv',
      languageId: 'systemverilog',
      isWindows: true,
      useWSL: true,
      runAtFileLocation: true,
      linterInstalledPath: '',
      includePaths: ['C:\\workspace\\include dir'],
      customArguments: '--trace',
      convertToWslPathFn: async (inputPath, options) => {
        assert.strictEqual(options?.wslCommand, 'wsl');
        convertedInputs.push(inputPath);
        return inputPath.replace(/^C:\\/, '/mnt/c/').replace(/\\/g, '/');
      },
    });

    assert.strictEqual(inputs.command, 'wsl');
    assert.strictEqual(inputs.args[0], 'verilator');
    assert.strictEqual(inputs.cwd, 'C:/workspace/rtl');
    assert.deepStrictEqual(convertedInputs, [
      'C:\\workspace\\rtl\\top.sv',
      'C:\\workspace\\rtl',
      'C:\\workspace\\include dir',
    ]);
    assert.deepStrictEqual(inputs.args, [
      'verilator',
      '-sv',
      '--lint-only',
      '-I/mnt/c/workspace/rtl',
      '-I/mnt/c/workspace/include dir',
      '--trace',
      '/mnt/c/workspace/rtl/top.sv',
    ]);
    assert.ok(
      !inputs.args.some((arg) => arg.includes('C:\\workspace')),
      'WSL args must not contain raw Windows include paths'
    );
  });

  test('parses Verilator diagnostics for errors, warnings, paths, and colons', () => {
    const sourcePath = '/tmp/verilator space-test/top file.sv';
    const stderr = [
      `%Error-NEEDTIMINGOPT: ${sourcePath}:3:12: Use --timing or --no-timing to specify how delays should be handled: more detail`,
      '%Warning-WIDTH: /tmp/rtl/warn.v:7:5: Operator expects 8 bits on the LHS, but RHS generates 1 bit',
      '                : ... note line',
    ].join('\n');
    const diagnostics = parseVerilatorDiagnostics({
      stderr,
      isWindows: false,
      useWSL: false,
    });

    const sourceDiagnostics = diagnostics.get(sourcePath) ?? [];
    const warningDiagnostics = diagnostics.get('/tmp/rtl/warn.v') ?? [];

    assert.strictEqual(sourceDiagnostics.length, 1);
    assert.strictEqual(sourceDiagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(sourceDiagnostics[0].code, 'NEEDTIMINGOPT');
    assert.strictEqual(sourceDiagnostics[0].range.start.line, 2);
    assert.strictEqual(sourceDiagnostics[0].range.start.character, 11);
    assert.strictEqual(
      sourceDiagnostics[0].message,
      'Use --timing or --no-timing to specify how delays should be handled: more detail'
    );
    assert.strictEqual(sourceDiagnostics[0].source, 'verilator');

    assert.strictEqual(warningDiagnostics.length, 1);
    assert.strictEqual(warningDiagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(warningDiagnostics[0].code, 'WIDTH');
  });

  test('[windows] converts WSL diagnostic paths back to Windows paths', async () => {
    const diagnostics = parseVerilatorDiagnostics({
      stderr: '%Error: /mnt/c/workspace/rtl/top.sv:4:2: syntax error, unexpected endmodule',
      isWindows: true,
      useWSL: true,
    });
    const convertedDiagnostics = await convertDiagnosticPathsFromWsl(diagnostics, {
      convertFromWslPathFn: async (inputPath) =>
        inputPath.replace(/^\/mnt\/c\//, 'C:/').replace(/\//g, '\\'),
    });

    const windowsPath = 'C:\\workspace\\rtl\\top.sv';
    const sourceDiagnostics = convertedDiagnostics.get(windowsPath) ?? [];
    assert.strictEqual(sourceDiagnostics.length, 1);
    assert.strictEqual(sourceDiagnostics[0].source, 'verilator');
    assert.strictEqual(sourceDiagnostics[0].range.start.line, 3);
    assert.strictEqual(sourceDiagnostics[0].range.start.character, 1);
  });

  test('[windows] converts each unique WSL diagnostic path once and merges converted paths', async () => {
    const firstDiagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'first',
      vscode.DiagnosticSeverity.Error
    );
    const secondDiagnostic = new vscode.Diagnostic(
      new vscode.Range(1, 0, 1, 1),
      'second',
      vscode.DiagnosticSeverity.Warning
    );
    const thirdDiagnostic = new vscode.Diagnostic(
      new vscode.Range(2, 0, 2, 1),
      'third',
      vscode.DiagnosticSeverity.Error
    );
    const diagnostics = new Map<string, vscode.Diagnostic[]>([
      ['/mnt/c/workspace/rtl/top.sv', [firstDiagnostic, secondDiagnostic]],
      ['/home/user/link/top.sv', [thirdDiagnostic]],
    ]);
    const convertedCalls: string[] = [];

    const convertedDiagnostics = await convertDiagnosticPathsFromWsl(diagnostics, {
      convertFromWslPathFn: async (inputPath) => {
        convertedCalls.push(inputPath);
        return 'C:\\workspace\\rtl\\top.sv';
      },
    });

    assert.deepStrictEqual(convertedCalls, ['/mnt/c/workspace/rtl/top.sv', '/home/user/link/top.sv']);
    assert.deepStrictEqual(convertedDiagnostics.get('C:\\workspace\\rtl\\top.sv'), [
      firstDiagnostic,
      secondDiagnostic,
      thirdDiagnostic,
    ]);
  });

  test('compiled BaseLinter does not import child_process or call exec', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'linter', 'BaseLinter.js'), 'utf8');

    assert.ok(!source.includes('child_process'), 'BaseLinter must not import child_process');
    assert.ok(!source.includes('execSync'), 'BaseLinter must not call execSync');
    assert.ok(!source.includes('child.exec'), 'BaseLinter must not call child_process.exec');
  });

  test('does not import child_process or call exec in VerilatorLinter', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'linter', 'VerilatorLinter.js'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'VerilatorLinter must not import child_process');
    assert.ok(!source.includes('child.exec'), 'VerilatorLinter must not call child_process.exec');
  });

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
        const linter = new VerilatorLinter(
          new LinterDiagnosticManager(diagnostics),
          new LintRunManager()
        );
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
        const linter = new VerilatorLinter(
          new LinterDiagnosticManager(diagnostics),
          new LintRunManager()
        );
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
        const linter = new VerilatorLinter(
          new LinterDiagnosticManager(diagnostics),
          new LintRunManager()
        );
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
        const linter = new VerilatorLinter(
          new LinterDiagnosticManager(diagnostics),
          new LintRunManager()
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
            new LinterDiagnosticManager(diagnostics),
            new LintRunManager()
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

  test('[windows-wsl2] reports diagnostics using Verilator under WSL2', async function () {
    this.timeout(20000);

    if (process.platform !== 'win32') {
      this.skip();
      return;
    }
    if (process.env.VERILOGHDL_RUN_WSL2_TESTS !== '1') {
      this.skip();
      return;
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verilator wsl2-test-'));
    const tempFilePath = createTempSvFile(tempRoot, 'bad file.sv', 'module m\nendmodule\n');
    const diagnostics = vscode.languages.createDiagnosticCollection('verilator-wsl2-test');

    try {
      await withVerilatorConfig('wsl', { useWSL: true }, async () => {
        const linter = new VerilatorLinter(
          new LinterDiagnosticManager(diagnostics),
          new LintRunManager()
        );
        const document = await vscode.workspace.openTextDocument(tempFilePath);

        linter.startLint(document);
        const results = await waitForDiagnostics(diagnostics, document.uri, 10000);

        assert.ok(
          results.some(
            (diag) =>
              diag.source === 'verilator' && diag.severity === vscode.DiagnosticSeverity.Error
          ),
          'Expected a Verilator syntax error diagnostic from WSL2'
        );
      });
    } finally {
      diagnostics.dispose();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
