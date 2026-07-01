// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { readSlangServerConfig } from './SlangServerConfig';
import { NativeSlangServerRuntime } from './NativeSlangServerRuntime';
import { selectSlangServerRuntime } from './SlangServerRuntimeSelector';
import type { SlangServerRuntime, SlangServerStatus } from './SlangServerRuntime';
import { VsCodeWasmSlangServerRuntime } from './VsCodeWasmSlangServerRuntime';
import { WasmSlangServerRuntime } from './WasmSlangServerRuntime';

export class SlangServerManager implements vscode.Disposable {
  private runtime: SlangServerRuntime | undefined;
  private readonly outputChannel = vscode.window.createOutputChannel('Verilog slang-server', { log: true });
  private readonly disposables: vscode.Disposable[] = [];
  private readonly statusEmitter = new vscode.EventEmitter<SlangServerStatus>();
  private lastCrashReason: string | undefined;
  private lastCrashAt: string | undefined;
  private crashNotificationShown = false;

  readonly onDidChangeStatus = this.statusEmitter.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.disposables.push(
      this.outputChannel,
      this.statusEmitter,
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('verilog.slangServer')) {
          void this.restart();
        }
      })
    );
  }

  async start(): Promise<void> {
    const config = readSlangServerConfig();
    await this.runtime?.stop();
    this.runtime = undefined;

    if (!config.enabled) {
      this.emitStatus();
      return;
    }

    const selection = selectSlangServerRuntime(config);
    this.outputChannel.info(`Selected slang-server runtime: ${selection.kind} (${selection.reason})`);
    this.runtime = selection.kind === 'native'
      ? new NativeSlangServerRuntime(config, {
          outputChannel: this.outputChannel,
          onStatusChange: () => this.emitStatus(),
          onCrash: (reason) => this.recordCrash(reason),
        })
      : this.createBundledWasmRuntime(config);
    await this.runtime.start();
    if (this.runtime.getStatus().state === 'running') {
      this.crashNotificationShown = false;
    }
    this.emitStatus();
  }

  async stop(): Promise<void> {
    await this.runtime?.stop();
    this.emitStatus();
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  getStatus(): SlangServerStatus {
    const config = readSlangServerConfig();
    const status = this.runtime?.getStatus() ?? {
      enabled: readSlangServerConfig().enabled,
      configuredRuntime: config.runtime,
      resolvedRuntime: selectSlangServerRuntime(config).kind,
      state: 'stopped',
    };
    return {
      ...status,
      lastCrashReason: this.lastCrashReason,
      lastCrashAt: this.lastCrashAt,
    };
  }

  showOutput(): void {
    this.runtime?.showOutput();
    this.outputChannel.show();
  }

  async executeCommand<T>(command: string, args: unknown[] = []): Promise<T> {
    if (!this.runtime) {
      throw new Error('slang-server runtime is not started.');
    }
    return this.runtime.executeCommand<T>(command, args);
  }

  async sendRequest<T>(method: string, params?: unknown): Promise<T> {
    if (!this.runtime) {
      throw new Error('slang-server runtime is not started.');
    }
    return this.runtime.sendRequest<T>(method, params);
  }

  async probeVersion(): Promise<string | undefined> {
    return this.runtime?.probeVersion();
  }

  dispose(): void {
    void this.stop();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private recordCrash(reason: string): void {
    this.lastCrashReason = reason;
    this.lastCrashAt = new Date().toISOString();
    if (this.crashNotificationShown) {
      return;
    }
    this.crashNotificationShown = true;
    void vscode.window.showErrorMessage(
      `slang-server stopped unexpectedly: ${reason}`,
      'Restart',
      'Show Output'
    ).then((selection) => {
      if (selection === 'Restart') {
        void this.restart();
      } else if (selection === 'Show Output') {
        this.showOutput();
      }
    });
  }

  private emitStatus(): void {
    this.statusEmitter.fire(this.getStatus());
  }

  private createBundledWasmRuntime(config: ReturnType<typeof readSlangServerConfig>): SlangServerRuntime {
    const options = {
      context: this.context,
      outputChannel: this.outputChannel,
      onStatusChange: () => this.emitStatus(),
      onCrash: (reason: string) => this.recordCrash(reason),
    };
    if (process.env.VERILOGHDL_SLANG_WASM_RUNTIME === 'node') {
      this.outputChannel.info('Using legacy node:wasi helper slang-server runtime provider.');
      return new WasmSlangServerRuntime(config, options);
    }
    this.outputChannel.info('Using @vscode/wasm-wasi slang-server runtime provider.');
    return new VsCodeWasmSlangServerRuntime(config, options);
  }
}
