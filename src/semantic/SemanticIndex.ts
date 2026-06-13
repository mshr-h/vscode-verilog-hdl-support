// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { FileContext } from '../project/FileContext';
import type { ModuleRecord, SymbolRecord, SymbolRecordKind } from './SymbolRecords';

export class SemanticIndex {
  private readonly modulesByName = new Map<string, ModuleRecord[]>();
  private readonly packagesByName = new Map<string, SymbolRecord[]>();
  private readonly macrosByName = new Map<string, SymbolRecord[]>();
  private readonly symbolsByFile = new Map<string, SymbolRecord[]>();

  constructor(
    readonly version: number,
    private readonly symbols: SymbolRecord[]
  ) {
    for (const symbol of symbols) {
      addToMap(this.symbolsByFile, symbol.uri.fsPath, symbol);
      if (symbol.kind === 'module') {
        addToMap(this.modulesByName, symbol.name, symbol);
      } else if (symbol.kind === 'package') {
        addToMap(this.packagesByName, symbol.name, symbol);
      } else if (symbol.kind === 'macro') {
        addToMap(this.macrosByName, symbol.name, symbol);
      }
    }
  }

  getAllModules(): ModuleRecord[] {
    return this.symbols.filter((symbol): symbol is ModuleRecord => symbol.kind === 'module');
  }

  getAllSymbols(): SymbolRecord[] {
    return this.symbols.slice();
  }

  findModules(name: string): ModuleRecord[] {
    return (this.modulesByName.get(name) ?? []).slice();
  }

  findBestModule(name: string, context?: FileContext | string): ModuleRecord | undefined {
    const modules = this.findModules(name);
    const compileUnitId = typeof context === 'string' ? context : context?.compileUnitId;
    return modules.find((moduleRecord) => moduleRecord.compileUnitId === compileUnitId) ?? modules[0];
  }

  getModuleSignature(name: string, context?: FileContext | string): ModuleRecord | undefined {
    return this.findBestModule(name, context);
  }

  findSymbolsByName(
    name: string,
    options: { compileUnitId?: string; kinds?: SymbolRecordKind[] } = {}
  ): SymbolRecord[] {
    const kinds = options.kinds ? new Set(options.kinds) : undefined;
    return this.symbols.filter((symbol) =>
      symbol.name === name
      && (!options.compileUnitId || symbol.compileUnitId === options.compileUnitId)
      && (!kinds || kinds.has(symbol.kind))
    );
  }

  findPackages(name: string): SymbolRecord[] {
    return (this.packagesByName.get(name) ?? []).slice();
  }

  findMacros(name: string, _context?: FileContext): SymbolRecord[] {
    return (this.macrosByName.get(name) ?? []).slice();
  }

  getSymbolsInFile(uri: vscode.Uri): SymbolRecord[] {
    return (this.symbolsByFile.get(uri.fsPath) ?? []).slice();
  }

  resolveInclude(includeText: string, context: FileContext): vscode.Uri | undefined {
    const includePath = includeText.replace(/^["<]|[">]$/g, '');
    const candidates = [
      path.resolve(path.dirname(context.file.fsPath), includePath),
      ...context.includeDirs.map((dir) => path.resolve(dir.fsPath, includePath)),
    ];
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    return found ? vscode.Uri.file(found) : undefined;
  }
}

function addToMap<T extends SymbolRecord>(map: Map<string, T[]>, key: string, value: T): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}
