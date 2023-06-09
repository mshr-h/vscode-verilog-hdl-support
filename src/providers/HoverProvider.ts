// SPDX-License-Identifier: MIT
// import * as vscode from 'vscode';
import * as vscode from 'vscode';
import { BsvInfoProviderManger } from '../BsvProvider';
import { CtagsManager, Symbol } from '../ctags';
import { Logger } from '../logger';

export class VerilogHoverProvider implements vscode.HoverProvider {
  // lang: verilog / systemverilog
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    this.logger.info('Hover requested');
    // get word start and end
    let textRange = document.getWordRangeAtPosition(position);
    if (!textRange || textRange.isEmpty) {
      return undefined;
    }
    // hover word
    let targetText = document.getText(textRange);
    let symbols: Symbol[] = await CtagsManager.getSymbols(document);
    // find symbol
    for (let i of symbols) {
      // returns the first found tag. Disregards others
      // TODO: very basic hover implementation. Can be extended
      if (i.name === targetText) {
        let codeRange = new vscode.Range(
          i.startPosition,
          new vscode.Position(i.startPosition.line, Number.MAX_VALUE)
        );
        let code = document.getText(codeRange).trim();
        let hoverText: vscode.MarkdownString = new vscode.MarkdownString();
        hoverText.appendCodeblock(code, document.languageId);
        this.logger.info('Hover object returned');
        return new vscode.Hover(hoverText);
      }
    }
    this.logger.warn('Hover object not found');
    return undefined;
  }
}

export class BsvHoverProvider implements vscode.HoverProvider {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const provider = BsvInfoProviderManger.getInstance().getProvider();
    var hover = provider.getHover(document, position);
    return hover;
  }
}
