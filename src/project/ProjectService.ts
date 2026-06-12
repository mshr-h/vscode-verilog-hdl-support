// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';
import { FileContextResolver } from './FileContextResolver';
import { ProjectLoader } from './ProjectLoader';
import {
  cloneSnapshot,
  PROJECT_DIAGNOSTIC_SOURCE,
  type FileContext,
  type ProjectSnapshot,
} from './ProjectTypes';

const logger = getExtensionLogger('Project', 'Service');

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

  async reload(reason = 'unspecified'): Promise<ProjectSnapshot> {
    this.version += 1;
    logger.info('Reloading Verilog project', { reason, version: this.version });
    try {
      this.snapshot = await this.loader.load(this.version);
      logger.info('Reloaded Verilog project', {
        reason,
        version: this.snapshot.version,
        compileUnits: this.snapshot.compileUnits.length,
        files: this.snapshot.compileUnits.reduce((sum, compileUnit) => sum + compileUnit.files.length, 0),
        diagnostics: this.snapshot.diagnostics.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to reload Verilog project', { reason, error: message });
      this.snapshot = {
        version: this.version,
        workspaceRoot: this.snapshot.workspaceRoot,
        activeTargetId: '',
        compileUnits: [],
        diagnostics: [
          {
            severity: 'error',
            message: `Project loading failed: ${message}`,
            source: PROJECT_DIAGNOSTIC_SOURCE,
            code: 'project-load-failed',
          },
        ],
      };
    }
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
