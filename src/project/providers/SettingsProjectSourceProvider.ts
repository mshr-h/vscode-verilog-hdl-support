// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export interface ProjectSettings {
  enabled: boolean;
  filelists: string[];
  activeTarget: string;
  topModules: string[];
  includeDirs: string[];
  defines: Record<string, string | boolean | number>;
  exclude: string[];
  maxAutoDiscoveredFiles: number;
}

export class SettingsProjectSourceProvider {
  getSettings(): ProjectSettings {
    const config = vscode.workspace.getConfiguration('verilog.project');
    return readProjectSettings(config);
  }
}

export function readProjectSettings(config: Pick<vscode.WorkspaceConfiguration, 'get'>): ProjectSettings {
  return {
    enabled: config.get<boolean>('enabled', false),
    filelists: config.get<string[]>('filelists', []),
    activeTarget: config.get<string>('activeTarget', ''),
    topModules: config.get<string[]>('topModules', []),
    includeDirs: config.get<string[]>('includeDirs', []),
    defines: config.get<Record<string, string | boolean | number>>('defines', {}),
    exclude: config.get<string[]>('exclude', [
      '**/.git/**',
      '**/node_modules/**',
      '**/build/**',
      '**/sim/**',
    ]),
    maxAutoDiscoveredFiles: Math.max(1, config.get<number>('maxAutoDiscoveredFiles', 5000)),
  };
}
