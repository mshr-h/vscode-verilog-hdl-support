// SPDX-License-Identifier: MIT
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import type * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';

export interface ToolRunOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  collectStdout?: boolean;
  collectStderr?: boolean;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
  onStdoutChunk?: (chunk: string) => void;
  onStderrChunk?: (chunk: string) => void;
  cancellationToken?: vscode.CancellationToken;
}

export interface ToolRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  command: string;
  args: string[];
}

export class ToolRunError extends Error {
  readonly command: string;
  readonly args: string[];
  readonly reason: 'spawn' | 'timeout' | 'cancelled';
  readonly cause?: unknown;

  constructor(
    message: string,
    command: string,
    args: string[],
    reason: 'spawn' | 'timeout' | 'cancelled',
    cause?: unknown
  ) {
    super(message);
    this.name = 'ToolRunError';
    this.command = command;
    this.args = args;
    this.reason = reason;
    this.cause = cause;
  }
}

const logger = getExtensionLogger('ToolRunner');

class LineBuffer {
  private buffer = '';
  private readonly onLine?: (line: string) => void;

  constructor(onLine?: (line: string) => void) {
    this.onLine = onLine;
  }

  push(chunk: string): void {
    this.buffer += chunk;
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.stripCarriageReturn(this.buffer.slice(0, newlineIndex));
      this.onLine?.(line);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  flush(): void {
    if (this.buffer !== '') {
      this.onLine?.(this.stripCarriageReturn(this.buffer));
      this.buffer = '';
    }
  }

  private stripCarriageReturn(line: string): string {
    return line.endsWith('\r') ? line.slice(0, -1) : line;
  }
}

export function runTool(options: ToolRunOptions): Promise<ToolRunResult> {
  const {
    command,
    args,
    cwd,
    env,
    timeoutMs,
    collectStdout,
    collectStderr,
    onStdoutLine,
    onStderrLine,
    onStdoutChunk,
    onStderrChunk,
    cancellationToken,
  } = options;

  logger.info`Executing tool: ${command} ${args.join(' ')}`;

  if (cancellationToken?.isCancellationRequested) {
    logger.warn`Tool run cancelled before start: ${command}`;
    return Promise.reject(new ToolRunError('Tool run cancelled', command, args, 'cancelled'));
  }

  return new Promise<ToolRunResult>((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    let settled = false;
    let stdout = '';
    let stderr = '';
    let timeout: NodeJS.Timeout | undefined;
    let cancellationSubscription: vscode.Disposable | undefined;
    const stdoutLineBuffer = new LineBuffer(onStdoutLine);
    const stderrLineBuffer = new LineBuffer(onStderrLine);

    const cleanup = (): void => {
      if (timeout) {
        clearTimeout(timeout);
      }
      cancellationSubscription?.dispose();
    };

    const killAndReject = (reason: 'timeout' | 'cancelled', message: string): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      child.kill();
      logger.warn`${message}: ${command}`;
      reject(new ToolRunError(message, command, args, reason));
    };

    try {
      child = spawn(command, args, { cwd, env });
    } catch (err) {
      settled = true;
      cleanup();
      logger.error`Failed to spawn tool ${command}: ${err}`;
      reject(new ToolRunError(`Failed to spawn tool: ${command}`, command, args, 'spawn', err));
      return;
    }

    if (timeoutMs !== undefined && timeoutMs > 0) {
      timeout = setTimeout(() => {
        killAndReject('timeout', `Tool timed out after ${timeoutMs}ms`);
      }, timeoutMs);
    }

    if (cancellationToken) {
      if (cancellationToken.isCancellationRequested) {
        killAndReject('cancelled', 'Tool run cancelled');
        return;
      }
      cancellationSubscription = cancellationToken.onCancellationRequested(() => {
        killAndReject('cancelled', 'Tool run cancelled');
      });
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      if (collectStdout) {
        stdout += chunk;
      }
      onStdoutChunk?.(chunk);
      stdoutLineBuffer.push(chunk);
    });

    child.stderr.on('data', (chunk: string) => {
      if (collectStderr) {
        stderr += chunk;
      }
      onStderrChunk?.(chunk);
      stderrLineBuffer.push(chunk);
    });

    child.on('error', (err) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      logger.error`Tool failed to start ${command}: ${err}`;
      reject(new ToolRunError(`Failed to start tool: ${command}`, command, args, 'spawn', err));
    });

    child.on('close', (exitCode, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      stdoutLineBuffer.flush();
      stderrLineBuffer.flush();
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        command,
        args,
      });
    });
  });
}
