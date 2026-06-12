// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CtagsManager, Symbol } from '../ctags';
import { END_OF_LINE } from '../constants';
import type { ProjectService } from '../project/ProjectService';
import type { FileContext } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import type { SymbolRecord } from '../semantic/SymbolRecords';

export class CompletionService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService,
    private readonly ctagsManager: CtagsManager
  ) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    const projectItems = this.getProjectCompletionItems(document, position, context);
    const ctagsItems = await this.getCtagsCompletionItems(document);
    return mergeCompletionItems(projectItems, ctagsItems);
  }

  private getProjectCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const includeContext = getIncludeCompletionContext(document, position);
    if (includeContext) {
      return getIncludeCompletionItems(includeContext, this.projectService.getPreferredFileContext(document.uri));
    }

    if (isMacroCompletionContext(document, position, context)) {
      return this.indexService
        .getIndex()
        .getAllSymbols()
        .filter((symbol) => symbol.kind === 'macro')
        .map(macroRecordToCompletionItem);
    }

    if (isNormalCodeCompletionContext(document, position)) {
      return this.indexService
        .getIndex()
        .getAllModules()
        .map((moduleRecord) => {
          const item = new vscode.CompletionItem(moduleRecord.name, vscode.CompletionItemKind.Module);
          item.detail = 'module';
          item.documentation = new vscode.MarkdownString(moduleRecord.uri.fsPath);
          return item;
        });
    }

    return [];
  }

  private async getCtagsCompletionItems(document: vscode.TextDocument): Promise<vscode.CompletionItem[]> {
    const symbols: Symbol[] = await this.ctagsManager.getSymbols(document);
    return symbols.map((symbol) => symbolToCompletionItem(document, symbol));
  }
}

export function symbolToCompletionItem(
  document: vscode.TextDocument,
  symbol: Symbol
): vscode.CompletionItem {
  const newItem = new vscode.CompletionItem(symbol.name, getCompletionItemKind(symbol.type));
  const codeRange = new vscode.Range(
    symbol.startPosition,
    new vscode.Position(symbol.startPosition.line, END_OF_LINE)
  );
  const code = document.getText(codeRange).trim();
  newItem.detail = symbol.type;
  let doc = `\`\`\`systemverilog\n${code}\n\`\`\``;
  if (symbol.parentScope !== undefined && symbol.parentScope !== '') {
    doc += `\nHierarchical Scope: ${symbol.parentScope}`;
  }
  newItem.documentation = new vscode.MarkdownString(doc);
  return newItem;
}

export function mergeCompletionItems(
  primaryItems: vscode.CompletionItem[],
  fallbackItems: vscode.CompletionItem[]
): vscode.CompletionItem[] {
  const primaryKeys = new Set<string>();
  const merged: vscode.CompletionItem[] = [];
  for (const item of primaryItems) {
    const key = `${completionLabelText(item.label)}:${item.kind ?? ''}`;
    if (primaryKeys.has(key)) {
      continue;
    }
    primaryKeys.add(key);
    merged.push(item);
  }
  for (const item of fallbackItems) {
    const key = `${completionLabelText(item.label)}:${item.kind ?? ''}`;
    if (!primaryKeys.has(key)) {
      merged.push(item);
    }
  }
  return merged;
}

interface IncludeCompletionContext {
  directoryPrefix: string;
  replacementRange: vscode.Range;
  documentDirectory: string;
}

export function getIncludeCompletionItems(
  context: IncludeCompletionContext,
  fileContext: FileContext | undefined
): vscode.CompletionItem[] {
  const searchRoots = [context.documentDirectory].concat(
    fileContext?.includeDirs.map((dir) => dir.fsPath) ?? []
  );
  const items: vscode.CompletionItem[] = [];
  const seen = new Set<string>();
  for (const root of searchRoots) {
    const directory = path.resolve(root, context.directoryPrefix);
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      continue;
    }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const suffix = entry.isDirectory() ? '/' : '';
      const label = `${entry.name}${suffix}`;
      if (seen.has(label)) {
        continue;
      }
      seen.add(label);
      const item = new vscode.CompletionItem(
        label,
        entry.isDirectory() ? vscode.CompletionItemKind.Folder : vscode.CompletionItemKind.File
      );
      item.range = context.replacementRange;
      items.push(item);
    }
  }
  return items;
}

function macroRecordToCompletionItem(symbol: SymbolRecord): vscode.CompletionItem {
  const item = new vscode.CompletionItem(symbol.name, vscode.CompletionItemKind.Constant);
  item.detail = 'macro';
  item.documentation = new vscode.MarkdownString(symbol.uri.fsPath);
  return item;
}

function getIncludeCompletionContext(
  document: vscode.TextDocument,
  position: vscode.Position
): IncludeCompletionContext | undefined {
  const line = document.lineAt(position.line).text;
  const prefix = line.slice(0, position.character);
  const match = /`include\s+["<]([^">]*)$/.exec(prefix);
  if (!match) {
    return undefined;
  }
  const typedPath = match[1] ?? '';
  return {
    directoryPrefix: path.dirname(typedPath) === '.' ? '' : path.dirname(typedPath),
    replacementRange: new vscode.Range(
      position.line,
      position.character - path.basename(typedPath).length,
      position.line,
      position.character
    ),
    documentDirectory: path.dirname(document.uri.fsPath),
  };
}

function isMacroCompletionContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.CompletionContext
): boolean {
  if (context.triggerCharacter === '`') {
    return true;
  }
  const before = document.lineAt(position.line).text.slice(0, position.character);
  return /`[A-Za-z0-9_$]*$/.test(before);
}

function isNormalCodeCompletionContext(document: vscode.TextDocument, position: vscode.Position): boolean {
  const line = document.lineAt(position.line).text;
  if (isInsideLineString(line, position.character)) {
    return false;
  }
  const before = line.slice(0, position.character);
  return !/`[A-Za-z0-9_$]*$/.test(before) && !/`include\s+["<][^">]*$/.test(before);
}

function isInsideLineString(line: string, character: number): boolean {
  let inString = false;
  for (let i = 0; i < character; i += 1) {
    const current = line[i];
    if (current === '\\') {
      i += 1;
      continue;
    }
    if (current === '"') {
      inString = !inString;
    }
  }
  return inString;
}

function completionLabelText(label: string | vscode.CompletionItemLabel): string {
  return typeof label === 'string' ? label : label.label;
}

function getCompletionItemKind(type: string): vscode.CompletionItemKind {
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
    case 'port':
    case 'register':
      return vscode.CompletionItemKind.Variable;
    case 'task':
      return vscode.CompletionItemKind.Function;
    case 'block':
      return vscode.CompletionItemKind.Module;
    case 'class':
    case 'covergroup':
      return vscode.CompletionItemKind.Class;
    case 'enum':
      return vscode.CompletionItemKind.Enum;
    case 'interface':
      return vscode.CompletionItemKind.Interface;
    case 'package':
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
