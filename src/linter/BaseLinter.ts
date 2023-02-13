// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';

export default abstract class BaseLinter {
  protected diagnosticCollection: vscode.DiagnosticCollection;
  name: string;
  protected logger: vscode.LogOutputChannel;

  constructor(
    name: string,
    diagnosticCollection: vscode.DiagnosticCollection,
    logger: vscode.LogOutputChannel
  ) {
    this.diagnosticCollection = diagnosticCollection;
    this.name = name;
    this.logger = logger;
  }

  // returns absolute path
  protected resolvePath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
      return inputPath;
    }
    return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, inputPath);
  }

  public startLint(doc: vscode.TextDocument) {
    this.lint(doc);
  }

  public removeFileDiagnostics(doc: vscode.TextDocument) {
    this.diagnosticCollection.delete(doc.uri);
  }

  protected abstract lint(doc: vscode.TextDocument);
}
