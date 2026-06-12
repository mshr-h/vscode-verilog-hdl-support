// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';
import type { ProjectService } from '../project/ProjectService';
import type { ProjectSnapshot } from '../project/ProjectTypes';
import { FastIndexerBackend } from './backends/FastIndexerBackend';
import { SemanticIndex } from './SemanticIndex';

const logger = getExtensionLogger('Semantic', 'IndexService');

export class IndexService implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private index = new SemanticIndex(0, []);
  private rebuildSerial = 0;

  constructor(
    projectService: ProjectService,
    private readonly backend = new FastIndexerBackend()
  ) {
    this.disposables.push(
      projectService.onDidChangeSnapshot((snapshot) => {
        void this.rebuild(snapshot);
      })
    );
  }

  getIndex(): SemanticIndex {
    return this.index;
  }

  async rebuild(snapshot: ProjectSnapshot): Promise<SemanticIndex> {
    const serial = this.rebuildSerial + 1;
    this.rebuildSerial = serial;
    logger.info('Rebuilding Verilog semantic index', {
      version: snapshot.version,
      compileUnits: snapshot.compileUnits.length,
      files: snapshot.compileUnits.reduce((sum, compileUnit) => sum + compileUnit.files.length, 0),
    });
    try {
      const symbols = await this.backend.build(snapshot);
      if (serial === this.rebuildSerial) {
        this.index = new SemanticIndex(snapshot.version, symbols);
        logger.info('Rebuilt Verilog semantic index', {
          version: snapshot.version,
          symbols: symbols.length,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to rebuild Verilog semantic index', {
        version: snapshot.version,
        error: message,
      });
      if (serial === this.rebuildSerial) {
        this.index = new SemanticIndex(snapshot.version, []);
      }
    }
    return this.index;
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
