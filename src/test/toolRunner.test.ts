// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { runTool, ToolRunError } from '../tools/ToolRunner';

const nodeCommand = process.execPath;

suite('ToolRunner', () => {
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
