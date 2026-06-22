// SPDX-License-Identifier: MIT
import type { ProjectSnapshot } from '../../project/ProjectTypes';
import type { AnalysisResult } from './AnalysisBackend';
import { getAnalysisSettings } from './AnalysisSettings';
import { FastIndexerBackend } from './FastIndexerBackend';
import { SlangIndexerBackend } from './SlangIndexerBackend';

export class ConfiguredAnalysisBackend {
  constructor(private readonly fastBackend = new FastIndexerBackend()) {}

  async build(snapshot: ProjectSnapshot): Promise<AnalysisResult> {
    const settings = getAnalysisSettings();
    if (settings.engine === 'fast') {
      return {
        symbols: await this.fastBackend.build(snapshot),
        metadata: {
          requestedEngine: 'fast',
          actualEngine: 'fast',
          cacheEnabled: settings.cacheEnabled,
        },
      };
    }

    const result = await new SlangIndexerBackend(settings, this.fastBackend).build(snapshot);
    return {
      ...result,
      metadata: {
        ...result.metadata,
        requestedEngine: settings.engine,
      },
    };
  }
}
