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
}

export class SettingsProjectSourceProvider {
  getSettings(): ProjectSettings {
    const config = vscode.workspace.getConfiguration('verilog.project');
    return {
      enabled: config.get<boolean>('enabled', true),
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
    };
  }
}
