// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ModuleInstanceRecord } from './HierarchyTypes';

interface ModuleBlock {
  name: string;
  bodyStart: number;
  bodyEnd: number;
}

interface ParenthesizedSegment {
  text: string;
  openOffset: number;
  closeOffset: number;
}

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_$]*/y;
const REJECT_MODULE_NAMES = new Set([
  'alias',
  'always',
  'always_comb',
  'always_ff',
  'always_latch',
  'and',
  'assign',
  'begin',
  'buf',
  'bufif0',
  'bufif1',
  'case',
  'casex',
  'casez',
  'class',
  'deassign',
  'defparam',
  'end',
  'endcase',
  'endclass',
  'endfunction',
  'endmodule',
  'endpackage',
  'endtask',
  'for',
  'force',
  'forever',
  'fork',
  'function',
  'generate',
  'if',
  'initial',
  'interface',
  'join',
  'localparam',
  'module',
  'nand',
  'nor',
  'not',
  'notif0',
  'notif1',
  'or',
  'package',
  'parameter',
  'pmos',
  'pullup',
  'pulldown',
  'rcmos',
  'reg',
  'release',
  'repeat',
  'rnmos',
  'rpmos',
  'rtran',
  'rtranif0',
  'rtranif1',
  'task',
  'tran',
  'tranif0',
  'tranif1',
  'tri',
  'tri0',
  'tri1',
  'wand',
  'while',
  'wire',
  'wor',
  'xnor',
  'xor',
]);

export class InstanceScanner {
  scan(text: string, uri: vscode.Uri, compileUnitId: string): ModuleInstanceRecord[] {
    try {
      const masked = maskCommentsAndStrings(text);
      const lineStarts = computeLineStarts(text);
      return findModuleBlocks(masked).flatMap((moduleBlock) =>
        scanModuleBody(masked, text, uri, compileUnitId, lineStarts, moduleBlock)
      );
    } catch {
      return [];
    }
  }
}

function scanModuleBody(
  masked: string,
  original: string,
  uri: vscode.Uri,
  compileUnitId: string,
  lineStarts: number[],
  moduleBlock: ModuleBlock
): ModuleInstanceRecord[] {
  const instances: ModuleInstanceRecord[] = [];
  for (const statement of splitTopLevelStatements(masked, moduleBlock.bodyStart, moduleBlock.bodyEnd)) {
    const parsed = parseInstanceStatement(masked, statement.start, statement.end);
    if (!parsed) {
      continue;
    }
    const selectionRange = rangeFromOffset(original, lineStarts, parsed.instanceStart, parsed.instanceName.length);
    const parameterOverrideConnections = collectNamedConnectionRecords(parsed.parameterSegment, original, lineStarts);
    const portConnectionRecords = collectNamedConnectionRecords(parsed.portSegment, original, lineStarts);
    instances.push({
      id: `${compileUnitId}:${uri.fsPath}:${moduleBlock.name}:${parsed.instanceName}:${parsed.instanceStart}`,
      instanceName: parsed.instanceName,
      moduleName: parsed.moduleName,
      parentModuleName: moduleBlock.name,
      uri,
      range: new vscode.Range(
        positionFromOffset(lineStarts, statement.start),
        positionFromOffset(lineStarts, statement.end + 1)
      ),
      moduleNameRange: rangeFromOffset(original, lineStarts, parsed.moduleStart, parsed.moduleName.length),
      selectionRange,
      parameterOverrides: parameterOverrideConnections.map((connection) => connection.name),
      portConnections: portConnectionRecords.map((connection) => connection.name),
      parameterOverrideConnections,
      portConnectionRecords,
      compileUnitId,
    });
  }
  return instances;
}

function findModuleBlocks(masked: string): ModuleBlock[] {
  const blocks: ModuleBlock[] = [];
  const modulePattern = /\bmodule\s+([A-Za-z_][A-Za-z0-9_$]*)\b/g;
  for (const match of masked.matchAll(modulePattern)) {
    const name = match[1] ?? '';
    const headerStart = match.index ?? 0;
    const headerEnd = findTopLevelSemicolon(masked, headerStart);
    if (headerEnd === undefined) {
      continue;
    }
    const endMatch = /\bendmodule\b/g;
    endMatch.lastIndex = headerEnd + 1;
    const end = endMatch.exec(masked);
    if (!end) {
      continue;
    }
    blocks.push({
      name,
      bodyStart: headerEnd + 1,
      bodyEnd: end.index,
    });
    modulePattern.lastIndex = end.index + end[0].length;
  }
  return blocks;
}

function findTopLevelSemicolon(text: string, start: number): number | undefined {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth = Math.max(0, depth - 1);
    } else if (ch === ';' && depth === 0) {
      return index;
    }
  }
  return undefined;
}

function splitTopLevelStatements(
  text: string,
  start: number,
  end: number
): Array<{ start: number; end: number }> {
  const statements: Array<{ start: number; end: number }> = [];
  let depth = 0;
  let statementStart = start;
  for (let index = start; index < end; index += 1) {
    const ch = text[index];
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth = Math.max(0, depth - 1);
    } else if (ch === ';' && depth === 0) {
      statements.push({ start: statementStart, end: index });
      statementStart = index + 1;
    }
  }
  return statements;
}

interface ParsedInstanceStatement {
  moduleName: string;
  moduleStart: number;
  instanceName: string;
  instanceStart: number;
  parameterSegment?: ParenthesizedSegment;
  portSegment: ParenthesizedSegment;
}

function parseInstanceStatement(
  text: string,
  statementStart: number,
  statementEnd: number
): ParsedInstanceStatement | undefined {
  let index = skipWhitespace(text, statementStart, statementEnd);
  const moduleName = readIdentifier(text, index, statementEnd);
  if (!moduleName || REJECT_MODULE_NAMES.has(moduleName.text)) {
    return undefined;
  }
  index = skipWhitespace(text, moduleName.end, statementEnd);
  let parameterSegment: ParenthesizedSegment | undefined;
  if (text[index] === '#') {
    index = skipWhitespace(text, index + 1, statementEnd);
    if (text[index] !== '(') {
      return undefined;
    }
    const parameterList = readParenthesized(text, index, statementEnd);
    if (!parameterList) {
      return undefined;
    }
    parameterSegment = parameterList;
    index = skipWhitespace(text, parameterList.closeOffset + 1, statementEnd);
  }

  const instanceName = readIdentifier(text, index, statementEnd);
  if (!instanceName || REJECT_MODULE_NAMES.has(instanceName.text)) {
    return undefined;
  }
  index = skipWhitespace(text, instanceName.end, statementEnd);
  if (text[index] !== '(') {
    return undefined;
  }
  const portList = readParenthesized(text, index, statementEnd);
  if (!portList) {
    return undefined;
  }
  if (skipWhitespace(text, portList.closeOffset + 1, statementEnd) < statementEnd) {
    return undefined;
  }
  return {
    moduleName: moduleName.text,
    moduleStart: moduleName.start,
    instanceName: instanceName.text,
    instanceStart: instanceName.start,
    parameterSegment,
    portSegment: portList,
  };
}

function readIdentifier(
  text: string,
  start: number,
  end: number
): { text: string; start: number; end: number } | undefined {
  IDENTIFIER.lastIndex = start;
  const match = IDENTIFIER.exec(text.slice(0, end));
  if (!match || match.index !== start) {
    return undefined;
  }
  const value = match[0];
  return { text: value, start, end: start + value.length };
}

function readParenthesized(
  text: string,
  openOffset: number,
  endOffset: number
): ParenthesizedSegment | undefined {
  let depth = 0;
  for (let index = openOffset; index < endOffset; index += 1) {
    const ch = text[index];
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return {
          text: text.slice(openOffset + 1, index),
          openOffset,
          closeOffset: index,
        };
      }
    }
  }
  return undefined;
}

function collectNamedConnectionRecords(
  segment: ParenthesizedSegment | undefined,
  original: string,
  lineStarts: number[]
): Array<{ name: string; range: vscode.Range }> {
  if (!segment || !hasOnlyNamedConnections(segment.text)) {
    return [];
  }
  const records: Array<{ name: string; range: vscode.Range }> = [];
  const seen = new Set<string>();
  for (const match of segment.text.matchAll(/\.([A-Za-z_][A-Za-z0-9_$]*)\s*\(/g)) {
    const name = match[1] ?? '';
    if (!seen.has(name)) {
      seen.add(name);
      const dotOffset = segment.openOffset + 1 + (match.index ?? 0);
      records.push({
        name,
        range: rangeFromOffset(original, lineStarts, dotOffset, name.length + 1),
      });
    }
  }
  return records;
}

function hasOnlyNamedConnections(text: string): boolean {
  for (const item of splitConnectionItems(text)) {
    const trimmed = item.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('.')) {
      return false;
    }
  }
  return true;
}

function splitConnectionItems(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth = Math.max(0, depth - 1);
    } else if (ch === ',' && depth === 0) {
      items.push(text.slice(start, index));
      start = index + 1;
    }
  }
  items.push(text.slice(start));
  return items;
}

function skipWhitespace(text: string, start: number, end: number): number {
  let index = start;
  while (index < end && /\s/.test(text[index] ?? '')) {
    index += 1;
  }
  return index;
}

function maskCommentsAndStrings(text: string): string {
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
    if (ch === '"') {
      result += ' ';
      index += 1;
      while (index < text.length) {
        const stringCh = text[index] ?? '';
        result += stringCh === '\n' ? '\n' : ' ';
        if (stringCh === '\\' && index + 1 < text.length) {
          result += text[index + 1] === '\n' ? '\n' : ' ';
          index += 2;
          continue;
        }
        index += 1;
        if (stringCh === '"') {
          break;
        }
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
  return new vscode.Range(
    positionFromOffset(lineStarts, offset),
    positionFromOffset(lineStarts, Math.min(text.length, offset + length))
  );
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
