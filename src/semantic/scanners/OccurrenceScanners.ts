// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export const MACRO_DIRECTIVES = new Set([
  'begin_keywords',
  'celldefine',
  'default_nettype',
  'define',
  'else',
  'elsif',
  'end_keywords',
  'endcelldefine',
  'endif',
  'ifdef',
  'ifndef',
  'include',
  'line',
  'nounconnected_drive',
  'pragma',
  'resetall',
  'timescale',
  'undef',
  'undefineall',
  'unconnected_drive',
]);

export interface IncludeOccurrence {
  includeText: string;
  range: vscode.Range;
}

export interface MacroOccurrence {
  name: string;
  range: vscode.Range;
  isDirective: boolean;
}

export interface WordOccurrence {
  text: string;
  range: vscode.Range;
}

export function scanIncludeOccurrences(text: string): IncludeOccurrence[] {
  const masked = maskComments(text);
  const lineStarts = computeLineStarts(text);
  const occurrences: IncludeOccurrence[] = [];
  for (const match of masked.matchAll(/`include\s+(["<])([^">]+)[">]/g)) {
    const open = match[1] ?? '"';
    const includePath = match[2] ?? '';
    const matchOffset = match.index ?? 0;
    const pathOffsetInMatch = match[0].indexOf(includePath);
    const pathOffset = matchOffset + pathOffsetInMatch;
    const close = open === '<' ? '>' : '"';
    occurrences.push({
      includeText: `${open}${includePath}${close}`,
      range: new vscode.Range(
        positionFromOffset(lineStarts, pathOffset),
        positionFromOffset(lineStarts, pathOffset + includePath.length)
      ),
    });
  }
  return occurrences;
}

export function scanMacroOccurrences(text: string): MacroOccurrence[] {
  const masked = maskCommentsAndStrings(text);
  const lineStarts = computeLineStarts(text);
  const occurrences: MacroOccurrence[] = [];
  for (const match of masked.matchAll(/`([A-Za-z_][A-Za-z0-9_$]*)/g)) {
    const name = match[1] ?? '';
    const nameOffset = (match.index ?? 0) + 1;
    occurrences.push({
      name,
      isDirective: MACRO_DIRECTIVES.has(name),
      range: new vscode.Range(
        positionFromOffset(lineStarts, nameOffset),
        positionFromOffset(lineStarts, nameOffset + name.length)
      ),
    });
  }
  return occurrences;
}

export function scanMacroUsages(text: string): MacroOccurrence[] {
  return scanMacroOccurrences(text).filter((occurrence) => !occurrence.isDirective);
}

export function scanMacroDefinitions(text: string): MacroOccurrence[] {
  const masked = maskCommentsAndStrings(text);
  const lineStarts = computeLineStarts(text);
  const definitions: MacroOccurrence[] = [];
  for (const match of masked.matchAll(/`define\s+([A-Za-z_][A-Za-z0-9_$]*)/g)) {
    const name = match[1] ?? '';
    const nameOffset = (match.index ?? 0) + match[0].lastIndexOf(name);
    definitions.push({
      name,
      isDirective: false,
      range: new vscode.Range(
        positionFromOffset(lineStarts, nameOffset),
        positionFromOffset(lineStarts, nameOffset + name.length)
      ),
    });
  }
  return definitions;
}

export function scanWordOccurrences(text: string, word: string): WordOccurrence[] {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(word)) {
    return [];
  }
  const masked = maskCommentsAndStrings(text);
  const lineStarts = computeLineStarts(text);
  const occurrences: WordOccurrence[] = [];
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g');
  for (const match of masked.matchAll(pattern)) {
    const offset = match.index ?? 0;
    occurrences.push({
      text: word,
      range: new vscode.Range(
        positionFromOffset(lineStarts, offset),
        positionFromOffset(lineStarts, offset + word.length)
      ),
    });
  }
  return occurrences;
}

export function maskComments(text: string): string {
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

export function maskCommentsAndStrings(text: string): string {
  const withoutComments = maskComments(text);
  let result = '';
  let index = 0;
  while (index < withoutComments.length) {
    const ch = withoutComments[index] ?? '';
    if (ch === '"') {
      result += ' ';
      index += 1;
      while (index < withoutComments.length) {
        const stringCh = withoutComments[index] ?? '';
        result += stringCh === '\n' ? '\n' : ' ';
        if (stringCh === '\\' && index + 1 < withoutComments.length) {
          result += withoutComments[index + 1] === '\n' ? '\n' : ' ';
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
