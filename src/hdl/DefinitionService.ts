// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { CtagsManager } from '../ctags';
import type { ProjectService } from '../project/ProjectService';
import type { FileContext } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import type { ModuleRecord } from '../semantic/SymbolRecords';

const HDL_LANGUAGES = new Set(['verilog', 'systemverilog']);
const WORD_PATTERN = /[A-Za-z_][A-Za-z0-9_$]*/;
const MODULE_CONTEXT_KEYWORDS = new Set([
  'assign',
  'begin',
  'end',
  'endmodule',
  'function',
  'if',
  'import',
  'localparam',
  'logic',
  'parameter',
  'reg',
  'return',
  'wire',
]);

export class DefinitionService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService,
    private readonly ctagsManager: CtagsManager
  ) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.DefinitionLink[]> {
    if (!HDL_LANGUAGES.has(document.languageId)) {
      return this.ctagsManager.findSymbol(document, position);
    }

    const includeLink = this.findIncludeDefinition(document, position);
    if (includeLink) {
      return [includeLink];
    }

    const wordRange = document.getWordRangeAtPosition(position, WORD_PATTERN);
    if (!wordRange || wordRange.isEmpty) {
      return this.ctagsManager.findSymbol(document, position);
    }

    const word = document.getText(wordRange);
    if (isModuleContext(document, wordRange, word)) {
      const moduleLinks = this.indexService
        .getIndex()
        .findModules(word)
        .map(moduleRecordToDefinitionLink);
      if (moduleLinks.length > 0) {
        return moduleLinks;
      }
    }

    return this.ctagsManager.findSymbol(document, position);
  }

  private findIncludeDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.DefinitionLink | undefined {
    const include = getIncludeAtPosition(document.lineAt(position.line).text, position.character);
    if (!include) {
      return undefined;
    }

    const context = this.projectService.getPreferredFileContext(document.uri) ?? createLocalFileContext(document.uri);
    const uri = this.indexService.getIndex().resolveInclude(include.includeText, context);
    if (!uri) {
      return undefined;
    }

    const targetRange = new vscode.Range(0, 0, 0, 0);
    return {
      originSelectionRange: new vscode.Range(
        position.line,
        include.pathStart,
        position.line,
        include.pathEnd
      ),
      targetUri: uri,
      targetRange,
      targetSelectionRange: targetRange,
    };
  }
}

export function moduleRecordToDefinitionLink(moduleRecord: ModuleRecord): vscode.DefinitionLink {
  return {
    targetUri: moduleRecord.uri,
    targetRange: moduleRecord.range,
    targetSelectionRange: moduleRecord.selectionRange,
  };
}

export function isModuleContext(
  document: vscode.TextDocument,
  wordRange: vscode.Range,
  word: string
): boolean {
  if (MODULE_CONTEXT_KEYWORDS.has(word)) {
    return false;
  }

  const line = stripLineComment(document.lineAt(wordRange.start.line).text);
  const beforeWord = line.slice(0, wordRange.start.character);
  const afterWord = line.slice(wordRange.end.character);
  const previousChar = beforeWord.at(-1);
  if (previousChar === '.' || previousChar === ':') {
    return false;
  }
  if (isInsideLineString(line, wordRange.start.character)) {
    return false;
  }
  if (/\bmodule\s+$/.test(beforeWord)) {
    return true;
  }
  if (beforeWord.trim().length > 0) {
    return false;
  }
  return /^\s*(?:#\s*\(|[A-Za-z_][A-Za-z0-9_$]*\s*(?:#\s*)?[;(])/.test(afterWord);
}

interface IncludeAtPosition {
  includeText: string;
  pathStart: number;
  pathEnd: number;
}

function getIncludeAtPosition(line: string, character: number): IncludeAtPosition | undefined {
  const includePattern = /`include\s*(["<])([^">]+)[">]/g;
  for (const match of line.matchAll(includePattern)) {
    const fullMatch = match[0];
    const quote = match[1] ?? '"';
    const pathText = match[2] ?? '';
    const start = match.index ?? 0;
    const pathStart = start + fullMatch.indexOf(quote) + 1;
    const pathEnd = pathStart + pathText.length;
    if (character >= pathStart && character <= pathEnd) {
      return {
        includeText: `${quote}${pathText}${quote === '<' ? '>' : quote}`,
        pathStart,
        pathEnd,
      };
    }
  }
  return undefined;
}

function createLocalFileContext(uri: vscode.Uri): FileContext {
  return {
    file: uri,
    compileUnitId: '',
    includeDirs: [],
    defines: {},
  };
}

function stripLineComment(line: string): string {
  const commentIndex = line.indexOf('//');
  return commentIndex < 0 ? line : line.slice(0, commentIndex);
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
