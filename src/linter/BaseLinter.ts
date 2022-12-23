import * as vscode from 'vscode';

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

  public startLint(doc: vscode.TextDocument) {
    this.lint(doc);
  }

  public removeFileDiagnostics(doc: vscode.TextDocument) {
    this.diagnosticCollection.delete(doc.uri);
  }

  protected abstract lint(doc: vscode.TextDocument);
}
