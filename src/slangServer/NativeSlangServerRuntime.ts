// SPDX-License-Identifier: MIT
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-languageclient/node';
import which = require('which');
import type { SlangServerConnection, SlangServerRuntime } from './runtime';

export class NativeSlangServerRuntime implements SlangServerRuntime {
  readonly kind = 'native' as const;
  private process: cp.ChildProcessWithoutNullStreams | undefined;

  constructor(
    private readonly executablePath: string,
    private readonly args: readonly string[],
    private readonly outputChannel: vscode.OutputChannel
  ) {}

  async start(): Promise<SlangServerConnection> {
    const executable = await resolveNativeExecutable(this.executablePath);
    if (!executable) {
      throw new Error(
        'Native slang-server runtime selected, but verilog.slangServer.path is empty or cannot be resolved.'
      );
    }

    this.outputChannel.appendLine(`Starting native slang-server: ${executable} ${this.args.join(' ')}`.trim());
    const child = cp.spawn(executable, this.args.slice(), {
      cwd: getWorkspaceCwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.process = child;

    child.stderr.on('data', (chunk: Buffer) => {
      this.outputChannel.append(chunk.toString());
    });
    child.on('error', (error) => {
      this.outputChannel.appendLine(`native slang-server failed to start: ${error.message}`);
    });
    child.on('exit', (code, signal) => {
      this.outputChannel.appendLine(
        `native slang-server exited with code ${String(code)} signal ${String(signal)}`
      );
    });

    return {
      reader: new StreamMessageReader(child.stdout),
      writer: new StreamMessageWriter(child.stdin),
      dispose: () => {
        child.kill();
      },
    };
  }

  async stop(): Promise<void> {
    const child = this.process;
    this.process = undefined;
    if (!child || child.killed) {
      return;
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 1500);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill();
    });
  }

  async getVersion(): Promise<string | undefined> {
    const executable = await resolveNativeExecutable(this.executablePath);
    if (!executable) {
      return undefined;
    }
    return new Promise((resolve) => {
      const child = cp.spawn(executable, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.on('error', () => resolve(undefined));
      child.on('exit', () => resolve(output.trim() || undefined));
    });
  }
}

export async function resolveNativeExecutable(inputPath: string): Promise<string | undefined> {
  const trimmed = inputPath.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (path.isAbsolute(trimmed) || trimmed.includes(path.sep)) {
    return fs.existsSync(trimmed) ? trimmed : undefined;
  }
  try {
    return await which(trimmed);
  } catch {
    return undefined;
  }
}

function getWorkspaceCwd(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
