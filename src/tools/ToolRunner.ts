// SPDX-License-Identifier: MIT
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
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
const defaultWindowsPathExt = ['.COM', '.EXE', '.BAT', '.CMD'];

interface WindowsCommandResolutionOptions {
  env?: NodeJS.ProcessEnv;
  existsSync?: (candidate: string) => boolean;
}

export interface ToolInvocation {
  command: string;
  args: string[];
}

function getEnvValue(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const exact = env[key];
  if (exact !== undefined) {
    return exact;
  }
  const lowerKey = key.toLowerCase();
  const matchedKey = Object.keys(env).find((envKey) => envKey.toLowerCase() === lowerKey);
  return matchedKey === undefined ? undefined : env[matchedKey];
}

function getWindowsPathExt(env: NodeJS.ProcessEnv): string[] {
  const pathext = getEnvValue(env, 'PATHEXT');
  if (!pathext) {
    return defaultWindowsPathExt;
  }
  return pathext
    .split(';')
    .map((extension) => extension.trim())
    .filter((extension) => extension.length > 0)
    .map((extension) => (extension.startsWith('.') ? extension : `.${extension}`));
}

function getWindowsPathDirs(env: NodeJS.ProcessEnv): string[] {
  return (getEnvValue(env, 'PATH') ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function hasWindowsPathSeparator(command: string): boolean {
  return command.includes('\\') || command.includes('/');
}

function getWindowsCommandCandidates(command: string, env: NodeJS.ProcessEnv): string[] {
  const extension = path.win32.extname(command);
  if (extension.length > 0) {
    return [command];
  }
  // Vivado on Windows ships both xvlog and xvlog.bat; the extensionless file is
  // not the correct Windows launcher, so prefer PATHEXT candidates first.
  return [...getWindowsPathExt(env).map((pathExt) => `${command}${pathExt}`), command];
}

export function isWindowsBatchFile(command: string): boolean {
  const extension = path.win32.extname(command).toLowerCase();
  return extension === '.bat' || extension === '.cmd';
}

export function resolveWindowsCommand(
  command: string,
  options: WindowsCommandResolutionOptions = {}
): string {
  const env = options.env ?? process.env;
  const existsSync = options.existsSync ?? fs.existsSync;
  const candidates = getWindowsCommandCandidates(command, env);

  if (hasWindowsPathSeparator(command)) {
    return candidates.find((candidate) => existsSync(candidate)) ?? command;
  }

  for (const dir of getWindowsPathDirs(env)) {
    for (const candidate of candidates) {
      const candidatePath = path.win32.join(dir, candidate);
      if (existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }
  return command;
}

export function buildWindowsBatchInvocation(command: string, args: string[]): ToolInvocation {
  return {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', 'call', command, ...args],
  };
}

export function buildToolInvocation(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
  existsSync: (candidate: string) => boolean = fs.existsSync
): ToolInvocation {
  if (platform !== 'win32') {
    return { command, args };
  }

  const resolvedCommand = resolveWindowsCommand(command, { env, existsSync });
  if (isWindowsBatchFile(resolvedCommand)) {
    return buildWindowsBatchInvocation(resolvedCommand, args);
  }
  return { command: resolvedCommand, args };
}

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

  const invocation = buildToolInvocation(command, args, env);

  logger.info("Executing tool", {
    command,
    args,
    resolvedCommand: invocation.command,
    resolvedArgs: invocation.args,
  });

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
      child = spawn(invocation.command, invocation.args, { cwd, env });
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
