// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Wasm, type MountPointDescriptor, type ProcessOptions } from '@vscode/wasm-wasi/v1';
import { createStdioOptions, startServer } from '@vscode/wasm-wasi-lsp';
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
  SlangServerState,
  SlangServerStatus,
  SlangServerWasmMetadata,
} from './SlangServerRuntime';
import { WasiFileSystemMapper } from './WasiFileSystemMapper';
import { readWasmMetadata, type WasmRuntimePaths } from './WasmSlangServerRuntime';

export interface VsCodeWasmSlangServerRuntimeOptions {
  context: vscode.ExtensionContext;
  outputChannel: vscode.LogOutputChannel;
  onStatusChange?: () => void;
  onCrash?: (reason: string) => void;
}

export class VsCodeWasmSlangServerRuntime implements SlangServerRuntime {
  private client: LanguageClient | undefined;
  private process: Awaited<ReturnType<Wasm['createProcess']>> | undefined;
  private state: SlangServerState = 'stopped';
  private error: string | undefined;
  private actionableError: string | undefined;
  private metadata: SlangServerWasmMetadata | undefined;
  private startupTimeMs: number | undefined;
  private mapper: WasiFileSystemMapper | undefined;
  private stopping = false;
  private stderrTail = '';

  constructor(
    private readonly config: SlangServerConfig,
    private readonly options: VsCodeWasmSlangServerRuntimeOptions
  ) {}

  async start(): Promise<void> {
    if (!this.config.enabled || this.state === 'running' || this.state === 'starting') {
      return;
    }

    const startedAt = Date.now();
    this.state = 'starting';
    this.error = undefined;
    this.actionableError = undefined;
    this.stderrTail = '';
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
      this.setError('No workspace folder is open.', 'Open a filesystem workspace or configure native slang-server.');
      return;
    }

    try {
      await fs.promises.mkdir(paths.tmpRoot, { recursive: true });
      this.metadata = await readWasmMetadata(paths.metadataPath);
      this.mapper = new WasiFileSystemMapper({
        workspaceRoot,
        tmpRoot: vscode.Uri.file(paths.tmpRoot),
        homeRoot: this.config.wasm.allowUserConfig ? vscode.Uri.file(os.homedir()) : undefined,
      });

      const serverOptions: ServerOptions = async () => {
        await this.ensureWasmWasiCoreExtension();
        const wasm = await Wasm.load();
        const processOptions: ProcessOptions = {
          args: this.config.args,
          env: {
            SLANG_SERVER_TESTS: '1',
            SLANG_SERVER_WASI_SKIP_STARTUP_INDEXING: '1',
          },
          stdio: createStdioOptions(),
          mountPoints: [
            { kind: 'vscodeFileSystem', uri: workspaceRoot, mountPoint: '/workspace' },
            { kind: 'vscodeFileSystem', uri: vscode.Uri.file(paths.tmpRoot), mountPoint: '/tmp' },
            ...this.getHomeMountPoint(),
          ],
        };
        const module = await wasm.compile(vscode.Uri.file(paths.wasmPath));
        this.process = await wasm.createProcess(
          'slang-server',
          module,
          createWasmMemoryDescriptor(this.config.wasm.memoryLimitMb),
          processOptions
        );

        const decoder = new TextDecoder('utf-8');
        this.process.stderr?.onData((data) => {
          const text = decoder.decode(data);
          if (this.config.wasm.logStderr) {
            this.options.outputChannel.append(text);
          }
          this.observeStderr(text);
        });

        return startServer(this.process);
      };

      const clientOptions: LanguageClientOptions = {
        documentSelector: [
          { scheme: 'file', language: 'verilog' },
          { scheme: 'file', language: 'systemverilog' },
        ],
        outputChannel: this.options.outputChannel,
        traceOutputChannel: this.options.outputChannel,
        uriConverters: createSlangWasmUriConverters(this.mapper),
      };

      this.client = new LanguageClient(
        'verilog-slang-server-vscode-wasm',
        'Verilog slang-server VS Code WASM',
        serverOptions,
        clientOptions
      );
      this.client.onDidChangeState((event) => {
        if (!this.stopping && event.newState === State.Stopped && this.state === 'running') {
          const crash = this.classifyFailure('slang-server VS Code WASM language client stopped unexpectedly.');
          this.setCrash(crash.message, crash.action);
        }
      });

      await withTimeout(
        this.client.start(),
        30000,
        'Timed out waiting for slang-server WASM to respond to initialize.'
      );
      this.state = 'running';
      this.startupTimeMs = Date.now() - startedAt;
      this.options.outputChannel.info(`slang-server WASM client started in ${this.startupTimeMs} ms.`);
      this.emitStatus();
    } catch (err) {
      await this.process?.terminate().catch(() => 1);
      const failure = this.classifyFailure(err instanceof Error ? err.message : String(err));
      this.setError(failure.message, failure.action);
    }
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const client = this.client;
    const process = this.process;
    this.client = undefined;
    this.process = undefined;
    if (client?.isRunning()) {
      await client.stop();
    }
    await process?.terminate().catch(() => 1);
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
      runtimeProvider: 'vscode-wasm-wasi',
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
      throw new Error('slang-server VS Code WASM runtime is not running.');
    }
    return this.client.sendRequest(ExecuteCommandRequest.type, { command, arguments: args }) as Promise<T>;
  }

  async sendRequest<T>(method: string, params?: unknown): Promise<T> {
    if (!this.client?.isRunning()) {
      throw new Error('slang-server VS Code WASM runtime is not running.');
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
      helperPath: '',
      tmpRoot: path.join(this.options.context.globalStorageUri.fsPath, 'slang-server-vscode-wasm-tmp'),
    };
  }

  private getUnsupportedReason(
    workspaceFolder: vscode.WorkspaceFolder | undefined,
    paths: WasmRuntimePaths
  ): { message: string; action: string } | undefined {
    if (vscode.env.uiKind === vscode.UIKind.Web) {
      return {
        message: 'Bundled WASM slang-server is only supported in the desktop extension host.',
        action: 'Use VS Code Desktop or configure native slang-server in a supported desktop workspace.',
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
        action: 'Use a local file workspace or use native slang-server.',
      };
    }
    if (!fs.existsSync(paths.wasmPath)) {
      return {
        message: `Bundled slang-server.wasm not found: ${paths.wasmPath}`,
        action: 'Build the bundled WASM artifact or use native slang-server.',
      };
    }
    return undefined;
  }

  private getHomeMountPoint(): MountPointDescriptor[] {
    if (!this.config.wasm.allowUserConfig) {
      return [];
    }
    return [{ kind: 'vscodeFileSystem', uri: vscode.Uri.file(os.homedir()), mountPoint: '/home' }];
  }

  private async ensureWasmWasiCoreExtension(): Promise<void> {
    const extensionId = 'ms-vscode.wasm-wasi-core';
    if (vscode.extensions.getExtension(extensionId)) {
      return;
    }
    this.options.outputChannel.info(`Installing required VS Code extension: ${extensionId}`);
    try {
      await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);
    } catch (err) {
      throw new Error(
        `Unable to install ${extensionId}. Install “WASI based WebAssembly Execution Engine” and reload the window. ${
          err instanceof Error ? err.message : String(err)
        }`,
        { cause: err }
      );
    }

    const installed = await waitForExtension(extensionId, 10000);
    if (!installed) {
      throw new Error(
        `Unable to load ${extensionId} after installation. Reload the window or install “WASI based WebAssembly Execution Engine” manually.`
      );
    }
  }

  private setError(message: string, actionableError: string): void {
    this.error = message;
    this.actionableError = actionableError;
    this.state = 'error';
    this.options.outputChannel.error(`${message} ${actionableError}`);
    this.emitStatus();
  }

  private setCrash(reason: string, actionableError = 'Restart slang-server or show the output channel for details.'): void {
    this.error = reason;
    this.actionableError = actionableError;
    this.state = 'error';
    this.options.outputChannel.error(reason);
    this.options.onCrash?.(reason);
    this.emitStatus();
  }

  private emitStatus(): void {
    this.options.onStatusChange?.();
  }

  private observeStderr(text: string): void {
    this.stderrTail = (this.stderrTail + text).slice(-8192);
    if (!isWasmOutOfMemoryText(this.stderrTail) || this.state === 'error') {
      return;
    }
    const failure = this.classifyFailure('slang-server WASM stderr reported an out-of-memory failure.');
    this.setCrash(failure.message, failure.action);
  }

  private classifyFailure(fallbackMessage: string): { message: string; action: string } {
    if (isWasmOutOfMemoryText(`${fallbackMessage}\n${this.stderrTail}`)) {
      return {
        message: 'slang-server WASM ran out of memory.',
        action: `Increase verilog.slangServer.wasm.memoryLimitMb above ${this.config.wasm.memoryLimitMb} MB, reduce .slang/server.json index scope, or switch to native slang-server.`,
      };
    }
    return {
      message: fallbackMessage,
      action: 'Run Verilog: Doctor, show the slang-server output, rebuild resources/wasm/slang-server.wasm, or switch to native slang-server.',
    };
  }
}

export function createWasmMemoryDescriptor(memoryLimitMb: number): WebAssembly.MemoryDescriptor {
  const safeLimitMb = Number.isFinite(memoryLimitMb) && memoryLimitMb > 0 ? memoryLimitMb : 2048;
  const maximum = mbToWasmPages(safeLimitMb);
  const initial = Math.min(maximum, mbToWasmPages(Math.min(safeLimitMb, 256)));
  return { initial, maximum, shared: true };
}

export function createSlangWasmUriConverters(mapper: WasiFileSystemMapper): {
  code2Protocol: (value: vscode.Uri) => string;
  protocol2Code: (value: string) => vscode.Uri;
} {
  return {
    code2Protocol: (value) => {
      if (value.scheme === 'file') {
        const wasiPath = mapper.toWasiPath(value.fsPath);
        if (wasiPath) {
          return vscode.Uri.file(toSlangWorkspaceRelativePath(wasiPath, mapper.workspaceMount)).toString();
        }
      }
      return value.toString();
    },
    protocol2Code: (value) => {
      const uri = vscode.Uri.parse(value);
      if (uri.scheme !== 'file') {
        return uri;
      }

      const mappedUri = mapper.toHostUri(uri.path);
      if (mappedUri) {
        return mappedUri;
      }

      // Some slang-server diagnostics are emitted as file:///rtl/foo.sv after
      // the WASI current directory is set to /workspace. Treat those as
      // workspace-root-relative paths so VS Code Problems links the real file.
      if (uri.path.startsWith('/') && !looksLikeHostAbsolutePath(uri.path)) {
        const workspaceRelative = `${mapper.workspaceMount}${uri.path}`;
        return mapper.toHostUri(workspaceRelative) ?? uri;
      }

      return uri;
    },
  };
}

function mbToWasmPages(megabytes: number): number {
  return Math.max(16, Math.ceil((megabytes * 1024 * 1024) / 65536));
}

function toSlangWorkspaceRelativePath(wasiPath: string, workspaceMount: string): string {
  if (wasiPath === workspaceMount) {
    return workspaceMount;
  }
  if (wasiPath.startsWith(`${workspaceMount}/`)) {
    return wasiPath.slice(workspaceMount.length);
  }
  return wasiPath;
}

function looksLikeHostAbsolutePath(value: string): boolean {
  return value.startsWith('/Users/')
    || value.startsWith('/home/')
    || value.startsWith('/private/')
    || value.startsWith('/var/')
    || value.startsWith('/opt/')
    || value.startsWith('/usr/')
    || value.startsWith('/bin/')
    || value.startsWith('/etc/');
}

function isWasmOutOfMemoryText(text: string): boolean {
  return /bad_alloc|out of memory|memory allocation/i.test(text);
}

async function waitForExtension(extensionId: string, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (vscode.extensions.getExtension(extensionId)) {
      return true;
    }
    await delay(250);
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
