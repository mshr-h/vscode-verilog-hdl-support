// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../logger';

export default abstract class BaseLinter {
  protected diagnosticCollection: vscode.DiagnosticCollection;
  name: string;
  protected logger: Logger;

  constructor(name: string, diagnosticCollection: vscode.DiagnosticCollection, logger: Logger) {
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

  protected abstract convertToSeverity(severityString: string): vscode.DiagnosticSeverity;
  protected abstract lint(doc: vscode.TextDocument);
}
