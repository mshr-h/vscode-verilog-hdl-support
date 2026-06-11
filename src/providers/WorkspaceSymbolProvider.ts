// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { IndexService } from '../semantic/IndexService';
import type { SymbolRecord, SymbolRecordKind } from '../semantic/SymbolRecords';

const WORKSPACE_SYMBOL_KINDS = new Set<SymbolRecordKind>([
  'module',
  'package',
  'interface',
  'class',
  'typedef',
  'macro',
]);

export class VerilogWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  constructor(private readonly indexService: IndexService) {}

  provideWorkspaceSymbols(
    query: string,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SymbolInformation[]> {
    const normalizedQuery = query.toLowerCase();
    return this.indexService
      .getIndex()
      .getAllSymbols()
      .filter((symbol) => WORKSPACE_SYMBOL_KINDS.has(symbol.kind))
      .filter((symbol) => normalizedQuery.length === 0 || symbol.name.toLowerCase().includes(normalizedQuery))
      .map(symbolRecordToWorkspaceSymbol);
  }
}

export function symbolRecordToWorkspaceSymbol(symbol: SymbolRecord): vscode.SymbolInformation {
  return new vscode.SymbolInformation(
    symbol.name,
    toWorkspaceSymbolKind(symbol.kind),
    symbol.containerName ?? symbol.compileUnitId,
    new vscode.Location(symbol.uri, symbol.selectionRange)
  );
}

function toWorkspaceSymbolKind(kind: SymbolRecordKind): vscode.SymbolKind {
  switch (kind) {
    case 'module':
      return vscode.SymbolKind.Module;
    case 'interface':
      return vscode.SymbolKind.Interface;
    case 'package':
      return vscode.SymbolKind.Package;
    case 'class':
      return vscode.SymbolKind.Class;
    case 'typedef':
      return vscode.SymbolKind.TypeParameter;
    case 'macro':
      return vscode.SymbolKind.Constant;
    default:
      return vscode.SymbolKind.Variable;
  }
}
