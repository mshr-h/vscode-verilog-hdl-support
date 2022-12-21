import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { Logger, LogSeverity } from '../logger';

export class VerilogFormatProvider implements vscode.DocumentFormattingEditProvider {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }
  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    this.logger.log("Not implemented provideDocumentFormattingEdits()");
    return null;
  }
}