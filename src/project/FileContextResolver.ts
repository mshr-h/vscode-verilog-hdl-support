// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
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
    return (
      contexts.find((context) => context.compileUnitId === this.snapshot.activeTargetId) ??
      contexts.at(0)
    );
  }
}
