// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ModuleRecord, ParameterRecord, PortRecord, SymbolRecord, SymbolRecordKind } from '../SymbolRecords';

export interface FastScannerResult {
  symbols: SymbolRecord[];
}

export class FastScanner {
  scan(text: string, uri: vscode.Uri, compileUnitId: string): FastScannerResult {
    try {
      return { symbols: this.scanSafe(text, uri, compileUnitId) };
    } catch {
      return { symbols: [] };
    }
  }

  private scanSafe(text: string, uri: vscode.Uri, compileUnitId: string): SymbolRecord[] {
    const stripped = stripComments(text);
    const lineStarts = computeLineStarts(text);
    const symbols: SymbolRecord[] = [];

    this.scanNamedDeclarations(stripped, text, uri, compileUnitId, lineStarts, symbols);
    this.scanTypedefs(stripped, text, uri, compileUnitId, lineStarts, symbols);
    this.scanParameters(stripped, text, uri, compileUnitId, lineStarts, symbols);
    this.scanPreprocessor(stripped, text, uri, compileUnitId, lineStarts, symbols);
    this.scanModuleHeaders(stripped, text, uri, compileUnitId, lineStarts, symbols);

    return symbols;
  }

  private scanNamedDeclarations(
    stripped: string,
    original: string,
    uri: vscode.Uri,
    compileUnitId: string,
    lineStarts: number[],
    symbols: SymbolRecord[]
  ): void {
    const pattern = /\b(module|interface|package|class)\s+([A-Za-z_][A-Za-z0-9_$]*)/g;
    for (const match of stripped.matchAll(pattern)) {
      const kind = match[1] as SymbolRecordKind;
      const name = match[2] ?? '';
      const start = (match.index ?? 0) + (match[0].lastIndexOf(name));
      const record = createSymbol(kind, name, original, uri, compileUnitId, lineStarts, start);
      if (kind === 'module') {
        const moduleRecord: ModuleRecord = { ...record, kind: 'module', ports: [], parameters: [] };
        symbols.push(moduleRecord);
      } else {
        symbols.push(record);
      }
    }
  }

  private scanTypedefs(
    stripped: string,
    original: string,
    uri: vscode.Uri,
    compileUnitId: string,
    lineStarts: number[],
    symbols: SymbolRecord[]
  ): void {
    const pattern = /\btypedef\b[^;]*?\b([A-Za-z_][A-Za-z0-9_$]*)\s*;/g;
    for (const match of stripped.matchAll(pattern)) {
      const name = match[1] ?? '';
      const start = (match.index ?? 0) + match[0].lastIndexOf(name);
      symbols.push(createSymbol('typedef', name, original, uri, compileUnitId, lineStarts, start));
    }
  }

  private scanParameters(
    stripped: string,
    original: string,
    uri: vscode.Uri,
    compileUnitId: string,
    lineStarts: number[],
    symbols: SymbolRecord[]
  ): void {
    const pattern = /\b(localparam|parameter)\b([^;,)]*)/g;
    for (const match of stripped.matchAll(pattern)) {
      const kind = match[1] as 'parameter' | 'localparam';
      const name = findDeclaredName(match[2] ?? '');
      if (!name) {
        continue;
      }
      const start = (match.index ?? 0) + match[0].lastIndexOf(name);
      symbols.push(createSymbol(kind, name, original, uri, compileUnitId, lineStarts, start));
    }
  }

  private scanPreprocessor(
    stripped: string,
    original: string,
    uri: vscode.Uri,
    compileUnitId: string,
    lineStarts: number[],
    symbols: SymbolRecord[]
  ): void {
    const definePattern = /^\s*`define\s+([A-Za-z_][A-Za-z0-9_$]*)/gm;
    for (const match of stripped.matchAll(definePattern)) {
      const name = match[1] ?? '';
      const start = (match.index ?? 0) + match[0].lastIndexOf(name);
      symbols.push(createSymbol('macro', name, original, uri, compileUnitId, lineStarts, start));
    }

    const includePattern = /^\s*`include\s+["<]([^">]+)[">]/gm;
    for (const match of stripped.matchAll(includePattern)) {
      const name = match[1] ?? '';
      const start = (match.index ?? 0) + match[0].lastIndexOf(name);
      symbols.push(createSymbol('include', name, original, uri, compileUnitId, lineStarts, start));
    }
  }

  private scanModuleHeaders(
    stripped: string,
    original: string,
    uri: vscode.Uri,
    compileUnitId: string,
    lineStarts: number[],
    symbols: SymbolRecord[]
  ): void {
    const modulePattern = /\bmodule\s+([A-Za-z_][A-Za-z0-9_$]*)([\s\S]*?);/g;
    for (const match of stripped.matchAll(modulePattern)) {
      const moduleName = match[1] ?? '';
      const header = match[2] ?? '';
      const headerStart = (match.index ?? 0) + match[0].indexOf(header);
      const moduleRecord = symbols.find(
        (symbol): symbol is ModuleRecord => symbol.kind === 'module' && symbol.name === moduleName
      );
      if (!moduleRecord) {
        continue;
      }

      for (const parameter of findHeaderParameters(header, original, uri, compileUnitId, lineStarts, headerStart, moduleName)) {
        moduleRecord.parameters.push(parameter);
        symbols.push(parameter);
      }
      for (const port of findHeaderPorts(header, original, uri, compileUnitId, lineStarts, headerStart, moduleName)) {
        moduleRecord.ports.push(port);
        symbols.push(port);
      }
    }
  }
}

function findHeaderParameters(
  header: string,
  original: string,
  uri: vscode.Uri,
  compileUnitId: string,
  lineStarts: number[],
  headerStart: number,
  moduleName: string
): ParameterRecord[] {
  const parameters: ParameterRecord[] = [];
  const pattern = /\b(parameter|localparam)\b([^,)]*)/g;
  for (const match of header.matchAll(pattern)) {
    const name = findDeclaredName(match[2] ?? '');
    if (!name) {
      continue;
    }
    const start = headerStart + (match.index ?? 0) + match[0].lastIndexOf(name);
    parameters.push({
      ...createSymbol(match[1] as 'parameter' | 'localparam', name, original, uri, compileUnitId, lineStarts, start, moduleName),
      kind: match[1] as 'parameter' | 'localparam',
    });
  }
  return parameters;
}

function findDeclaredName(declarationTail: string): string | undefined {
  const beforeAssignment = declarationTail.split('=')[0] ?? declarationTail;
  const identifiers = beforeAssignment.match(/[A-Za-z_][A-Za-z0-9_$]*/g) ?? [];
  return identifiers.at(-1);
}

function findHeaderPorts(
  header: string,
  original: string,
  uri: vscode.Uri,
  compileUnitId: string,
  lineStarts: number[],
  headerStart: number,
  moduleName: string
): PortRecord[] {
  const ports: PortRecord[] = [];
  const pattern = /\b(?:input|output|inout|ref)\b[^,)]*?\b([A-Za-z_][A-Za-z0-9_$]*)\b\s*(?=[,)])/g;
  for (const match of header.matchAll(pattern)) {
    const name = match[1] ?? '';
    const start = headerStart + (match.index ?? 0) + match[0].lastIndexOf(name);
    ports.push({
      ...createSymbol('port', name, original, uri, compileUnitId, lineStarts, start, moduleName),
      kind: 'port',
    });
  }
  return ports;
}

function createSymbol(
  kind: SymbolRecordKind,
  name: string,
  original: string,
  uri: vscode.Uri,
  compileUnitId: string,
  lineStarts: number[],
  startOffset: number,
  containerName?: string
): SymbolRecord {
  const range = rangeFromOffset(original, lineStarts, startOffset, name.length);
  return {
    id: `${compileUnitId}:${uri.fsPath}:${kind}:${name}:${startOffset}`,
    name,
    kind,
    uri,
    range,
    selectionRange: range,
    containerName,
    compileUnitId,
  };
}

function stripComments(text: string): string {
  let result = '';
  let index = 0;
  while (index < text.length) {
    const ch = text[index] ?? '';
    const next = text[index + 1] ?? '';
    if (ch === '/' && next === '/') {
      result += '  ';
      index += 2;
      while (index < text.length && text[index] !== '\n') {
        result += ' ';
        index += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      result += '  ';
      index += 2;
      while (index < text.length) {
        const blockCh = text[index] ?? '';
        const blockNext = text[index + 1] ?? '';
        if (blockCh === '*' && blockNext === '/') {
          result += '  ';
          index += 2;
          break;
        }
        result += blockCh === '\n' ? '\n' : ' ';
        index += 1;
      }
      continue;
    }
    result += ch;
    index += 1;
  }
  return result;
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}

function rangeFromOffset(
  text: string,
  lineStarts: number[],
  offset: number,
  length: number
): vscode.Range {
  const start = positionFromOffset(lineStarts, offset);
  const end = positionFromOffset(lineStarts, Math.min(text.length, offset + length));
  return new vscode.Range(start, end);
}

function positionFromOffset(lineStarts: number[], offset: number): vscode.Position {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = lineStarts[mid] ?? 0;
    if (value <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const line = Math.max(0, high);
  return new vscode.Position(line, offset - (lineStarts[line] ?? 0));
}
