// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export function buildTclspInitializationOptions(): Record<string, unknown> | undefined {
  const config = vscode.workspace.getConfiguration('verilog.languageServer.tclsp');
  const inspect = config.inspect<string>('configPath');
  const globalConfig = inspect?.globalValue?.trim() ?? '';
  const workspaceConfig = inspect?.workspaceValue?.trim() ?? '';
  const settings: Array<{ cwd: string; configPath: string }> = [];

  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const folderConfig =
      vscode.workspace
        .getConfiguration('verilog.languageServer.tclsp', folder.uri)
        .get<string>('configPath')
        ?.trim() ?? '';
    const effectiveConfig = folderConfig || workspaceConfig;
    if (effectiveConfig.length > 0) {
      settings.push({ cwd: folder.uri.fsPath, configPath: effectiveConfig });
    }
  }

  const initOptions: Record<string, unknown> = {};
  if (globalConfig.length > 0) {
    initOptions.globalSettings = { configPath: globalConfig };
  }
  if (settings.length > 0) {
    initOptions.settings = settings;
  }

  return Object.keys(initOptions).length > 0 ? initOptions : undefined;
}
