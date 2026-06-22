// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';
import type { ProjectService } from '../project/ProjectService';
import type { ProjectSnapshot } from '../project/ProjectTypes';
import type { AnalysisResult } from './backends/AnalysisBackend';
import { ConfiguredAnalysisBackend } from './backends/ConfiguredAnalysisBackend';
import { SemanticIndex } from './SemanticIndex';
import type { SymbolRecord } from './SymbolRecords';

const logger = getExtensionLogger('Semantic', 'IndexService');

export class IndexService implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<SemanticIndex>();
  private readonly disposables: vscode.Disposable[] = [];
  private index = new SemanticIndex(0, []);
  private rebuildSerial = 0;

  readonly onDidChangeIndex = this.emitter.event;

  constructor(
    private readonly projectService: ProjectService,
    private readonly backend: { build(snapshot: ProjectSnapshot): Promise<AnalysisResult | SymbolRecord[]> } =
      new ConfiguredAnalysisBackend()
  ) {
    this.disposables.push(
      projectService.onDidChangeSnapshot((snapshot) => {
        void this.rebuild(snapshot);
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('verilog.analysis')) {
          void this.rebuild(this.projectService.getSnapshot());
        }
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
      const result = toAnalysisResult(await this.backend.build(snapshot));
      if (serial === this.rebuildSerial) {
        this.index = new SemanticIndex(snapshot.version, result.symbols, result.metadata);
        this.emitter.fire(this.index);
        logger.info('Rebuilt Verilog semantic index', {
          version: snapshot.version,
          symbols: result.symbols.length,
          engine: result.metadata.actualEngine,
          requestedEngine: result.metadata.requestedEngine,
          fallbackReason: result.metadata.fallbackReason,
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
        this.emitter.fire(this.index);
      }
    }
    return this.index;
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.emitter.dispose();
  }
}

function toAnalysisResult(result: AnalysisResult | SymbolRecord[]): AnalysisResult {
  if (Array.isArray(result)) {
    return {
      symbols: result,
      metadata: {
        requestedEngine: 'fast',
        actualEngine: 'fast',
      },
    };
  }
  return result;
}
