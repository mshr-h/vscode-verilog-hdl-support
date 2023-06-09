// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { BsvInfoProviderManger } from '../BsvProvider';
import { CtagsManager, Symbol } from '../ctags';
import { Logger } from '../logger';

export class VerilogDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public docSymbols: vscode.DocumentSymbol[] = [];

  private logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  async provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.DocumentSymbol[]> {
    this.logger.info('[VerilogSymbol] Symbols Requested: ' + document.uri);
    let symbols: Symbol[] = await CtagsManager.getSymbols(document);
    this.logger.info('[VerilogSymbol] Symbols: ' + symbols.toString());
    this.docSymbols = this.buildDocumentSymbolList(symbols);
    this.logger.info(this.docSymbols.length + ' top-level symbols returned');
    return this.docSymbols;
  }

  isContainer(type: vscode.SymbolKind): boolean {
    switch (type) {
      case vscode.SymbolKind.Array:
      case vscode.SymbolKind.Boolean:
      case vscode.SymbolKind.Constant:
      case vscode.SymbolKind.EnumMember:
      case vscode.SymbolKind.Event:
      case vscode.SymbolKind.Field:
      case vscode.SymbolKind.Key:
      case vscode.SymbolKind.Null:
      case vscode.SymbolKind.Number:
      case vscode.SymbolKind.Object:
      case vscode.SymbolKind.Property:
      case vscode.SymbolKind.String:
      case vscode.SymbolKind.TypeParameter:
      case vscode.SymbolKind.Variable:
        return false;
      case vscode.SymbolKind.Class:
      case vscode.SymbolKind.Constructor:
      case vscode.SymbolKind.Enum:
      case vscode.SymbolKind.File:
      case vscode.SymbolKind.Function:
      case vscode.SymbolKind.Interface:
      case vscode.SymbolKind.Method:
      case vscode.SymbolKind.Module:
      case vscode.SymbolKind.Namespace:
      case vscode.SymbolKind.Package:
      case vscode.SymbolKind.Struct:
        return true;
    }
    return false;
  }

  // find the appropriate container RECURSIVELY and add to its childrem
  // return true: if done
  // return false: if container not found
  findContainer(con: vscode.DocumentSymbol, sym: vscode.DocumentSymbol): boolean {
    let res: boolean = false;
    for (let i of con.children) {
      if (this.isContainer(i.kind) && i.range.contains(sym.range)) {
        res = this.findContainer(i, sym);
        if (res) {
          return true;
        }
      }
    }
    if (!res) {
      con.children.push(sym);
      return true;
    }
    return false;
  }

  // Build heiarchial DocumentSymbol[] from linear symbolsList[] using start and end position
  // TODO: Use parentscope/parenttype of symbol to construct heirarchial vscode.DocumentSymbol []
  buildDocumentSymbolList(symbolsList: Symbol[]): vscode.DocumentSymbol[] {
    let list: vscode.DocumentSymbol[] = [];
    symbolsList = symbolsList.sort((a, b): number => {
      if (a.startPosition.isBefore(b.startPosition)) {
        return -1;
      }
      if (a.startPosition.isAfter(b.startPosition)) {
        return 1;
      }
      return 0;
    });
    // Add each of the symbols in order
    for (let i of symbolsList) {
      let sym: vscode.DocumentSymbol = i.getDocumentSymbol();
      // if no top level elements present
      if (list.length === 0) {
        list.push(sym);
        continue;
      } else {
        // find a parent among the top level element
        let done: boolean;
        for (let j of list) {
          if (this.isContainer(j.kind) && j.range.contains(sym.range)) {
            this.findContainer(j, sym);
            done = true;
            break;
          }
        }
        // add a new top level element
        if (!done) {
          list.push(sym);
        }
      }
    }

    return list;
  }
}

export class BsvDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  private logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[] | vscode.SymbolInformation[]> {
    // return new Promise((resolve)=>{
    //     const provider = BsvInfoProviderManger.getInstance().getProvider();
    //     var info = provider.getSymbol(document);

    //     resolve(info);
    // })
    const provider = BsvInfoProviderManger.getInstance().getProvider();
    var info = provider.getSymbol(document);

    return info;
  }
}
