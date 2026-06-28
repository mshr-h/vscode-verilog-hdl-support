// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { LanguageClient, State, type LanguageClientOptions } from 'vscode-languageclient/node';
import { getExtensionLogger } from '../logging';
import { NativeSlangServerRuntime } from './NativeSlangServerRuntime';
import type { SlangServerRuntime } from './runtime';
import { SlangConfigService } from './SlangConfigService';
import { getSlangServerSettings, selectSlangServerRuntime, type RuntimeSelection } from './settings';
import { readBundledMetadata, WasmSlangServerRuntime } from './WasmSlangServerRuntime';

export class SlangServerManager implements vscode.Disposable {
  private readonly outputChannel = vscode.window.createOutputChannel('slang-server');
  private readonly statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  private readonly disposables: vscode.Disposable[] = [];
  private readonly logger = getExtensionLogger('SlangServer', 'Manager');
  private client: LanguageClient | undefined;
  private runtime: SlangServerRuntime | undefined;
  private selection: RuntimeSelection | undefined;
  private lastError: string | undefined;
  private activeBuild: string | undefined;
  private activeTop: string | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configService = new SlangConfigService()
  ) {
    this.statusBar.command = 'verilog.doctor';
    this.disposables.push(
      this.outputChannel,
      this.statusBar,
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration('verilog.slangServer')
          || event.affectsConfiguration('verilog.slangServer.wasm')
        ) {
          void this.restart();
        }
      })
    );
    this.updateStatus('starting');
  }

  async start(): Promise<void> {
    if (isVirtualWorkspace()) {
      this.lastError = 'Virtual workspaces and VS Code Web are not supported by slang-server integration yet.';
      this.updateStatus('unsupported');
      return;
    }

    const settings = getSlangServerSettings();
    this.selection = selectSlangServerRuntime(settings);
    this.runtime = this.createRuntime(this.selection);
    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'verilog' },
        { scheme: 'file', language: 'systemverilog' },
      ],
      outputChannelName: 'slang-server',
      initializationOptions: {
        experimental: {
          inactiveRegions: {
            inactiveRegions: true,
          },
        },
      },
    };
    this.client = new LanguageClient(
      'slang-server',
      'slang-server',
      async () => {
        if (!this.runtime) {
          throw new Error('slang-server runtime is not initialized.');
        }
        return this.runtime.start();
      },
      clientOptions
    );
    this.disposables.push(
      this.client.onDidChangeState(({ newState }) => {
        if (newState === State.Running) {
          this.lastError = undefined;
          this.updateStatus('ready');
        } else if (newState === State.Stopped) {
          this.updateStatus(this.lastError ? 'crashed' : 'starting');
        }
      }),
      this.client.onNotification('slang/setConfig', (config: { build?: string }) => {
        this.activeBuild = config.build;
        this.updateStatus(this.client?.isRunning() ? 'ready' : 'starting');
      })
    );

    try {
      this.updateStatus('starting');
      await this.client.start();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(this.lastError);
      this.updateStatus('crashed');
      vscode.window.showErrorMessage(`Failed to start slang-server: ${this.lastError}`);
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async stop(): Promise<void> {
    const client = this.client;
    this.client = undefined;
    if (client?.isRunning()) {
      await client.stop();
    }
    await this.runtime?.stop();
    this.runtime = undefined;
  }

  getStatus() {
    return {
      selection: this.selection,
      lastError: this.lastError,
      activeBuild: this.activeBuild,
      activeTop: this.activeTop,
      serverInfo: this.client?.initializeResult?.serverInfo,
      bundledMetadata: readBundledMetadata(this.context.extensionUri),
    };
  }

  async configureProject(): Promise<void> {
    const changed = await this.configService.configureProject();
    if (changed) {
      await this.restart();
    }
  }

  async setBuildFile(fsPath: string): Promise<void> {
    await vscode.commands.executeCommand('slang.setBuildFile', fsPath);
    this.activeBuild = fsPath;
    this.updateStatus('ready');
  }

  async setTopLevel(fsPath: string): Promise<void> {
    await vscode.commands.executeCommand('slang.setTopLevel', fsPath);
    this.activeTop = fsPath;
    this.updateStatus('ready');
  }

  dispose(): void {
    void this.stop();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private createRuntime(selection: RuntimeSelection): SlangServerRuntime {
    const settings = getSlangServerSettings();
    if (selection.kind === 'native') {
      return new NativeSlangServerRuntime(settings.path || 'slang-server', settings.args, this.outputChannel);
    }
    return new WasmSlangServerRuntime(
      {
        extensionUri: this.context.extensionUri,
        globalStorageUri: this.context.globalStorageUri,
        memoryLimitMb: settings.wasmMemoryLimitMb,
      },
      this.outputChannel
    );
  }

  private updateStatus(state: 'starting' | 'ready' | 'crashed' | 'unsupported'): void {
    const runtime = this.selection?.kind ?? 'wasm';
    this.statusBar.text = `slang-server: ${state} (${runtime})`;
    this.statusBar.tooltip = this.lastError ?? this.selection?.reason ?? 'slang-server';
    this.statusBar.show();
    this.logger.info('slang-server status changed', { state, runtime, error: this.lastError });
  }
}

function isVirtualWorkspace(): boolean {
  return (vscode.workspace.workspaceFolders ?? []).some((folder) => folder.uri.scheme !== 'file');
}
