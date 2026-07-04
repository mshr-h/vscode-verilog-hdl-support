// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { SlangServerStatus } from './SlangServerRuntime';
import type { SlangServerManager } from './SlangServerManager';

export const SHOW_SLANG_SERVER_QUICK_ACTIONS_COMMAND = 'verilog.showSlangServerQuickActions';

export class SlangServerStatusBar implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly manager: SlangServerManager) {
    this.item.command = SHOW_SLANG_SERVER_QUICK_ACTIONS_COMMAND;
    this.item.tooltip = 'slang-server status and actions';
    this.disposables.push(
      this.item,
      this.manager.onDidChangeStatus((status) => this.update(status))
    );
    this.update(this.manager.getStatus());
    this.item.show();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private update(status: SlangServerStatus): void {
    this.item.text = formatSlangServerStatusBarText(status);
    this.item.backgroundColor = status.state === 'error'
      ? new vscode.ThemeColor('statusBarItem.errorBackground')
      : undefined;
  }
}

export function formatSlangServerStatusBarText(status: Pick<SlangServerStatus, 'state' | 'resolvedRuntime'>): string {
  if (status.state === 'error') {
    return 'slang-server: error';
  }
  if (status.state === 'stopped') {
    return 'slang-server: stopped';
  }
  if (status.state === 'starting') {
    return 'slang-server: starting';
  }
  return status.resolvedRuntime === 'native' ? 'slang-server: native' : 'slang-server: WASM';
}

export function registerSlangServerQuickActions(manager: SlangServerManager): vscode.Disposable {
  return vscode.commands.registerCommand(SHOW_SLANG_SERVER_QUICK_ACTIONS_COMMAND, async () => {
    const selection = await vscode.window.showQuickPick(
      [
        { label: 'Restart slang-server', command: 'verilog.restartSlangServer' },
        { label: 'Show slang-server Output', command: 'verilog.showSlangServerOutput' },
        { label: 'Open Slang Project Config', command: 'verilog.openSlangProjectConfig' },
        { label: 'Select slang-server Runtime', command: 'verilog.selectSlangServerRuntime' },
        { label: 'Run Verilog Doctor', command: 'verilog.doctor' },
      ],
      {
        placeHolder: formatSlangServerStatusBarText(manager.getStatus()),
      }
    );
    if (selection) {
      await vscode.commands.executeCommand(selection.command);
    }
  });
}
