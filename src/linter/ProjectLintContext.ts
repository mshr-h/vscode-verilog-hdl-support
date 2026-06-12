// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ProjectService } from '../project/ProjectService';
import type { MacroDefine } from '../project/ProjectTypes';

export interface LintProjectContext {
  includePaths: string[];
  defineArgs: string[];
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
