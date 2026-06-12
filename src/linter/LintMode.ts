// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export type LintMode = 'file' | 'compileUnit';
export type LintRunTrigger = 'automatic' | 'manual';

export interface LintRunOptions {
  trigger: LintRunTrigger;
}

export interface CompileUnitLintSettings {
  mode: LintMode;
  maxFiles: number;
  warnBeforeLargeRun: boolean;
}

const COMPILE_UNIT_LINTERS = new Set(['slang', 'verilator', 'iverilog']);

export function getLintRunSettings(): CompileUnitLintSettings {
  const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
  const compileUnitConfig = vscode.workspace.getConfiguration('verilog.linting.compileUnit');
  return {
    mode: lintConfig.get<LintMode>('mode', 'file'),
    maxFiles: Math.max(1, compileUnitConfig.get<number>('maxFiles', 500)),
    warnBeforeLargeRun: compileUnitConfig.get<boolean>('warnBeforeLargeRun', true),
  };
}

export function supportsCompileUnitLint(linterName: string): boolean {
  return COMPILE_UNIT_LINTERS.has(linterName);
}
