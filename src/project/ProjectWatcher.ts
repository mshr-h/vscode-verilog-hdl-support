// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ProjectService } from './ProjectService';
import { SettingsProjectSourceProvider } from './providers/SettingsProjectSourceProvider';

export interface ProjectWatcherOptions {
  debounceMs?: number;
  watch?: boolean;
  createFileSystemWatcher?: typeof vscode.workspace.createFileSystemWatcher;
  onDidChangeConfiguration?: typeof vscode.workspace.onDidChangeConfiguration;
  settingsProvider?: Pick<SettingsProjectSourceProvider, 'getSettings'>;
}

export class ProjectWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly filelistWatcherDisposables: vscode.Disposable[] = [];
  private reloadTimer: NodeJS.Timeout | undefined;
  private filelistWatcher: vscode.FileSystemWatcher | undefined;
  private readonly debounceMs: number;
  private readonly createFileSystemWatcher: typeof vscode.workspace.createFileSystemWatcher;
  private readonly onDidChangeConfiguration: typeof vscode.workspace.onDidChangeConfiguration;
  private readonly settingsProvider: Pick<SettingsProjectSourceProvider, 'getSettings'>;

  constructor(
    private readonly projectService: ProjectService,
    options: ProjectWatcherOptions = {}
  ) {
    this.debounceMs = options.debounceMs ?? 300;
    this.createFileSystemWatcher = options.createFileSystemWatcher
      ?? vscode.workspace.createFileSystemWatcher.bind(vscode.workspace);
    this.onDidChangeConfiguration = options.onDidChangeConfiguration
      ?? vscode.workspace.onDidChangeConfiguration.bind(vscode.workspace);
    this.settingsProvider = options.settingsProvider ?? new SettingsProjectSourceProvider();
    if (options.watch === false) {
      return;
    }
    this.disposables.push(
      this.onDidChangeConfiguration((event) => {
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
    this.disposeFilelistWatcher();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private refreshFilelistWatcher(): void {
    this.disposeFilelistWatcher();
    if (!this.isProjectEnabled()) {
      return;
    }

    this.filelistWatcher = this.createFileSystemWatcher('**/*.{f,F}');
    this.filelistWatcherDisposables.push(this.filelistWatcher);
    this.filelistWatcherDisposables.push(
      this.filelistWatcher.onDidCreate(() => this.scheduleReload('filelist created')),
      this.filelistWatcher.onDidChange(() => this.scheduleReload('filelist changed')),
      this.filelistWatcher.onDidDelete(() => this.scheduleReload('filelist deleted'))
    );
  }

  private disposeFilelistWatcher(): void {
    while (this.filelistWatcherDisposables.length > 0) {
      this.filelistWatcherDisposables.pop()?.dispose();
    }
    this.filelistWatcher = undefined;
  }

  private isProjectEnabled(): boolean {
    return this.settingsProvider.getSettings().enabled;
  }
}
