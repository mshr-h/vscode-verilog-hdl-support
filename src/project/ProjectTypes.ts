// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export type SourceLanguageId = 'verilog' | 'systemverilog' | 'unknown';
export type SourceFileKind = 'source' | 'include' | 'library' | 'unknown';
export type ProjectDiagnosticSeverity = 'error' | 'warning' | 'info';
export type MacroDefineSource = 'settings' | 'filelist' | 'source';

export interface ProjectSourceRef {
  type: 'settings' | 'filelist' | 'auto';
  uri?: vscode.Uri;
}

export interface MacroDefine {
  name: string;
  value: string | true;
  source: MacroDefineSource;
  location?: vscode.Location;
}

export interface SourceFileRef {
  uri: vscode.Uri;
  languageId: SourceLanguageId;
  kind: SourceFileKind;
  order: number;
}

export interface ProjectDiagnostic {
  severity: ProjectDiagnosticSeverity;
  message: string;
  location?: vscode.Location;
  source: string;
  code?: string;
}

export interface CompileUnit {
  id: string;
  name: string;
  root: vscode.Uri;
  files: SourceFileRef[];
  includeDirs: vscode.Uri[];
  defines: Record<string, MacroDefine>;
  topModules: string[];
  source: ProjectSourceRef;
}

export interface ProjectSnapshot {
  version: number;
  workspaceRoot: vscode.Uri;
  activeTargetId: string;
  compileUnits: CompileUnit[];
  diagnostics: ProjectDiagnostic[];
}

export interface FileContext {
  file: vscode.Uri;
  compileUnitId: string;
  includeDirs: vscode.Uri[];
  defines: Record<string, MacroDefine>;
}

export const PROJECT_DIAGNOSTIC_SOURCE = 'verilog.project';

export function detectSourceLanguageId(uri: vscode.Uri): SourceLanguageId {
  const path = uri.fsPath.toLowerCase();
  if (path.endsWith('.sv') || path.endsWith('.svh')) {
    return 'systemverilog';
  }
  if (path.endsWith('.v') || path.endsWith('.vh') || path.endsWith('.vl')) {
    return 'verilog';
  }
  return 'unknown';
}

export function cloneDefines(
  defines: Record<string, MacroDefine>
): Record<string, MacroDefine> {
  return Object.fromEntries(
    Object.entries(defines).map(([name, define]) => [name, { ...define }])
  );
}

export function cloneCompileUnit(compileUnit: CompileUnit): CompileUnit {
  return {
    ...compileUnit,
    files: compileUnit.files.map((file) => ({ ...file })),
    includeDirs: compileUnit.includeDirs.slice(),
    defines: cloneDefines(compileUnit.defines),
    topModules: compileUnit.topModules.slice(),
    source: { ...compileUnit.source },
  };
}

export function cloneSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    version: snapshot.version,
    workspaceRoot: snapshot.workspaceRoot,
    activeTargetId: snapshot.activeTargetId,
    compileUnits: snapshot.compileUnits.map(cloneCompileUnit),
    diagnostics: snapshot.diagnostics.map((diagnostic) => ({ ...diagnostic })),
  };
}
