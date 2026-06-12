// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ProjectService } from '../project/ProjectService';
import type { CompileUnit, FileContext, MacroDefine, SourceFileRef } from '../project/ProjectTypes';

export interface LintProjectContext {
  includePaths: string[];
  defineArgs: string[];
}

export interface CompileUnitLintContext {
  ownerDocument: vscode.TextDocument;
  fileContext: FileContext;
  compileUnit: CompileUnit;
  includeDirs: vscode.Uri[];
  defines: Record<string, MacroDefine>;
  files: SourceFileRef[];
  workspaceRoot: vscode.Uri;
}

export function getLintProjectContext(
  projectService: ProjectService | undefined,
  doc: vscode.TextDocument
): LintProjectContext {
  if (!vscode.workspace.getConfiguration('verilog.linting').get<boolean>('useProjectContext', false)) {
    return { includePaths: [], defineArgs: [] };
  }
  const context = projectService?.getPreferredFileContext(doc.uri);
  if (!context) {
    return { includePaths: [], defineArgs: [] };
  }
  return {
    includePaths: context.includeDirs.map((dir) => dir.fsPath),
    defineArgs: Object.values(context.defines).map(formatMacroDefine),
  };
}

export function formatMacroDefine(define: MacroDefine): string {
  return define.value === true ? define.name : `${define.name}=${define.value}`;
}

export function getCompileUnitLintContext(
  projectService: ProjectService | undefined,
  doc: vscode.TextDocument
): CompileUnitLintContext | undefined {
  const fileContext = projectService?.getPreferredFileContext(doc.uri);
  if (!fileContext) {
    return undefined;
  }
  const snapshot = projectService?.getSnapshot();
  const compileUnit = snapshot?.compileUnits.find((candidate) => candidate.id === fileContext.compileUnitId);
  if (!snapshot || !compileUnit) {
    return undefined;
  }
  return {
    ownerDocument: doc,
    fileContext,
    compileUnit,
    includeDirs: compileUnit.includeDirs.slice(),
    defines: { ...compileUnit.defines },
    files: compileUnit.files.slice().sort((a, b) => a.order - b.order),
    workspaceRoot: snapshot.workspaceRoot,
  };
}
