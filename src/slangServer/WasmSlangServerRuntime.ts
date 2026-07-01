// SPDX-License-Identifier: MIT
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  ExecuteCommandRequest,
  LanguageClient,
  State,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';
import type { SlangServerConfig } from './SlangServerConfig';
import type {
  SlangServerRuntime,
  SlangServerStatus,
  SlangServerState,
  SlangServerWasmMetadata,
} from './SlangServerRuntime';
import { WasiFileSystemMapper } from './WasiFileSystemMapper';

export interface WasmRuntimePaths {
  wasmPath: string;
  metadataPath: string;
  helperPath: string;
  tmpRoot: string;
}

export interface WasmSlangServerRuntimeOptions {
  context: vscode.ExtensionContext;
  outputChannel: vscode.LogOutputChannel;
  onStatusChange?: () => void;
  onCrash?: (reason: string) => void;
}

export class WasmSlangServerRuntime implements SlangServerRuntime {
  private client: LanguageClient | undefined;
  private helper: ChildProcessWithoutNullStreams | undefined;
  private state: SlangServerState = 'stopped';
  private error: string | undefined;
  private actionableError: string | undefined;
  private metadata: SlangServerWasmMetadata | undefined;
  private startupTimeMs: number | undefined;
  private mapper: WasiFileSystemMapper | undefined;
  private stopping = false;

  constructor(
    private readonly config: SlangServerConfig,
    private readonly options: WasmSlangServerRuntimeOptions
  ) {}

  async start(): Promise<void> {
    if (!this.config.enabled || this.state === 'running' || this.state === 'starting') {
      return;
    }
    const startedAt = Date.now();
    this.state = 'starting';
    this.error = undefined;
    this.actionableError = undefined;
    this.emitStatus();

    const paths = this.getPaths();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const unsupported = this.getUnsupportedReason(workspaceFolder, paths);
    if (unsupported) {
      this.setError(unsupported.message, unsupported.action);
      return;
    }
    const workspaceRoot = workspaceFolder?.uri;
    if (!workspaceRoot) {
      this.setError('No workspace folder is open.', 'Open a filesystem workspace or switch to native slang-server.');
      return;
    }

    await fs.promises.mkdir(paths.tmpRoot, { recursive: true });
    this.metadata = await readWasmMetadata(paths.metadataPath);
    this.mapper = new WasiFileSystemMapper({
      workspaceRoot,
      tmpRoot: vscode.Uri.file(paths.tmpRoot),
      homeRoot: this.config.wasm.allowUserConfig ? vscode.Uri.file(os.homedir()) : undefined,
    });

    const serverOptions: ServerOptions = async () => {
      this.helper = spawn(process.execPath, [
        paths.helperPath,
        JSON.stringify({
          wasmPath: paths.wasmPath,
          workspaceRoot: workspaceRoot.fsPath,
          tmpRoot: paths.tmpRoot,
          allowUserConfig: this.config.wasm.allowUserConfig,
          serverArgs: this.config.args,
        }),
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.helper.stderr.setEncoding('utf8');
      this.helper.stderr.on('data', (chunk: string) => {
        if (this.config.wasm.logStderr) {
          this.options.outputChannel.append(chunk);
        }
      });
      this.helper.once('exit', (code, signal) => {
        if (this.stopping) {
          return;
        }
        const reason = `WASI helper exited with code ${String(code)} signal ${String(signal)}`;
        this.setCrash(reason);
      });
      return { reader: this.helper.stdout, writer: this.helper.stdin };
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
      'verilog-slang-server-wasm',
      'Verilog slang-server WASM',
      serverOptions,
      clientOptions
    );
    this.client.onDidChangeState((event) => {
      if (!this.stopping && event.newState === State.Stopped && this.state === 'running') {
        this.setCrash('slang-server WASM language client stopped unexpectedly.');
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
        'Open the slang-server output, verify resources/wasm/slang-server.wasm, or switch to native slang-server.'
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
    this.helper?.kill();
    this.helper = undefined;
    this.state = 'stopped';
    this.stopping = false;
    this.emitStatus();
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  getStatus(): SlangServerStatus {
    const paths = this.getPaths();
    return {
      enabled: this.config.enabled,
      configuredRuntime: this.config.runtime,
      resolvedRuntime: 'bundled-wasm',
      runtimeProvider: 'node-wasi-helper',
      state: this.state,
      args: this.config.args,
      version: this.metadata?.version as string | undefined,
      error: this.error,
      actionableError: this.actionableError,
      wasmPath: paths.wasmPath,
      wasmMetadata: this.metadata,
      workspaceMount: this.mapper?.workspaceMount,
      tmpMount: this.mapper?.tmpMount,
      allowUserConfig: this.config.wasm.allowUserConfig,
      memoryLimitMb: this.config.wasm.memoryLimitMb,
      startupTimeMs: this.startupTimeMs,
    };
  }

  showOutput(): void {
    this.options.outputChannel.show();
  }

  probeVersion(): Promise<string | undefined> {
    return Promise.resolve(this.metadata?.version as string | undefined);
  }

  async executeCommand<T>(command: string, args: unknown[] = []): Promise<T> {
    if (!this.client?.isRunning()) {
      throw new Error('slang-server WASM is not running.');
    }
    return this.client.sendRequest(ExecuteCommandRequest.type, { command, arguments: args }) as Promise<T>;
  }

  async sendRequest<T>(method: string, params?: unknown): Promise<T> {
    if (!this.client?.isRunning()) {
      throw new Error('slang-server WASM is not running.');
    }
    return this.client.sendRequest(method, params) as Promise<T>;
  }

  dispose(): void {
    void this.stop();
  }

  private getPaths(): WasmRuntimePaths {
    return {
      wasmPath: this.options.context.asAbsolutePath(path.join('resources', 'wasm', 'slang-server.wasm')),
      metadataPath: this.options.context.asAbsolutePath(path.join('resources', 'wasm', 'slang-server.meta.json')),
      helperPath: this.options.context.asAbsolutePath(path.join('dist', 'slangServer', 'wasiHost.js')),
      tmpRoot: path.join(this.options.context.globalStorageUri.fsPath, 'slang-server-tmp'),
    };
  }

  private getUnsupportedReason(
    workspaceFolder: vscode.WorkspaceFolder | undefined,
    paths: WasmRuntimePaths
  ): { message: string; action: string } | undefined {
    if (vscode.env.uiKind === vscode.UIKind.Web) {
      return {
        message: 'Bundled WASM slang-server requires the desktop Node extension host.',
        action: 'Use VS Code Desktop or configure native slang-server.',
      };
    }
    if (!workspaceFolder) {
      return {
        message: 'Bundled WASM slang-server requires an open filesystem workspace.',
        action: 'Open a workspace folder or configure native slang-server.',
      };
    }
    if (workspaceFolder.uri.scheme !== 'file') {
      return {
        message: `Bundled WASM slang-server cannot mount ${workspaceFolder.uri.scheme} workspaces.`,
        action: 'Use a local file workspace or configure native slang-server.',
      };
    }
    if (!fs.existsSync(paths.helperPath)) {
      return {
        message: `WASI helper not found: ${paths.helperPath}`,
        action: 'Run the extension build or switch to native slang-server.',
      };
    }
    if (!fs.existsSync(paths.wasmPath)) {
      return {
        message: `Bundled slang-server.wasm not found: ${paths.wasmPath}`,
        action: 'Install a VSIX with bundled WASM or switch to native slang-server.',
      };
    }
    return undefined;
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

export async function readWasmMetadata(metadataPath: string): Promise<SlangServerWasmMetadata | undefined> {
  try {
    return JSON.parse(await fs.promises.readFile(metadataPath, 'utf8')) as SlangServerWasmMetadata;
  } catch {
    return undefined;
  }
}
