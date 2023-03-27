// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { BsvInfoProviderManger } from '../BsvProvider';
import { CtagsManager, Symbol } from '../ctags';
import { Logger } from '../logger';

export class VerilogCompletionItemProvider implements vscode.CompletionItemProvider {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  //TODO: Better context based completion items
  async provideCompletionItems(
    document: vscode.TextDocument,
    _position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    this.logger.info('Completion items requested');
    let items: vscode.CompletionItem[] = [];

    let symbols: Symbol[] = await CtagsManager.getSymbols(document);
    symbols.forEach((symbol) => {
      let newItem: vscode.CompletionItem = new vscode.CompletionItem(
        symbol.name,
        this.getCompletionItemKind(symbol.type)
      );
      let codeRange = new vscode.Range(
        symbol.startPosition,
        new vscode.Position(symbol.startPosition.line, Number.MAX_VALUE)
      );
      let code = document.getText(codeRange).trim();
      newItem.detail = symbol.type;
      let doc: string = '```systemverilog\n' + code + '\n```';
      if (symbol.parentScope !== undefined && symbol.parentScope !== '') {
        doc += '\nHeirarchial Scope: ' + symbol.parentScope;
      }
      newItem.documentation = new vscode.MarkdownString(doc);
      items.push(newItem);
    });
    this.logger.info(items.length + ' items requested');
    return items;
  }

  private getCompletionItemKind(type: string): vscode.CompletionItemKind {
    switch (type) {
      case 'constant':
        return vscode.CompletionItemKind.Constant;
      case 'event':
        return vscode.CompletionItemKind.Event;
      case 'function':
        return vscode.CompletionItemKind.Function;
      case 'module':
        return vscode.CompletionItemKind.Module;
      case 'net':
        return vscode.CompletionItemKind.Variable;
      case 'port':
        return vscode.CompletionItemKind.Variable;
      case 'register':
        return vscode.CompletionItemKind.Variable;
      case 'task':
        return vscode.CompletionItemKind.Function;
      case 'block':
        return vscode.CompletionItemKind.Module;
      case 'assert':
        return vscode.CompletionItemKind.Variable; // No idea what to use
      case 'class':
        return vscode.CompletionItemKind.Class;
      case 'covergroup':
        return vscode.CompletionItemKind.Class; // No idea what to use
      case 'enum':
        return vscode.CompletionItemKind.Enum;
      case 'interface':
        return vscode.CompletionItemKind.Interface;
      case 'modport':
        return vscode.CompletionItemKind.Variable; // same as ports
      case 'package':
        return vscode.CompletionItemKind.Module;
      case 'program':
        return vscode.CompletionItemKind.Module;
      case 'prototype':
        return vscode.CompletionItemKind.Function;
      case 'property':
        return vscode.CompletionItemKind.Property;
      case 'struct':
        return vscode.CompletionItemKind.Struct;
      case 'typedef':
        return vscode.CompletionItemKind.TypeParameter;
      default:
        return vscode.CompletionItemKind.Variable;
    }
  }
}

export class BsvCompletionItemProvider implements vscode.CompletionItemProvider {
  private logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const provider = BsvInfoProviderManger.getInstance().getProvider();
    return provider.lint(document, position);
  }
}
