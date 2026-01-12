// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { CtagsManager, Symbol } from '../ctags';
import { getExtensionLogger } from '../logging';
import { END_OF_LINE } from '../constants';

export class VerilogCompletionItemProvider implements vscode.CompletionItemProvider {
  private readonly logger = getExtensionLogger('Provider', 'CompletionItem');
  private ctagsManager: CtagsManager;
  constructor(ctagsManager: CtagsManager) {
    this.ctagsManager = ctagsManager;
  }

  //TODO: Better context based completion items
  async provideCompletionItems(
    document: vscode.TextDocument,
    _position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    this.logger.info("Completion items requested", { uri: document.uri.toString() });
    const items: vscode.CompletionItem[] = [];

    const symbols: Symbol[] = await this.ctagsManager.getSymbols(document);
    symbols.forEach((symbol) => {
      const newItem: vscode.CompletionItem = new vscode.CompletionItem(
        symbol.name,
        this.getCompletionItemKind(symbol.type)
      );
      const codeRange = new vscode.Range(
        symbol.startPosition,
        new vscode.Position(symbol.startPosition.line, END_OF_LINE)
      );
      const code = document.getText(codeRange).trim();
      newItem.detail = symbol.type;
      let doc: string = `\`\`\`systemverilog\n${  code  }\n\`\`\``;
      if (symbol.parentScope !== undefined && symbol.parentScope !== '') {
        doc += `\nHierarchical Scope: ${  symbol.parentScope}`;
      }
      newItem.documentation = new vscode.MarkdownString(doc);
      items.push(newItem);
    });
    this.logger.info("Completion items returned", { count: items.length });
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
