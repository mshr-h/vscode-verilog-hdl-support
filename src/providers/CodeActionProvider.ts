// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ModuleInstanceCodeActionService } from '../hdl/ModuleInstanceCodeActionService';
import { getExtensionLogger } from '../logging';

export class VerilogCodeActionProvider implements vscode.CodeActionProvider {
  private readonly logger = getExtensionLogger('Provider', 'CodeAction');

  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  constructor(private readonly codeActionService: ModuleInstanceCodeActionService) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] {
    this.logger.info('Code actions requested', { uri: document.uri.toString() });
    const actions = this.codeActionService.provideCodeActions(document, range);
    this.logger.info('Code actions returned', { count: actions.length });
    return actions;
  }
}
