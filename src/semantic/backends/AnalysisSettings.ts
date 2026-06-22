// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { splitCommandLineArgs } from '../../utils/commandLine';

export type AnalysisEngineSetting = 'auto' | 'fast' | 'slang';

export interface AnalysisSettings {
  engine: AnalysisEngineSetting;
  slangPath: string;
  slangArguments: string[];
  cacheEnabled: boolean;
}

export function getAnalysisSettings(): AnalysisSettings {
  const analysisConfig = vscode.workspace.getConfiguration('verilog.analysis');
  const slangConfig = vscode.workspace.getConfiguration('verilog.analysis.slang');
  return {
    engine: normalizeEngine(analysisConfig.get<string>('engine', 'auto')),
    slangPath: slangConfig.get<string>('path', 'slang'),
    slangArguments: splitCommandLineArgs(slangConfig.get<string>('arguments', '')),
    cacheEnabled: analysisConfig.get<boolean>('cache.enabled', true),
  };
}

function normalizeEngine(value: string): AnalysisEngineSetting {
  if (value === 'fast' || value === 'slang') {
    return value;
  }
  return 'auto';
}
