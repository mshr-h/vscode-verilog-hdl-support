// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { DefinitionService } from '../hdl/DefinitionService';
import { getExtensionLogger } from '../logging';



export class VerilogDefinitionProvider implements vscode.DefinitionProvider {
  private readonly logger = getExtensionLogger('Provider', 'Definition');
  constructor(private readonly definitionService: DefinitionService) {
  }

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.DefinitionLink[] | undefined> {
    this.logger.info("Definitions requested", { uri: document.uri.toString() });
    const definitions: vscode.DefinitionLink[] = await this.definitionService.provideDefinition(document, position);
    this.logger.info("Definitions returned", { count: definitions.length });
    return definitions;
  }
}
