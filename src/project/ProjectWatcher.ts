// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ProjectService } from './ProjectService';

export interface ProjectWatcherOptions {
  debounceMs?: number;
  watch?: boolean;
}

export class ProjectWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private reloadTimer: NodeJS.Timeout | undefined;
  private filelistWatcher: vscode.FileSystemWatcher | undefined;
  private readonly debounceMs: number;

  constructor(
    private readonly projectService: ProjectService,
    options: ProjectWatcherOptions = {}
  ) {
    this.debounceMs = options.debounceMs ?? 300;
    if (options.watch === false) {
      return;
    }
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration('verilog.project')) {
          return;
        }
        this.scheduleReload('configuration changed');
        this.refreshFilelistWatcher();
      })
    );
    this.refreshFilelistWatcher();
  }

  scheduleReload(reason: string): void {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = undefined;
      void this.projectService.reload(reason);
    }, this.debounceMs);
  }

  dispose(): void {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = undefined;
    }
    this.filelistWatcher?.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private refreshFilelistWatcher(): void {
    this.filelistWatcher?.dispose();
    this.filelistWatcher = vscode.workspace.createFileSystemWatcher('**/*.{f,F}');
    this.disposables.push(this.filelistWatcher);
    this.filelistWatcher.onDidCreate(() => this.scheduleReload('filelist created'), undefined, this.disposables);
    this.filelistWatcher.onDidChange(() => this.scheduleReload('filelist changed'), undefined, this.disposables);
    this.filelistWatcher.onDidDelete(() => this.scheduleReload('filelist deleted'), undefined, this.disposables);
  }
}
