// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { CtagsManager } from '../ctags';
import type { ProjectService } from '../project/ProjectService';
import type { FileContext } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { scanInstanceContext, type InstanceConnection } from '../semantic/InstanceContextScanner';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';

const HDL_LANGUAGES = new Set(['verilog', 'systemverilog']);
const WORD_PATTERN = /[A-Za-z_][A-Za-z0-9_$]*/;
const INDEXED_SYMBOL_KINDS: SymbolRecord['kind'][] = [
  'package',
  'interface',
  'class',
  'typedef',
];
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

    const macroLink = this.findMacroDefinition(document, position);
    if (macroLink) {
      return [macroLink];
    }

    const instanceLink = this.findInstanceConnectionDefinition(document, position);
    if (instanceLink) {
      return [instanceLink];
    }

    const wordRange = document.getWordRangeAtPosition(position, WORD_PATTERN);
    if (!wordRange || wordRange.isEmpty) {
      return this.ctagsManager.findSymbol(document, position);
    }

    const word = document.getText(wordRange);
    if (isModuleContext(document, wordRange, word)) {
      const context = this.projectService.getPreferredFileContext(document.uri);
      const moduleRecord = context
        ? this.indexService.getIndex().findBestModule(word, context)
        : undefined;
      const moduleLinks = moduleRecord
        ? [moduleRecordToDefinitionLink(moduleRecord)]
        : this.indexService
          .getIndex()
          .findModules(word)
          .map((candidate) => symbolRecordToDefinitionLink(candidate));
      if (moduleLinks.length > 0) {
        return moduleLinks;
      }
    }

    const symbolLinks = this.findIndexedSymbolDefinitions(document, wordRange, word);
    if (symbolLinks.length > 0) {
      return symbolLinks;
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

  private findMacroDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.DefinitionLink | undefined {
    const macro = getMacroAtPosition(document, position);
    if (!macro) {
      return undefined;
    }

    const context = this.projectService.getPreferredFileContext(document.uri);
    const projectDefine = context?.defines[macro.name];
    if (projectDefine?.location) {
      return locationToDefinitionLink(projectDefine.location, macro.range);
    }

    const index = this.indexService.getIndex();
    const sourceMacro = (context
      ? index.findSymbolsByName(macro.name, { compileUnitId: context.compileUnitId, kinds: ['macro'] }).at(0)
      : undefined)
      ?? index.findSymbolsByName(macro.name, { kinds: ['macro'] }).at(0);
    return sourceMacro ? symbolRecordToDefinitionLink(sourceMacro, macro.range) : undefined;
  }

  private findInstanceConnectionDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.DefinitionLink | undefined {
    const offset = document.offsetAt(position);
    const context = scanInstanceContext(document.getText(), offset);
    if (!context) {
      return undefined;
    }
    const connection = context.connections.find((candidate) => isOffsetOnConnectionName(candidate, offset));
    if (!connection) {
      return undefined;
    }

    const fileContext = this.projectService.getPreferredFileContext(document.uri);
    const moduleRecord = this.indexService.getIndex().findBestModule(context.moduleName, fileContext);
    if (!moduleRecord) {
      return undefined;
    }

    const symbol = context.kind === 'parameters'
      ? moduleRecord.parameters.find((parameter) => parameter.name === connection.name)
      : moduleRecord.ports.find((port) => port.name === connection.name);
    return symbol ? symbolRecordToDefinitionLink(symbol, connectionNameRange(document, connection)) : undefined;
  }

  private findIndexedSymbolDefinitions(
    document: vscode.TextDocument,
    wordRange: vscode.Range,
    word: string
  ): vscode.DefinitionLink[] {
    const index = this.indexService.getIndex();
    const context = this.projectService.getPreferredFileContext(document.uri);
    const preferredMatches = context
      ? index.findSymbolsByName(word, {
        compileUnitId: context.compileUnitId,
        kinds: INDEXED_SYMBOL_KINDS,
      })
      : [];
    const matches = preferredMatches.length > 0
      ? preferredMatches
      : index.findSymbolsByName(word, { kinds: INDEXED_SYMBOL_KINDS });
    return matches.map((symbol) => symbolRecordToDefinitionLink(symbol, wordRange));
  }
}

export function moduleRecordToDefinitionLink(moduleRecord: ModuleRecord): vscode.DefinitionLink {
  return symbolRecordToDefinitionLink(moduleRecord);
}

export function symbolRecordToDefinitionLink(
  symbolRecord: SymbolRecord,
  originSelectionRange?: vscode.Range
): vscode.DefinitionLink {
  return {
    originSelectionRange,
    targetUri: symbolRecord.uri,
    targetRange: symbolRecord.range,
    targetSelectionRange: symbolRecord.selectionRange,
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

interface MacroAtPosition {
  name: string;
  range: vscode.Range;
}

function getMacroAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): MacroAtPosition | undefined {
  const line = stripLineComment(document.lineAt(position.line).text);
  const macroPattern = /`([A-Za-z_][A-Za-z0-9_$]*)/g;
  for (const match of line.matchAll(macroPattern)) {
    const name = match[1] ?? '';
    const start = (match.index ?? 0) + 1;
    const end = start + name.length;
    if (position.character >= start && position.character <= end) {
      return {
        name,
        range: new vscode.Range(position.line, start, position.line, end),
      };
    }
  }
  return undefined;
}

function isOffsetOnConnectionName(connection: InstanceConnection, offset: number): boolean {
  const start = connection.startOffset + 1;
  return offset >= start && offset <= start + connection.name.length;
}

function connectionNameRange(document: vscode.TextDocument, connection: InstanceConnection): vscode.Range {
  const start = connection.startOffset + 1;
  return new vscode.Range(document.positionAt(start), document.positionAt(start + connection.name.length));
}

function locationToDefinitionLink(
  location: vscode.Location,
  originSelectionRange?: vscode.Range
): vscode.DefinitionLink {
  return {
    originSelectionRange,
    targetUri: location.uri,
    targetRange: location.range,
    targetSelectionRange: location.range,
  };
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
