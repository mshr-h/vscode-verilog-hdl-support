// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { runTool, type ToolRunOptions, type ToolRunResult } from '../tools/ToolRunner';
import { convertFromWslPath, convertToWslPath } from '../tools/WslPathConverter';

function resultFor(options: ToolRunOptions, stdout: string, exitCode = 0, stderr = ''): ToolRunResult {
  return {
    exitCode,
    signal: null,
    stdout,
    stderr,
    command: options.command,
    args: options.args,
  };
}

suite('[windows] WslPathConverter', () => {
  test('convertToWslPath uses wslpath argv', async () => {
    const calls: ToolRunOptions[] = [];
    const fakeRunTool: typeof runTool = async (options) => {
      calls.push(options);
      return resultFor(options, '/mnt/c/workspace/top.sv\n');
    };

    const converted = await convertToWslPath('C:\\workspace\\top.sv', {
      runToolFn: fakeRunTool,
    });

    assert.strictEqual(converted, '/mnt/c/workspace/top.sv');
    assert.strictEqual(calls[0].command, 'wsl');
    assert.deepStrictEqual(calls[0].args, ['-e', 'wslpath', 'C:\\workspace\\top.sv']);
    assert.strictEqual(calls[0].timeoutMs, 5000);
    assert.strictEqual(calls[0].collectStdout, true);
    assert.strictEqual(calls[0].collectStderr, true);
  });

  test('convertFromWslPath uses wslpath -w argv', async () => {
    const calls: ToolRunOptions[] = [];
    const fakeRunTool: typeof runTool = async (options) => {
      calls.push(options);
      return resultFor(options, 'C:\\workspace\\top.sv\r\n');
    };

    const converted = await convertFromWslPath('/mnt/c/workspace/top.sv', {
      runToolFn: fakeRunTool,
    });

    assert.strictEqual(converted, 'C:\\workspace\\top.sv');
    assert.deepStrictEqual(calls[0].args, ['-e', 'wslpath', '-w', '/mnt/c/workspace/top.sv']);
  });

  test('passes spaces and single quotes as one argv element', async () => {
    const calls: ToolRunOptions[] = [];
    const inputPath = "C:\\workspace\\dir with space\\it's top.sv";
    const fakeRunTool: typeof runTool = async (options) => {
      calls.push(options);
      return resultFor(options, "/mnt/c/workspace/dir with space/it's top.sv\n");
    };

    await convertToWslPath(inputPath, { runToolFn: fakeRunTool });

    assert.deepStrictEqual(calls[0].args, ['-e', 'wslpath', inputPath]);
  });

  test('removes trailing CR/LF without trimming path characters', async () => {
    const fakeRunTool: typeof runTool = async (options) =>
      resultFor(options, '  /mnt/c/workspace/path with trailing spaces  \r\n\n');

    const converted = await convertToWslPath('C:\\workspace\\top.sv', {
      runToolFn: fakeRunTool,
    });

    assert.strictEqual(converted, '  /mnt/c/workspace/path with trailing spaces  ');
  });

  test('throws useful error on non-zero exit', async () => {
    const fakeRunTool: typeof runTool = async (options) =>
      resultFor(options, '', 1, 'wslpath: bad path');

    await assert.rejects(
      convertToWslPath('C:\\bad path\\top.sv', { runToolFn: fakeRunTool }),
      (err: unknown) =>
        err instanceof Error &&
        err.message.includes('wsl') &&
        err.message.includes('wslpath') &&
        err.message.includes('exitCode=1') &&
        err.message.includes('wslpath: bad path')
    );
  });

  test('forwards cancellation token, timeout, and custom wsl command', async () => {
    const tokenSource = new vscode.CancellationTokenSource();
    const calls: ToolRunOptions[] = [];
    const fakeRunTool: typeof runTool = async (options) => {
      calls.push(options);
      return resultFor(options, '/mnt/c/workspace/top.sv\n');
    };

    await convertToWslPath('C:\\workspace\\top.sv', {
      cancellationToken: tokenSource.token,
      timeoutMs: 1234,
      wslCommand: 'C:\\Windows\\System32\\wsl.exe',
      runToolFn: fakeRunTool,
    });

    assert.strictEqual(calls[0].cancellationToken, tokenSource.token);
    assert.strictEqual(calls[0].timeoutMs, 1234);
    assert.strictEqual(calls[0].command, 'C:\\Windows\\System32\\wsl.exe');
  });
});

suite('[windows-wsl2] WslPathConverter integration', () => {
  test('round-trips a Windows path through real wslpath', async function () {
    this.timeout(15000);

    if (process.platform !== 'win32') {
      this.skip();
      return;
    }
    if (process.env.VERILOGHDL_RUN_WSL2_TESTS !== '1') {
      this.skip();
      return;
    }

    const windowsPath = __filename;
    const wslPath = await convertToWslPath(windowsPath, { timeoutMs: 15000 });

    assert.match(wslPath, /^\/mnt\/[a-z]\//i);

    const roundTrip = await convertFromWslPath(wslPath, { timeoutMs: 15000 });

    assert.strictEqual(
      path.normalize(roundTrip).toLowerCase(),
      path.normalize(windowsPath).toLowerCase()
    );
  });
});
