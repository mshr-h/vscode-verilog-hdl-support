// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export interface SlangConfigStatus {
  workspaceConfig?: vscode.Uri;
  localConfig?: vscode.Uri;
  userConfig?: vscode.Uri;
  ok: boolean;
  error?: string;
  flags?: unknown;
  build?: unknown;
  buildPattern?: unknown;
  builds?: unknown;
}

export class SlangConfigService {
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.workspaceFolders?.[0];
  }

  getWorkspaceConfigUri(): vscode.Uri | undefined {
    const folder = this.getWorkspaceFolder();
    return folder ? vscode.Uri.file(path.join(folder.uri.fsPath, '.slang', 'server.json')) : undefined;
  }

  getLocalConfigUri(): vscode.Uri | undefined {
    const folder = this.getWorkspaceFolder();
    return folder ? vscode.Uri.file(path.join(folder.uri.fsPath, '.slang', 'local', 'server.json')) : undefined;
  }

  getUserConfigUri(): vscode.Uri {
    return vscode.Uri.file(path.join(os.homedir(), '.slang', 'server.json'));
  }

  async getStatus(): Promise<SlangConfigStatus> {
    const workspaceConfig = this.existingUri(this.getWorkspaceConfigUri());
    const localConfig = this.existingUri(this.getLocalConfigUri());
    const userConfig = this.existingUri(this.getUserConfigUri());
    const status: SlangConfigStatus = {
      workspaceConfig,
      localConfig,
      userConfig,
      ok: true,
    };
    if (!workspaceConfig) {
      return status;
    }
    try {
      const parsed = JSON.parse(await fs.promises.readFile(workspaceConfig.fsPath, 'utf8')) as Record<string, unknown>;
      status.flags = parsed.flags;
      status.build = parsed.build;
      status.buildPattern = parsed.buildPattern;
      status.builds = parsed.builds;
    } catch (err) {
      status.ok = false;
      status.error = err instanceof Error ? err.message : String(err);
    }
    return status;
  }

  async findCandidateFilelists(): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(
      '{**/*.f,**/*.F,**/*.svf,**/files.f,**/filelist.f,**/rtl.f}',
      '{**/.git/**,**/node_modules/**,**/build/**,**/sim/**}'
    );
  }

  createDefaultConfig(filelist: vscode.Uri, indexDirs: string[]): string {
    const folder = this.getWorkspaceFolder();
    const relFilelist = folder ? path.relative(folder.uri.fsPath, filelist.fsPath).replace(/\\/g, '/') : filelist.fsPath;
    const config = {
      flags: `-f ${relFilelist}`,
      index: [
        {
          dirs: indexDirs,
          excludeDirs: ['build', 'sim', 'node_modules'],
        },
      ],
      build: relFilelist,
    };
    return `${JSON.stringify(config, null, 2)}\n`;
  }

  inferIndexDirs(filelist: vscode.Uri): string[] {
    const folder = this.getWorkspaceFolder();
    if (!folder) {
      return ['rtl'];
    }
    const dirs = new Set<string>();
    const relDir = path.relative(folder.uri.fsPath, path.dirname(filelist.fsPath)).replace(/\\/g, '/');
    if (relDir && relDir !== '.') {
      dirs.add(relDir);
    }
    for (const name of ['rtl', 'src', 'tb']) {
      if (fs.existsSync(path.join(folder.uri.fsPath, name))) {
        dirs.add(name);
      }
    }
    return dirs.size > 0 ? [...dirs] : ['rtl'];
  }

  async writeWorkspaceConfig(filelist: vscode.Uri, indexDirs?: string[]): Promise<vscode.Uri> {
    const uri = this.getWorkspaceConfigUri();
    if (!uri) {
      throw new Error('Open a workspace folder before creating .slang/server.json.');
    }
    await fs.promises.mkdir(path.dirname(uri.fsPath), { recursive: true });
    await fs.promises.writeFile(uri.fsPath, this.createDefaultConfig(filelist, indexDirs ?? this.inferIndexDirs(filelist)), 'utf8');
    return uri;
  }

  private existingUri(uri: vscode.Uri | undefined): vscode.Uri | undefined {
    return uri && fs.existsSync(uri.fsPath) ? uri : undefined;
  }
}
