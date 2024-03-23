// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { BsvInfoProviderManger } from '../BsvProvider';
import { CtagsManager } from '../ctags';
import { Logger } from '../logger';



export class VerilogDefinitionProvider implements vscode.DefinitionProvider {
  private logger: Logger;
  private ctagsManager: CtagsManager;
  constructor(logger: Logger,
    ctagsManager: CtagsManager){
    this.logger = logger;
    this.ctagsManager = ctagsManager;
  }

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.DefinitionLink[] | undefined> {
    this.logger.info('Definitions Requested: ' + document.uri);
    // find all matching symbols
    let definitions: vscode.DefinitionLink[] = await this.ctagsManager.findSymbol(document, position);
    this.logger.info(definitions.length + ' definitions returned');
    return definitions;
  }
}

export class BsvDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.LocationLink[] | vscode.Definition> {
    const provider = BsvInfoProviderManger.getInstance().getProvider();
    return provider.provideDefinition(document, position);
  }
}
