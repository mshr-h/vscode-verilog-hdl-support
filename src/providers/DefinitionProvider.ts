// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { CtagsManager } from '../ctags';
import { getExtensionLogger } from '../logging';



export class VerilogDefinitionProvider implements vscode.DefinitionProvider {
  private readonly logger = getExtensionLogger('Provider', 'Definition');
  private ctagsManager: CtagsManager;
  constructor(ctagsManager: CtagsManager) {
    this.ctagsManager = ctagsManager;
  }

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.DefinitionLink[] | undefined> {
    this.logger.info("Definitions requested", { uri: document.uri.toString() });
    // find all matching symbols
    const definitions: vscode.DefinitionLink[] = await this.ctagsManager.findSymbol(document, position);
    this.logger.info("Definitions returned", { count: definitions.length });
    return definitions;
  }
}
