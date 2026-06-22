// SPDX-License-Identifier: MIT
import type { ProjectSnapshot } from '../../project/ProjectTypes';
import type { SymbolRecord } from '../SymbolRecords';

export type AnalysisEngine = 'fast' | 'slang';

export interface AnalysisMetadata {
  requestedEngine: 'auto' | AnalysisEngine;
  actualEngine: AnalysisEngine;
  fallbackReason?: string;
  cacheEnabled?: boolean;
}

export interface AnalysisResult {
  symbols: SymbolRecord[];
  metadata: AnalysisMetadata;
}

export interface AnalysisBackend {
  build(snapshot: ProjectSnapshot): Promise<AnalysisResult>;
}
