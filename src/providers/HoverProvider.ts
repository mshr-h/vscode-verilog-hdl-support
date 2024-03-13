// SPDX-License-Identifier: MIT
// import * as vscode from 'vscode';
import * as vscode from 'vscode';
import { BsvInfoProviderManger } from '../BsvProvider';
import { CtagsManager, Symbol } from '../ctags';
import { Logger } from '../logger';

export class VerilogHoverProvider implements vscode.HoverProvider {
  // lang: verilog / systemverilog
  private logger: Logger;
  private ctagsManager: CtagsManager;
  constructor(logger: Logger,
    ctagsManager: CtagsManager){
    this.logger = logger;
    this.ctagsManager = ctagsManager;
  }

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    this.logger.info('Hover requested');
    let matches: vscode.DefinitionLink[] = await this.ctagsManager.findSymbol(document, position);
    // find symbol
    for (let i of matches) {
      // returns the first found tag. Disregards others
      // TODO: very basic hover implementation. Can be extended
      let doc = document;
      if (i.targetUri !== document.uri) {
        doc = await vscode.workspace.openTextDocument(i.targetUri);
      }
      // make a range 5 more lines
      let code = doc.getText(i.targetRange).trim();
      let hoverText: vscode.MarkdownString = new vscode.MarkdownString();
      hoverText.appendCodeblock(code, document.languageId);
      this.logger.info('Hover object returned');
      return new vscode.Hover(hoverText);
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
