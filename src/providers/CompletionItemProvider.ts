// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { CompletionService } from '../hdl/CompletionService';
import { getExtensionLogger } from '../logging';

export class VerilogCompletionItemProvider implements vscode.CompletionItemProvider {
  private readonly logger = getExtensionLogger('Provider', 'CompletionItem');
  constructor(private readonly completionService: CompletionService) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    this.logger.info("Completion items requested", { uri: document.uri.toString() });
    const items = await this.completionService.provideCompletionItems(document, position, context);
    this.logger.info("Completion items returned", { count: items.length });
    return items;
  }
}
