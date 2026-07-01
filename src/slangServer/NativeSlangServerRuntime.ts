// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import {
  ExecuteCommandRequest,
  LanguageClient,
  State,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';
import { runTool } from '../tools/ToolRunner';
import type { SlangServerConfig } from './SlangServerConfig';
import type { SlangServerRuntime, SlangServerStatus, SlangServerState } from './SlangServerRuntime';

export interface NativeSlangServerRuntimeOptions {
  outputChannel: vscode.LogOutputChannel;
  onStatusChange?: () => void;
  onCrash?: (reason: string) => void;
}

export class NativeSlangServerRuntime implements SlangServerRuntime {
  private client: LanguageClient | undefined;
  private state: SlangServerState = 'stopped';
  private version: string | undefined;
  private error: string | undefined;
  private actionableError: string | undefined;
  private startupTimeMs: number | undefined;
  private stopping = false;

  constructor(
    private readonly config: SlangServerConfig,
    private readonly options: NativeSlangServerRuntimeOptions
  ) {}

  async start(): Promise<void> {
    if (!this.config.enabled || this.state === 'running' || this.state === 'starting') {
      return;
    }
    if (this.config.path.length === 0) {
      this.setError(
        'verilog.slangServer.path is required for native slang-server.',
        'Set verilog.slangServer.path or switch runtime to bundled-wasm/auto.'
      );
      return;
    }

    const startedAt = Date.now();
    this.state = 'starting';
    this.error = undefined;
    this.actionableError = undefined;
    this.emitStatus();
    this.version = await this.probeVersion();

    const serverOptions: ServerOptions = {
      command: this.config.path,
      args: this.config.args,
    };
    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'verilog' },
        { scheme: 'file', language: 'systemverilog' },
      ],
      outputChannel: this.options.outputChannel,
      traceOutputChannel: this.options.outputChannel,
    };

    this.client = new LanguageClient(
      'verilog-slang-server',
      'Verilog slang-server',
      serverOptions,
      clientOptions
    );
    this.client.onDidChangeState((event) => {
      if (!this.stopping && event.newState === State.Stopped && this.state === 'running') {
        this.setCrash('native slang-server language client stopped unexpectedly.');
      }
    });

    try {
      await this.client.start();
      this.state = 'running';
      this.startupTimeMs = Date.now() - startedAt;
      this.emitStatus();
    } catch (err) {
      this.setError(
        err instanceof Error ? err.message : String(err),
        'Verify verilog.slangServer.path, show slang-server output, or switch runtime.'
      );
    }
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const client = this.client;
    this.client = undefined;
    if (client?.isRunning()) {
      await client.stop();
    }
    this.state = 'stopped';
    this.stopping = false;
    this.emitStatus();
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  getStatus(): SlangServerStatus {
    return {
      enabled: this.config.enabled,
      configuredRuntime: this.config.runtime,
      resolvedRuntime: this.config.resolvedRuntime,
      state: this.state,
      path: this.config.path,
      args: this.config.args,
      version: this.version,
      error: this.error,
      actionableError: this.actionableError,
      startupTimeMs: this.startupTimeMs,
    };
  }

  showOutput(): void {
    this.options.outputChannel.show();
  }

  async probeVersion(): Promise<string | undefined> {
    if (this.config.path.length === 0) {
      return undefined;
    }
    try {
      const result = await runTool({
        command: this.config.path,
        args: [...this.config.args, '--version'],
        collectStdout: true,
        collectStderr: true,
      });
      return (result.stdout || result.stderr).trim();
    } catch (err) {
      this.options.outputChannel.appendLine(`slang-server --version failed: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }

  async executeCommand<T>(command: string, args: unknown[] = []): Promise<T> {
    if (!this.client?.isRunning()) {
      throw new Error('slang-server is not running.');
    }
    return this.client.sendRequest(ExecuteCommandRequest.type, { command, arguments: args }) as Promise<T>;
  }

  async sendRequest<T>(method: string, params?: unknown): Promise<T> {
    if (!this.client?.isRunning()) {
      throw new Error('slang-server is not running.');
    }
    return this.client.sendRequest(method, params) as Promise<T>;
  }

  dispose(): void {
    void this.stop();
  }

  private setError(message: string, actionableError: string): void {
    this.error = message;
    this.actionableError = actionableError;
    this.state = 'error';
    this.options.outputChannel.error(`${message} ${actionableError}`);
    this.emitStatus();
  }

  private setCrash(reason: string): void {
    this.error = reason;
    this.actionableError = 'Restart slang-server or show the output channel for details.';
    this.state = 'error';
    this.options.outputChannel.error(reason);
    this.options.onCrash?.(reason);
    this.emitStatus();
  }

  private emitStatus(): void {
    this.options.onStatusChange?.();
  }
}
