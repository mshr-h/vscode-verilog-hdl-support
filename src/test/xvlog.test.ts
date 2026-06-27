// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import XvlogLinter, {
  buildXvlogArgs,
  hasXvlogWorkArgument,
  parseXvlogDiagnostics,
} from '../linter/XvlogLinter';
import LinterDiagnosticManager from '../linter/LinterDiagnosticManager';
import LintRunManager from '../linter/LintRunManager';

interface XvlogCleanupInternals {
  cleanupTempDir(tempDir: string): void;
  dispose(): void;
}

suite('Xvlog Linter', () => {
  test('builds args with automatic flags and split custom args', () => {
    const includePath = path.join(os.tmpdir(), 'xvlog include');
    const projectIncludePath = path.join(os.tmpdir(), 'xvlog project include');
    const documentPath = path.join(os.tmpdir(), 'xvlog source', 'top file.sv');
    const workLibrary = `work=${path.join(os.tmpdir(), 'xvlog work', 'work')}`;
    const args = buildXvlogArgs({
      languageId: 'systemverilog',
      includePaths: [includePath, projectIncludePath],
      defineArgs: ['SIM', 'WIDTH=32'],
      customArguments: '--define FOO="bar baz"',
      documentPath,
      workLibrary,
    });

    assert.deepStrictEqual(args, [
      '-nolog',
      '-sv',
      '-i',
      includePath,
      '-i',
      projectIncludePath,
      '--define',
      'SIM',
      '--define',
      'WIDTH=32',
      '-work',
      workLibrary,
      '--define',
      'FOO=bar baz',
      documentPath,
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('builds args without work library when not provided', () => {
    const documentPath = path.join(os.tmpdir(), 'top.v');
    const args = buildXvlogArgs({
      languageId: 'verilog',
      includePaths: [],
      customArguments: '-Wall',
      documentPath,
    });

    assert.deepStrictEqual(args, [
      '-nolog',
      '-Wall',
      documentPath,
    ]);
  });

  test('preserves user-provided work library arguments when managed work library is omitted', () => {
    const documentPath = path.join(os.tmpdir(), 'top.v');
    const customWorkLibrary = `work=${path.join(os.tmpdir(), 'user-xvlog-work')}`;
    const args = buildXvlogArgs({
      languageId: 'verilog',
      includePaths: [],
      customArguments: `-work ${customWorkLibrary}`,
      documentPath,
    });

    assert.deepStrictEqual(args, [
      '-nolog',
      '-work',
      customWorkLibrary,
      documentPath,
    ]);
  });

  test('places work library before custom arguments and document path', () => {
    const workLibrary = `work=${path.join(os.tmpdir(), 'xvlog-work')}`;
    const documentPath = path.join(os.tmpdir(), 'top.v');
    const args = buildXvlogArgs({
      languageId: 'verilog',
      includePaths: [],
      customArguments: '-f files.f',
      documentPath,
      workLibrary,
    });

    assert.strictEqual(args.indexOf('-work') + 1, args.indexOf(workLibrary));
    assert.ok(args.indexOf(workLibrary) < args.indexOf('-f'));
    assert.ok(args.indexOf(workLibrary) < args.indexOf(documentPath));
  });

  test('detects user-managed work library arguments', () => {
    assert.strictEqual(hasXvlogWorkArgument('-work work=/tmp/user-work'), true);
    assert.strictEqual(hasXvlogWorkArgument('--work work=/tmp/user-work'), true);
    assert.strictEqual(hasXvlogWorkArgument('-work=work=/tmp/user-work'), true);
    assert.strictEqual(hasXvlogWorkArgument('--work=work=/tmp/user-work'), true);
    assert.strictEqual(hasXvlogWorkArgument('--define WORK="-work"'), false);
    assert.strictEqual(hasXvlogWorkArgument('--workaround enabled'), false);
  });

  test('parses diagnostics with paths containing spaces', () => {
    const stdout = [
      'ERROR: [VRFC 10-123] syntax error near module: detail [/tmp/xvlog source/top file.sv:5]',
      'WARNING: [VRFC 10-456] signal is unused [C:/xvlog source/top file.sv:7]',
    ].join('\n');
    const diagnostics = parseXvlogDiagnostics(stdout);

    assert.strictEqual(diagnostics.length, 2);
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(diagnostics[0].code, 'VRFC 10-123');
    assert.strictEqual(
      diagnostics[0].message,
      '[VRFC 10-123] syntax error near module: detail'
    );
    assert.strictEqual(diagnostics[0].range.start.line, 4);
    assert.strictEqual(diagnostics[0].source, 'xvlog');
    assert.strictEqual(diagnostics[1].severity, vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(diagnostics[1].range.start.line, 6);
  });

  test('does not import child_process or call child exec', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'src', 'linter', 'XvlogLinter.ts'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'XvlogLinter must not import child_process');
    assert.ok(!source.includes('child.exec'), 'XvlogLinter must not call child_process.exec');
    assert.ok(!source.includes('exec(command'), 'XvlogLinter must not call exec(command)');
  });

  test('cleans xvlog temp directory best-effort', () => {
    const linter = createXvlogLinterInternals();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xvlog-temp-cleanup-'));
    try {
      const workDir = path.join(tempRoot, 'work');
      fs.mkdirSync(workDir);

      linter.cleanupTempDir(tempRoot);

      assert.ok(!fs.existsSync(tempRoot));
      assert.doesNotThrow(() => linter.cleanupTempDir(String.fromCharCode(0)));
    } finally {
      linter.dispose();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

function createXvlogLinterInternals(): XvlogCleanupInternals {
  const diagnosticManager = new LinterDiagnosticManager({
    set() {},
    delete() {},
    clear() {},
    dispose() {},
  });
  return new XvlogLinter(diagnosticManager, new LintRunManager()) as unknown as XvlogCleanupInternals;
}
