// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { FileContextResolver } from './FileContextResolver';
import { ProjectLoader } from './ProjectLoader';
import { cloneSnapshot, type FileContext, type ProjectSnapshot } from './ProjectTypes';

export class ProjectService implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<ProjectSnapshot>();
  private snapshot: ProjectSnapshot;
  private version = 0;

  readonly onDidChangeSnapshot = this.emitter.event;

  constructor(private readonly loader = new ProjectLoader()) {
    const workspaceRoot = (vscode.workspace.workspaceFolders ?? []).at(0)?.uri ?? vscode.Uri.file(process.cwd());
    this.snapshot = {
      version: 0,
      workspaceRoot,
      activeTargetId: '',
      compileUnits: [],
      diagnostics: [],
    };
  }

  getSnapshot(): ProjectSnapshot {
    return cloneSnapshot(this.snapshot);
  }

  async reload(_reason?: string): Promise<ProjectSnapshot> {
    this.version += 1;
    this.snapshot = await this.loader.load(this.version);
    const cloned = this.getSnapshot();
    this.emitter.fire(cloned);
    return cloned;
  }

  getFileContexts(uri: vscode.Uri): FileContext[] {
    return new FileContextResolver(this.snapshot).getFileContexts(uri);
  }

  getPreferredFileContext(uri: vscode.Uri): FileContext | undefined {
    return new FileContextResolver(this.snapshot).getPreferredFileContext(uri);
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
