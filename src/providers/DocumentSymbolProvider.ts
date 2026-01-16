// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { CtagsManager, Symbol } from '../ctags';
import { getExtensionLogger } from '../logging';

export class VerilogDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public docSymbols: vscode.DocumentSymbol[] = [];

  private readonly logger = getExtensionLogger('Provider', 'DocumentSymbol');
  private ctagsManager: CtagsManager;
  constructor(ctagsManager: CtagsManager) {
    this.ctagsManager = ctagsManager;
  }

  async provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.DocumentSymbol[]> {
    this.logger.info("Symbols requested", { uri: document.uri.toString() });
    const symbols: Symbol[] = await this.ctagsManager.getSymbols(document);
    this.docSymbols = this.buildDocumentSymbolList(symbols);
    this.logger.info("Symbols returned", { count: this.docSymbols.length });
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

  // find the appropriate container RECURSIVELY and add to its children
  // return true: if done
  // return false: if container not found
  findContainer(con: vscode.DocumentSymbol, sym: vscode.DocumentSymbol): boolean {
    let res: boolean = false;
    for (const i of con.children) {
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

  // Build hierarchical DocumentSymbol[] from linear symbolsList[] using start and end position
  // TODO: Use parentscope/parenttype of symbol to construct hierarchical vscode.DocumentSymbol []
  buildDocumentSymbolList(symbolsList: Symbol[]): vscode.DocumentSymbol[] {
    const list: vscode.DocumentSymbol[] = [];
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
    for (const i of symbolsList) {
      const sym: vscode.DocumentSymbol = i.getDocumentSymbol();
      // if no top level elements present
      if (list.length === 0) {
        list.push(sym);
        continue;
      } else {
        // find a parent among the top level element
        let done: boolean = false;
        for (const j of list) {
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
