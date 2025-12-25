// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { buildTclspInitializationOptions } from '../languageServer/tclspOptions';

suite('tclsp initialization options', () => {
  test('builds global and workspace settings', async () => {
    const config = vscode.workspace.getConfiguration('verilog.languageServer.tclsp');
    const inspect = config.inspect<string>('configPath');
    const previousGlobal = inspect?.globalValue;
    const previousWorkspace = inspect?.workspaceValue;
    const folder = vscode.workspace.workspaceFolders?.[0];
    const hasWorkspace = Boolean(folder);
    let previousFolder: string | undefined;
    if (folder) {
      previousFolder = vscode.workspace
        .getConfiguration('verilog.languageServer.tclsp', folder.uri)
        .get('configPath');
    }

    try {
      await config.update('configPath', '/tmp/global.tclint', vscode.ConfigurationTarget.Global);
      if (hasWorkspace) {
        await config.update(
          'configPath',
          'workspace.tclint',
          vscode.ConfigurationTarget.Workspace
        );
      }
      if (folder) {
        const folderConfig = vscode.workspace.getConfiguration(
          'verilog.languageServer.tclsp',
          folder.uri
        );
        await folderConfig.update(
          'configPath',
          'folder.tclint',
          vscode.ConfigurationTarget.WorkspaceFolder
        );
      }

      const result = buildTclspInitializationOptions();
      assert.ok(result, 'Expected initialization options');
      const globalSettings = (result as any).globalSettings;
      assert.strictEqual(globalSettings?.configPath, '/tmp/global.tclint');

      if (folder) {
        const settings = (result as any).settings;
        assert.ok(Array.isArray(settings), 'Expected workspace settings');
        const entry = settings.find((item: any) => item.cwd === folder.uri.fsPath);
        assert.ok(entry, 'Expected workspace setting for folder');
        assert.strictEqual(entry.configPath, 'folder.tclint');
      }
    } finally {
      await config.update(
        'configPath',
        previousGlobal ?? '',
        vscode.ConfigurationTarget.Global
      );
      if (hasWorkspace) {
        await config.update(
          'configPath',
          previousWorkspace ?? '',
          vscode.ConfigurationTarget.Workspace
        );
      }
      if (folder) {
        const folderConfig = vscode.workspace.getConfiguration(
          'verilog.languageServer.tclsp',
          folder.uri
        );
        await folderConfig.update(
          'configPath',
          previousFolder ?? '',
          vscode.ConfigurationTarget.WorkspaceFolder
        );
      }
    }
  });
});
