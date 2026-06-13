// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getActiveCompileUnit } from './ProjectTargetResolver';
import { cloneDefines, type FileContext, type ProjectSnapshot } from './ProjectTypes';

export class FileContextResolver {
  constructor(private readonly snapshot: ProjectSnapshot) {}

  getFileContexts(uri: vscode.Uri): FileContext[] {
    const contexts: FileContext[] = [];
    for (const compileUnit of this.snapshot.compileUnits) {
      if (!compileUnit.files.some((file) => file.uri.fsPath === uri.fsPath)) {
        continue;
      }
      contexts.push({
        file: uri,
        compileUnitId: compileUnit.id,
        includeDirs: compileUnit.includeDirs.slice(),
        defines: cloneDefines(compileUnit.defines),
      });
    }
    return contexts;
  }

  getPreferredFileContext(uri: vscode.Uri): FileContext | undefined {
    const contexts = this.getFileContexts(uri);
    const activeCompileUnit = getActiveCompileUnit(this.snapshot);
    return (
      contexts.find((context) => context.compileUnitId === activeCompileUnit?.id) ??
      contexts.at(0)
    );
  }
}
