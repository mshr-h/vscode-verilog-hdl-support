// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { BsvInfoProviderManger } from '../BsvProvider';
import { CtagsManager, Symbol } from '../ctags';
import { Logger } from '../logger';

export class VerilogDefinitionProvider implements vscode.DefinitionProvider {
  private logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.DefinitionLink[] | undefined> {
    this.logger.info('Definitions Requested: ' + document.uri);
    // get word start and end
    let textRange = document.getWordRangeAtPosition(position);
    if (!textRange || textRange.isEmpty) {
      return undefined;
    }
    // hover word
    let targetText = document.getText(textRange);
    let symbols: Symbol[] = await CtagsManager.getSymbols(document);
    let matchingSymbols: Symbol[] = [];
    let definitions: vscode.DefinitionLink[] = [];
    // find all matching symbols
    for (let i of symbols) {
      if (i.name === targetText) {
        matchingSymbols.push(i);
      }
    }
    for (let i of matchingSymbols) {
      definitions.push({
        targetUri: document.uri,
        targetRange: new vscode.Range(
          i.startPosition,
          new vscode.Position(i.startPosition.line, Number.MAX_VALUE)
        ),
        targetSelectionRange: new vscode.Range(i.startPosition, i.endPosition),
      });
    }
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
