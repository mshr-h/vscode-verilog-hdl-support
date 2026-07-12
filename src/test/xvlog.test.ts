// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import XvlogLinter, {
  buildXvlogArgs,
  parseXvlogDiagnostics,
  resolveXvlogArgumentPaths,
} from '../linter/XvlogLinter';
import LinterDiagnosticManager, {
  type DiagnosticSink,
} from '../linter/LinterDiagnosticManager';
import LintRunManager from '../linter/LintRunManager';
import { assertSameFsPath, getRepositoryRoot, sameFsPath } from './pathTestUtils';

class FakeDiagnosticSink implements DiagnosticSink {
  readonly diagnostics = new Map<string, readonly vscode.Diagnostic[]>();

  set(uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]): void {
    this.diagnostics.set(uri.toString(), diagnostics);
  }

  delete(uri: vscode.Uri): void {
    this.diagnostics.delete(uri.toString());
  }

  clear(): void {
    this.diagnostics.clear();
  }

  dispose(): void {
    // no-op
  }
}

class TestXvlogLinter extends XvlogLinter {
  configure(installedPath: string, customArguments: string, includePath: string[] = []): void {
    this.config = {
      linterInstalledPath: installedPath,
      arguments: customArguments,
      includePath,
      runAtFileLocation: false,
    };
  }
}

interface XvlogRecord {
  cwd: string;
  args: string[];
  invocation: number;
}

suite('Xvlog Linter', () => {
  test('builds args with automatic flags and split custom args', () => {
    const includePath = path.join(os.tmpdir(), 'xvlog include');
    const documentPath = path.join(os.tmpdir(), 'xvlog source', 'top file.sv');
    const args = buildXvlogArgs({
      languageId: 'systemverilog',
      includePaths: [includePath],
      customArguments: '--define FOO="bar baz"',
      documentPath,
    });

    assert.deepStrictEqual(args, [
      '-nolog',
      '-sv',
      '-i',
      includePath,
      '--define',
      'FOO=bar baz',
      documentPath,
    ]);
    assert.ok(!args.some((arg) => arg.includes('"')), 'Args must not contain manual quotes');
  });

  test('resolves relative filelist and project arguments before changing cwd', () => {
    const baseDir = path.join(os.tmpdir(), 'xvlog workspace');
    assert.deepStrictEqual(
      resolveXvlogArgumentPaths(
        [
          '-f',
          'lists/files.f',
          '--file=lists/other.f',
          '-prj',
          'projects/top.prj',
          '--prj=projects/other.prj',
          '--define',
          'FILE=relative.f',
        ],
        baseDir
      ),
      [
        '-f',
        path.resolve(baseDir, 'lists/files.f'),
        `--file=${path.resolve(baseDir, 'lists/other.f')}`,
        '-prj',
        path.resolve(baseDir, 'projects/top.prj'),
        `--prj=${path.resolve(baseDir, 'projects/other.prj')}`,
        '--define',
        'FILE=relative.f',
      ]
    );
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

  test('isolates fake xvlog artifacts and preserves syntax diagnostics', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xvlog workspace with spaces-'));
    const harness = createHarness();
    try {
      const fakeBin = installFakeXvlog(root);
      const sourcePath = path.join(root, 'top file.sv');
      const includePath = path.join(root, 'include dir');
      const filelistPath = path.join(root, 'lists', 'files with spaces.f');
      const projectPath = path.join(root, 'lists', 'project with spaces.prj');
      const recordPath = path.join(root, 'record.json');
      fs.mkdirSync(includePath);
      fs.mkdirSync(path.dirname(filelistPath));
      fs.writeFileSync(sourcePath, 'module top; endmodule\n');
      fs.writeFileSync(filelistPath, 'top file.sv\n');
      fs.writeFileSync(projectPath, 'sv work "top file.sv"\n');

      harness.linter.configure(
        fakeBin,
        [
          '-f',
          quoteArgument(path.relative(root, filelistPath)),
          '-prj',
          quoteArgument(path.relative(root, projectPath)),
          '--fake-record',
          quoteArgument(recordPath),
          '--fake-mode',
          'success',
        ].join(' '),
        [path.relative(root, includePath)]
      );
      const doc = documentFor(sourcePath);
      await harness.linter.startLint(doc);

      const record = readRecord(recordPath);
      assert.ok(!sameFsPath(record.cwd, root), 'xvlog cwd must not be the workspace');
      assert.ok(!fs.existsSync(record.cwd), 'per-run temporary directory must be removed');
      assert.ok(!fs.existsSync(path.join(root, 'xsim.dir')));
      assert.ok(!fs.existsSync(path.join(root, 'xvlog.pb')));
      assert.ok(!record.args.includes('-work'));
      assertSameFsPath(valueAfter(record.args, '-i'), includePath);
      assertSameFsPath(valueAfter(record.args, '-f'), filelistPath);
      assertSameFsPath(valueAfter(record.args, '-prj'), projectPath);
      assertSameFsPath(record.args.at(-1), sourcePath);

      const diagnostics = harness.sink.diagnostics.get(doc.uri.toString()) ?? [];
      assert.strictEqual(diagnostics.length, 1);
      assert.strictEqual(diagnostics[0].source, 'xvlog');
      assert.ok(diagnostics[0].message.includes('syntax error'));
    } finally {
      harness.linter.dispose();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('surfaces a nonzero fake xvlog failure', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xvlog failure workspace-'));
    const harness = createHarness();
    try {
      const fakeBin = installFakeXvlog(root);
      const sourcePath = path.join(root, 'top.v');
      const recordPath = path.join(root, 'failure-record.json');
      fs.writeFileSync(sourcePath, 'module top; endmodule\n');
      harness.linter.configure(
        fakeBin,
        `--fake-record ${quoteArgument(recordPath)} --fake-mode failure`
      );
      const doc = documentFor(sourcePath, 'verilog');
      await harness.linter.startLint(doc);

      const record = readRecord(recordPath);
      assert.ok(!fs.existsSync(record.cwd));
      assert.ok(!fs.existsSync(path.join(root, 'xsim.dir')));
      assert.ok(!fs.existsSync(path.join(root, 'xvlog.pb')));

      const diagnostics = harness.sink.diagnostics.get(doc.uri.toString()) ?? [];
      assert.strictEqual(diagnostics.length, 1);
      assert.ok(diagnostics[0].message.includes('exit code 7'));
      assert.ok(diagnostics[0].message.includes('fake xvlog compiler failure'));
    } finally {
      harness.linter.dispose();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('cancels stale runs without sharing or leaking temporary directories', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xvlog repeated workspace-'));
    const harness = createHarness();
    try {
      const fakeBin = installFakeXvlog(root);
      const sourcePath = path.join(root, 'top repeated.sv');
      const recordDir = path.join(root, 'records');
      const counterPath = path.join(root, 'counter.txt');
      const startedPath = path.join(root, 'started.txt');
      fs.writeFileSync(sourcePath, 'module top; endmodule\n');
      fs.mkdirSync(recordDir);
      harness.linter.configure(
        fakeBin,
        [
          '--fake-record-dir',
          quoteArgument(recordDir),
          '--fake-counter',
          quoteArgument(counterPath),
          '--fake-started',
          quoteArgument(startedPath),
          '--fake-sequence',
          'cancel-first',
        ].join(' ')
      );
      const doc = documentFor(sourcePath);

      const firstRun = harness.linter.startLint(doc);
      await waitForFile(startedPath);
      const secondRun = harness.linter.startLint(doc);
      await Promise.all([firstRun, secondRun]);

      const firstRecord = readRecord(path.join(recordDir, '1.json'));
      const secondRecord = readRecord(path.join(recordDir, '2.json'));
      assert.ok(!sameFsPath(firstRecord.cwd, secondRecord.cwd));
      assert.ok(!fs.existsSync(firstRecord.cwd));
      assert.ok(!fs.existsSync(secondRecord.cwd));

      const diagnostics = harness.sink.diagnostics.get(doc.uri.toString()) ?? [];
      assert.strictEqual(diagnostics.length, 1);
      assert.ok(diagnostics[0].message.includes('new syntax error'));
      assert.ok(!diagnostics[0].message.includes('old syntax error'));
    } finally {
      harness.linter.dispose();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('does not import child_process or call child exec', () => {
    const source = fs.readFileSync(
      path.join(getRepositoryRoot(), 'src', 'linter', 'XvlogLinter.ts'),
      'utf8'
    );

    assert.ok(!source.includes('child_process'), 'XvlogLinter must not import child_process');
    assert.ok(!source.includes('child.exec'), 'XvlogLinter must not call child_process.exec');
    assert.ok(!source.includes('exec(command'), 'XvlogLinter must not call exec(command)');
  });
});

function createHarness(): {
  sink: FakeDiagnosticSink;
  linter: TestXvlogLinter;
} {
  const sink = new FakeDiagnosticSink();
  const linter = new TestXvlogLinter(
    new LinterDiagnosticManager(sink),
    new LintRunManager()
  );
  return { sink, linter };
}

function documentFor(filePath: string, languageId = 'systemverilog'): vscode.TextDocument {
  return {
    uri: vscode.Uri.file(filePath),
    fileName: filePath,
    languageId,
  } as vscode.TextDocument;
}

function installFakeXvlog(root: string): string {
  const fakeBin = path.join(root, 'fake xvlog bin');
  const fixturePath = path.join(
    getRepositoryRoot(),
    'test',
    'fixtures',
    'fake-xvlog.js'
  );
  fs.mkdirSync(fakeBin);
  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(fakeBin, 'xvlog.cmd'),
      `@echo off\r\n"${process.execPath}" "${fixturePath}" %*\r\n`
    );
  } else {
    const executablePath = path.join(fakeBin, 'xvlog');
    fs.copyFileSync(fixturePath, executablePath);
    fs.chmodSync(executablePath, 0o755);
  }
  return fakeBin;
}

function quoteArgument(argument: string): string {
  return `"${argument.replace(/\\/g, '/').replace(/"/g, '\\"')}"`;
}

function readRecord(recordPath: string): XvlogRecord {
  return JSON.parse(fs.readFileSync(recordPath, 'utf8')) as XvlogRecord;
}

function valueAfter(args: string[], option: string): string | undefined {
  const index = args.indexOf(option);
  return index === -1 ? undefined : args[index + 1];
}

async function waitForFile(filePath: string): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!fs.existsSync(filePath)) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${filePath}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
