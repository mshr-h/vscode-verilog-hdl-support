// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';

export class PathMapper {
  constructor(
    private readonly workspaceFolder: vscode.WorkspaceFolder | undefined,
    private readonly workspaceMount = '/workspace',
    private readonly tmpMount = '/tmp'
  ) {}

  toWasiPath(input: vscode.Uri | string): string {
    const fsPath = typeof input === 'string' ? input : input.fsPath;
    const workspacePath = this.workspaceFolder?.uri.fsPath;
    if (workspacePath) {
      const relative = path.relative(workspacePath, fsPath);
      if (relative.length === 0) {
        return this.workspaceMount;
      }
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        return `${this.workspaceMount}/${relative.split(path.sep).join('/')}`;
      }
    }
    if (fsPath.startsWith('/tmp/') || fsPath === '/tmp') {
      return `${this.tmpMount}${fsPath.slice('/tmp'.length)}`;
    }
    return fsPath.split(path.sep).join('/');
  }

  toVscodeUri(wasiPath: string): vscode.Uri {
    const normalized = wasiPath.replace(/\\/g, '/');
    if (normalized === this.workspaceMount || normalized.startsWith(`${this.workspaceMount}/`)) {
      const workspacePath = this.workspaceFolder?.uri.fsPath;
      if (workspacePath) {
        const relative = normalized.slice(this.workspaceMount.length).replace(/^\//, '');
        return vscode.Uri.file(path.join(workspacePath, ...relative.split('/').filter(Boolean)));
      }
    }
    return vscode.Uri.file(normalized);
  }
}
