// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getSlangServerSettings } from './settings';

export interface SlangServerConfig {
  flags?: string;
  index?: Array<{ dirs?: string[]; excludeDirs?: string[] }>;
  build?: string;
  indexingThreads?: number;
  builds?: Array<{ name?: string; glob?: string; command?: string }>;
}

export class SlangConfigService {
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.workspaceFolders?.[0];
  }

  getConfigUri(workspaceFolder = this.getWorkspaceFolder()): vscode.Uri | undefined {
    if (!workspaceFolder) {
      return undefined;
    }
    return vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, getSlangServerSettings().configPath));
  }

  async readConfig(): Promise<SlangServerConfig | undefined> {
    const uri = this.getConfigUri();
    if (!uri || !fs.existsSync(uri.fsPath)) {
      return undefined;
    }
    return JSON.parse(await fs.promises.readFile(uri.fsPath, 'utf8')) as SlangServerConfig;
  }

  async configureProject(): Promise<boolean> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showWarningMessage('Open a workspace before configuring slang-server.');
      return false;
    }

    const filelists = await vscode.workspace.findFiles(
      new vscode.RelativePattern(workspaceFolder, '**/*.f'),
      new vscode.RelativePattern(workspaceFolder, '**/{.git,node_modules,build,sim}/**'),
      200
    );
    const selectedFilelists = await vscode.window.showQuickPick(
      filelists.map((uri) => ({
        label: path.relative(workspaceFolder.uri.fsPath, uri.fsPath).split(path.sep).join('/'),
        uri,
      })),
      {
        canPickMany: true,
        placeHolder: 'Select slang build/filelist entries',
      }
    );

    const indexDirs = await pickWorkspaceDirectories(workspaceFolder, 'Select directories to index');
    const excludeDirs = await vscode.window.showQuickPick(
      ['build', 'sim', 'node_modules', '.git', 'out', 'dist'].map((label) => ({ label })),
      {
        canPickMany: true,
        placeHolder: 'Select directory names to exclude while indexing',
      }
    );

    const build = selectedFilelists?.[0]?.label;
    const config: SlangServerConfig = {
      flags: selectedFilelists && selectedFilelists.length > 0
        ? selectedFilelists.map((item) => `-f ${item.label}`).join(' ')
        : undefined,
      index: [
        {
          dirs: indexDirs?.map((item) => item.label) ?? ['.'],
          excludeDirs: excludeDirs?.map((item) => item.label) ?? ['build', 'sim', 'node_modules'],
        },
      ],
      build,
      indexingThreads: 1,
    };

    await this.writeConfig(config);
    vscode.window.showInformationMessage('Slang project configuration updated.');
    return true;
  }

  async writeConfig(config: SlangServerConfig): Promise<void> {
    const uri = this.getConfigUri();
    if (!uri) {
      throw new Error('No workspace folder available for slang-server config.');
    }
    await fs.promises.mkdir(path.dirname(uri.fsPath), { recursive: true });
    await fs.promises.writeFile(uri.fsPath, `${JSON.stringify(config, null, 2)}\n`);
  }

  hasWasmUnsupportedCommandBuild(config: SlangServerConfig | undefined): boolean {
    return config?.builds?.some((build) => typeof build.command === 'string' && build.command.trim() !== '') ?? false;
  }
}

async function pickWorkspaceDirectories(
  workspaceFolder: vscode.WorkspaceFolder,
  placeHolder: string
): Promise<Array<vscode.QuickPickItem> | undefined> {
  const entries = await fs.promises.readdir(workspaceFolder.uri.fsPath, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => ({ label: entry.name }));
  if (dirs.length === 0) {
    return [{ label: '.' }];
  }
  return vscode.window.showQuickPick(dirs, {
    canPickMany: true,
    placeHolder,
  });
}
