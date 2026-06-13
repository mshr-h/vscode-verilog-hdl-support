// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ReferenceService } from '../hdl/ReferenceService';
import { getExtensionLogger } from '../logging';

export class VerilogReferenceProvider implements vscode.ReferenceProvider {
  private readonly logger = getExtensionLogger('Provider', 'Reference');

  constructor(private readonly referenceService: ReferenceService) {}

  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): Promise<vscode.Location[] | undefined> {
    this.logger.info('References requested', { uri: document.uri.toString() });
    const references = await this.referenceService.provideReferences(document, position, context, token);
    this.logger.info('References returned', { count: references.length });
    return references;
  }
}
