// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { SlangConfigService } from './SlangConfigService';
import type { SlangServerManager } from './SlangServerManager';

export function registerSlangServerCommands(
  manager: SlangServerManager,
  configService: SlangConfigService
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('verilog.restartSlangServer', async () => {
      await manager.restart();
      vscode.window.showInformationMessage('slang-server restarted.');
    }),
    vscode.commands.registerCommand('verilog.showSlangServerOutput', () => manager.showOutput()),
    vscode.commands.registerCommand('verilog.showSlangServerStatus', () => {
      vscode.window.showInformationMessage(formatSlangServerStatus(manager.getStatus()));
    }),
    vscode.commands.registerCommand('verilog.selectSlangServerRuntime', async () => {
      await selectSlangServerRuntime();
    }),
    vscode.commands.registerCommand('verilog.configureSlangProject', async () => {
      const candidates = await configService.findCandidateFilelists();
      if (candidates.length === 0) {
        vscode.window.showWarningMessage('No Verilog filelists were found in this workspace.');
        return;
      }
      const selected = await vscode.window.showQuickPick(
        candidates.map((uri) => ({ label: vscode.workspace.asRelativePath(uri), uri })),
        { placeHolder: 'Select the filelist for .slang/server.json' }
      );
      if (!selected) {
        return;
      }
      const configUri = await configService.writeWorkspaceConfig(selected.uri);
      await vscode.window.showTextDocument(configUri);
    }),
    vscode.commands.registerCommand('verilog.openSlangProjectConfig', async () => {
      const uri = configService.getWorkspaceConfigUri();
      if (!uri) {
        vscode.window.showWarningMessage('Open a workspace folder before opening .slang/server.json.');
        return;
      }
      try {
        await vscode.window.showTextDocument(uri);
      } catch {
        const choice = await vscode.window.showWarningMessage(
          '.slang/server.json does not exist.',
          'Configure Slang Project'
        );
        if (choice === 'Configure Slang Project') {
          await vscode.commands.executeCommand('verilog.configureSlangProject');
        }
      }
    }),
    vscode.commands.registerCommand('verilog.validateSlangProjectConfig', async () => {
      const status = await configService.getStatus();
      if (!status.workspaceConfig) {
        vscode.window.showWarningMessage('No workspace .slang/server.json found.');
        return;
      }
      if (!status.ok) {
        vscode.window.showErrorMessage(`Invalid .slang/server.json: ${status.error ?? 'unknown parse error'}`);
        return;
      }
      vscode.window.showInformationMessage('.slang/server.json is valid JSON.');
    }),
  ];
}

export function formatSlangServerStatus(status: ReturnType<SlangServerManager['getStatus']>): string {
  const detail = status.error ? `: ${status.error}` : '';
  const provider = status.runtimeProvider ? `, ${status.runtimeProvider}` : '';
  return `slang-server ${status.state} (${status.resolvedRuntime}${provider})${detail}`;
}

export async function selectSlangServerRuntime(): Promise<void> {
  const config = vscode.workspace.getConfiguration('verilog.slangServer');
  const selected = await vscode.window.showQuickPick(
    [
      {
        label: 'Auto',
        description: 'Use native when path is configured, otherwise bundled WASM',
        runtime: 'auto',
      },
      {
        label: 'Bundled WASM',
        description: 'Use resources/wasm/slang-server.wasm',
        runtime: 'bundled-wasm',
      },
      {
        label: 'Native executable',
        description: 'Use an explicit slang-server executable path',
        runtime: 'native',
      },
    ],
    { placeHolder: 'Select slang-server runtime' }
  );
  if (!selected) {
    return;
  }
  await config.update('runtime', selected.runtime, vscode.ConfigurationTarget.Global);
  if (selected.runtime !== 'native') {
    return;
  }
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Select slang-server',
    title: 'Select native slang-server executable',
  });
  if (picked?.[0]) {
    await config.update('path', picked[0].fsPath, vscode.ConfigurationTarget.Global);
  }
}
