// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  buildToolInvocation,
  buildWindowsBatchInvocation,
  isWindowsBatchFile,
  resolveWindowsCommand,
  runTool,
  ToolRunError,
} from '../tools/ToolRunner';

const nodeCommand = process.execPath;

suite('ToolRunner', () => {
  test('resolves Windows command from PATH using PATHEXT', () => {
    const env = {
      PATH: 'C:\\Vivado\\bin;C:\\Other\\bin',
      PATHEXT: '.EXE;.CMD;.BAT',
    };
    const resolved = resolveWindowsCommand('xvlog', {
      env,
      existsSync: (candidate) => candidate === 'C:\\Vivado\\bin\\xvlog.CMD',
    });

    assert.strictEqual(resolved, 'C:\\Vivado\\bin\\xvlog.CMD');
  });

  test('resolves Windows path command using PATHEXT in the same directory', () => {
    const resolved = resolveWindowsCommand('C:\\Vivado\\bin\\xvlog', {
      env: { PATHEXT: '.EXE;.CMD;.BAT' },
      existsSync: (candidate) => candidate === 'C:\\Vivado\\bin\\xvlog.BAT',
    });

    assert.strictEqual(resolved, 'C:\\Vivado\\bin\\xvlog.BAT');
  });

  test('prefers Windows PATHEXT matches over extensionless files on PATH', () => {
    const env = {
      PATH: 'C:\\Vivado\\bin',
      PATHEXT: '.EXE;.CMD;.BAT',
    };
    const existingFiles = new Set(['C:\\Vivado\\bin\\xvlog', 'C:\\Vivado\\bin\\xvlog.BAT']);
    const resolved = resolveWindowsCommand('xvlog', {
      env,
      existsSync: (candidate) => existingFiles.has(candidate),
    });

    assert.strictEqual(resolved, 'C:\\Vivado\\bin\\xvlog.BAT');
  });

  test('prefers Windows PATHEXT matches over extensionless files for path commands', () => {
    const existingFiles = new Set(['C:\\Vivado\\bin\\xvlog', 'C:\\Vivado\\bin\\xvlog.BAT']);
    const resolved = resolveWindowsCommand('C:\\Vivado\\bin\\xvlog', {
      env: { PATHEXT: '.EXE;.CMD;.BAT' },
      existsSync: (candidate) => existingFiles.has(candidate),
    });

    assert.strictEqual(resolved, 'C:\\Vivado\\bin\\xvlog.BAT');
  });

  test('falls back to extensionless Windows command when no PATHEXT match exists', () => {
    const resolved = resolveWindowsCommand('xvlog', {
      env: {
        PATH: 'C:\\Vivado\\bin',
        PATHEXT: '.EXE;.CMD;.BAT',
      },
      existsSync: (candidate) => candidate === 'C:\\Vivado\\bin\\xvlog',
    });

    assert.strictEqual(resolved, 'C:\\Vivado\\bin\\xvlog');
  });

  test('uses cmd.exe invocation only for Windows batch files', () => {
    assert.strictEqual(isWindowsBatchFile('C:\\Vivado\\bin\\xvlog.cmd'), true);
    assert.strictEqual(isWindowsBatchFile('C:\\Vivado\\bin\\xvlog.bat'), true);
    assert.strictEqual(isWindowsBatchFile('C:\\Vivado\\bin\\xvlog.exe'), false);

    const batchInvocation = buildWindowsBatchInvocation('C:\\Vivado\\bin\\xvlog.cmd', [
      '-i',
      'C:\\source dir',
    ]);
    assert.strictEqual(batchInvocation.command, 'cmd.exe');
    assert.deepStrictEqual(batchInvocation.args, [
      '/d',
      '/s',
      '/c',
      'call',
      'C:\\Vivado\\bin\\xvlog.cmd',
      '-i',
      'C:\\source dir',
    ]);
  });

  test('keeps Windows exe invocation as a direct spawn', () => {
    const invocation = buildToolInvocation(
      'xvlog',
      ['--version'],
      {
        PATH: 'C:\\Vivado\\bin',
        PATHEXT: '.EXE;.CMD;.BAT',
      },
      'win32',
      (candidate) => candidate === 'C:\\Vivado\\bin\\xvlog.EXE'
    );

    assert.strictEqual(invocation.command, 'C:\\Vivado\\bin\\xvlog.EXE');
    assert.deepStrictEqual(invocation.args, ['--version']);
  });

  test('wraps resolved Windows batch command in cmd.exe', () => {
    const invocation = buildToolInvocation(
      'xvlog',
      ['-i', 'C:\\source dir'],
      {
        PATH: 'C:\\Vivado\\bin',
        PATHEXT: '.EXE;.CMD;.BAT',
      },
      'win32',
      (candidate) => candidate === 'C:\\Vivado\\bin\\xvlog.BAT'
    );

    assert.strictEqual(invocation.command, 'cmd.exe');
    assert.deepStrictEqual(invocation.args, [
      '/d',
      '/s',
      '/c',
      'call',
      'C:\\Vivado\\bin\\xvlog.BAT',
      '-i',
      'C:\\source dir',
    ]);
  });

  test('handles stdout larger than child_process.exec maxBuffer', async () => {
    const lineCount = 75000;
    const script = [
      `const lineCount = ${lineCount};`,
      'for (let i = 0; i < lineCount; i++) {',
      "  process.stdout.write(`tag_${i.toString().padStart(6, '0')}_abcdefghijklmnop\\n`);",
      '}',
    ].join('\n');

    let callbackLineCount = 0;
    const result = await runTool({
      command: nodeCommand,
      args: ['-e', script],
      collectStdout: true,
      onStdoutLine: () => {
        callbackLineCount++;
      },
    });

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.length > 1024 * 1024, 'Expected stdout larger than 1 MiB');
    assert.strictEqual(callbackLineCount, lineCount);
  });

  test('splits stdout lines across chunks and flushes final partial line', async () => {
    const script = [
      "process.stdout.write('alpha\\r');",
      "setTimeout(() => process.stdout.write('\\nbeta\\r\\n'), 5);",
      "setTimeout(() => process.stdout.write('gamma'), 10);",
    ].join('\n');

    const lines: string[] = [];
    const result = await runTool({
      command: nodeCommand,
      args: ['-e', script],
      onStdoutLine: (line) => {
        lines.push(line);
      },
    });

    assert.strictEqual(result.exitCode, 0);
    assert.deepStrictEqual(lines, ['alpha', 'beta', 'gamma']);
  });

  test('splits stderr lines using the same buffering behavior', async () => {
    const script = [
      "process.stderr.write('warn-one\\r');",
      "setTimeout(() => process.stderr.write('\\nwarn-two'), 5);",
    ].join('\n');

    const lines: string[] = [];
    const result = await runTool({
      command: nodeCommand,
      args: ['-e', script],
      onStderrLine: (line) => {
        lines.push(line);
      },
    });

    assert.strictEqual(result.exitCode, 0);
    assert.deepStrictEqual(lines, ['warn-one', 'warn-two']);
  });

  test('rejects before spawn when cancellation is already requested', async () => {
    const tokenSource = new vscode.CancellationTokenSource();
    tokenSource.cancel();

    await assert.rejects(
      runTool({
        command: nodeCommand,
        args: ['-e', "process.stdout.write('should not run')"],
        cancellationToken: tokenSource.token,
      }),
      (err: unknown) => err instanceof ToolRunError && err.reason === 'cancelled'
    );
  });

  test('cancels a running process promptly', async () => {
    const tokenSource = new vscode.CancellationTokenSource();
    const started = Date.now();
    const run = runTool({
      command: nodeCommand,
      args: ['-e', "setInterval(() => process.stdout.write('tick\\n'), 20);"],
      collectStdout: true,
      cancellationToken: tokenSource.token,
    });

    setTimeout(() => {
      tokenSource.cancel();
    }, 50);

    await assert.rejects(
      run,
      (err: unknown) => err instanceof ToolRunError && err.reason === 'cancelled'
    );
    assert.ok(Date.now() - started < 2000, 'Cancellation should finish promptly');
  });
});
