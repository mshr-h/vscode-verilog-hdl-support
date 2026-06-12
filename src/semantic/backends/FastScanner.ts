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
      for (const port of findNonAnsiPorts(stripped, original, uri, compileUnitId, lineStarts, moduleName, moduleRecord)) {
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
  const parameterList = findParameterList(header);
  if (!parameterList) {
    return parameters;
  }
  for (const declaration of splitTopLevelCommas(parameterList.text)) {
    const match = /\b(parameter|localparam)\b([\s\S]*)/.exec(declaration);
    if (!match) {
      continue;
    }
    const parsed = parseParameterDeclaration(match[1] as 'parameter' | 'localparam', match[2] ?? '');
    if (!parsed) {
      continue;
    }
    const relativeStart = parameterList.start + declaration.indexOf(parsed.name);
    const start = headerStart + relativeStart;
    parameters.push({
      ...createSymbol(parsed.kind, parsed.name, original, uri, compileUnitId, lineStarts, start, moduleName),
      kind: parsed.kind,
      dataType: parsed.dataType,
      width: parsed.width,
      defaultValue: parsed.defaultValue,
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
  const portList = findPortList(header);
  if (!portList) {
    return ports;
  }
  for (const declaration of splitTopLevelCommas(portList.text)) {
    const parsed = parsePortDeclaration(declaration);
    if (!parsed || parsed.direction === 'unknown') {
      continue;
    }
    const start = headerStart + portList.start + declaration.lastIndexOf(parsed.name);
    ports.push({
      ...createSymbol('port', parsed.name, original, uri, compileUnitId, lineStarts, start, moduleName),
      kind: 'port',
      direction: parsed.direction,
      dataType: parsed.dataType,
      width: parsed.width,
    });
  }
  return ports;
}

function findNonAnsiPorts(
  stripped: string,
  original: string,
  uri: vscode.Uri,
  compileUnitId: string,
  lineStarts: number[],
  moduleName: string,
  moduleRecord: ModuleRecord
): PortRecord[] {
  const modulePattern = new RegExp(`\\bmodule\\s+${escapeRegExp(moduleName)}[\\s\\S]*?;([\\s\\S]*?)\\bendmodule\\b`, 'g');
  const match = modulePattern.exec(stripped);
  if (!match) {
    return [];
  }
  const body = match[1] ?? '';
  const bodyStart = (match.index ?? 0) + match[0].indexOf(body);
  const existing = new Set(moduleRecord.ports.map((port) => port.name));
  const ports: PortRecord[] = [];
  // TODO: This intentionally handles only simple one-line non-ANSI port declarations.
  const declarationPattern = /\b(input|output|inout|ref)\b([^;]*);/g;
  for (const declarationMatch of body.matchAll(declarationPattern)) {
    const direction = declarationMatch[1] as PortRecord['direction'];
    const tail = declarationMatch[2] ?? '';
    for (const declaration of splitTopLevelCommas(tail)) {
      const parsed = parsePortDeclaration(`${direction} ${declaration}`);
      if (!parsed || existing.has(parsed.name)) {
        continue;
      }
      existing.add(parsed.name);
      const start = bodyStart + (declarationMatch.index ?? 0) + declarationMatch[0].lastIndexOf(parsed.name);
      ports.push({
        ...createSymbol('port', parsed.name, original, uri, compileUnitId, lineStarts, start, moduleName),
        kind: 'port',
        direction: parsed.direction,
        dataType: parsed.dataType,
        width: parsed.width,
      });
    }
  }
  return ports;
}

interface ParenthesizedSegment {
  text: string;
  start: number;
}

function findParameterList(header: string): ParenthesizedSegment | undefined {
  const hashIndex = header.indexOf('#');
  if (hashIndex < 0) {
    return undefined;
  }
  const openIndex = header.indexOf('(', hashIndex);
  return openIndex >= 0 ? readParenthesized(header, openIndex) : undefined;
}

function findPortList(header: string): ParenthesizedSegment | undefined {
  const segments = findParenthesizedSegments(header);
  if (segments.length === 0) {
    return undefined;
  }
  return header.trimStart().startsWith('#') ? segments[1] : segments[0];
}

function findParenthesizedSegments(text: string): ParenthesizedSegment[] {
  const segments: ParenthesizedSegment[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '(') {
      continue;
    }
    const segment = readParenthesized(text, i);
    if (segment) {
      segments.push(segment);
      i = segment.start + segment.text.length;
    }
  }
  return segments;
}

function readParenthesized(text: string, openIndex: number): ParenthesizedSegment | undefined {
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === '(') {
      depth += 1;
    } else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        return { text: text.slice(openIndex + 1, i), start: openIndex + 1 };
      }
    }
  }
  return undefined;
}

function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth = Math.max(0, depth - 1);
    } else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  const finalPart = text.slice(start).trim();
  if (finalPart.length > 0) {
    parts.push(finalPart);
  }
  return parts;
}

function parseParameterDeclaration(
  kind: 'parameter' | 'localparam',
  tail: string
): Pick<ParameterRecord, 'kind' | 'name' | 'dataType' | 'width' | 'defaultValue'> | undefined {
  const [left = '', ...defaultParts] = tail.split('=');
  const name = findDeclaredName(left);
  if (!name) {
    return undefined;
  }
  const prefix = left.slice(0, left.lastIndexOf(name)).trim();
  return {
    kind,
    name,
    dataType: cleanDataType(prefix),
    width: findWidth(prefix),
    defaultValue: defaultParts.join('=').trim() || undefined,
  };
}

function parsePortDeclaration(
  declaration: string
): Pick<PortRecord, 'name' | 'direction' | 'dataType' | 'width'> | undefined {
  const match = /\b(input|output|inout|ref)\b([\s\S]*)/.exec(declaration);
  if (!match) {
    return undefined;
  }
  const direction = match[1] as PortRecord['direction'];
  const tail = match[2] ?? '';
  const name = findDeclaredName(tail);
  if (!name) {
    return undefined;
  }
  const prefix = tail.slice(0, tail.lastIndexOf(name)).trim();
  return {
    name,
    direction,
    dataType: cleanDataType(prefix),
    width: findWidth(prefix),
  };
}

function cleanDataType(text: string): string | undefined {
  const dataType = text.replace(/\[[^\]]+\]/g, '').trim().replace(/\s+/g, ' ');
  return dataType.length > 0 ? dataType : undefined;
}

function findWidth(text: string): string | undefined {
  return text.match(/\[[^\]]+\]/)?.[0];
}

function escapeRegExp(input: string): string {
  return input.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
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
