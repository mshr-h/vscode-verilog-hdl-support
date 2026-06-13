// SPDX-License-Identifier: MIT
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import type { CtagsManager } from '../ctags';
import { InstanceScanner } from '../hierarchy/InstanceScanner';
import type { ModuleInstanceRecord } from '../hierarchy/HierarchyTypes';
import { getExtensionLogger } from '../logging';
import type { ProjectService } from '../project/ProjectService';
import type { CompileUnit, FileContext, ProjectSnapshot, SourceFileRef } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import {
  scanIncludeOccurrences,
  scanMacroDefinitions,
  scanMacroOccurrences,
  scanMacroUsages,
  scanWordOccurrences,
} from '../semantic/scanners/OccurrenceScanners';
import type { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';
import { isModuleContext } from './DefinitionService';

const logger = getExtensionLogger('HDL', 'References');
const HDL_LANGUAGES = new Set(['verilog', 'systemverilog']);
const WORD_PATTERN = /[A-Za-z_][A-Za-z0-9_$]*/;
const INDEXED_REFERENCE_KINDS: SymbolRecord['kind'][] = ['package', 'interface', 'class', 'typedef'];

interface ProjectFileEntry {
  uri: vscode.Uri;
  compileUnit: CompileUnit;
  sourceFile: SourceFileRef;
}

interface IncludeAtPosition {
  includeText: string;
  range: vscode.Range;
}

interface MacroAtPosition {
  name: string;
  range: vscode.Range;
  isDefinition: boolean;
}

export class ReferenceService {
  private readonly scanner = new InstanceScanner();

  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService,
    _ctagsManager?: CtagsManager
  ) {}

  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): Promise<vscode.Location[]> {
    if (!HDL_LANGUAGES.has(document.languageId) || token.isCancellationRequested) {
      return [];
    }

    const includeReferences = await this.findIncludeReferences(document, position, token);
    if (includeReferences) {
      return includeReferences;
    }

    const macroReferences = await this.findMacroReferences(document, position, context, token);
    if (macroReferences) {
      return macroReferences;
    }

    const moduleReferences = await this.findModuleReferences(document, position, context, token);
    if (moduleReferences) {
      return moduleReferences;
    }

    return this.findIndexedSymbolReferences(document, position, context, token);
  }

  private async findModuleReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    referenceContext: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): Promise<vscode.Location[] | undefined> {
    const wordRange = document.getWordRangeAtPosition(position, WORD_PATTERN);
    if (!wordRange) {
      return undefined;
    }
    const snapshot = this.projectService.getSnapshot();
    const index = this.indexService.getIndex();
    const fileContext = this.projectService.getPreferredFileContext(document.uri);
    const word = document.getText(wordRange);
    const targetName = isModuleContext(document, wordRange, word)
      ? word
      : this.findInstanceModuleAtPosition(document, position, fileContext?.compileUnitId)?.moduleName;
    if (!targetName) {
      return undefined;
    }

    const moduleRecord = index.findBestModule(targetName, fileContext);
    if (!moduleRecord) {
      return undefined;
    }

    const files = getReferenceFiles(snapshot, fileContext?.compileUnitId ?? moduleRecord.compileUnitId);
    if (isTooLarge(files.length)) {
      return [];
    }

    const locations: vscode.Location[] = [];
    if (referenceContext.includeDeclaration) {
      locations.push(new vscode.Location(moduleRecord.uri, moduleRecord.selectionRange));
    }

    for (const entry of files) {
      if (token.isCancellationRequested) {
        return locations;
      }
      const text = await readText(entry.uri);
      if (text === undefined) {
        continue;
      }
      const instances = this.scanner.scan(text, entry.uri, entry.compileUnit.id);
      for (const instance of instances) {
        if (isInstanceOfModule(instance, moduleRecord, index)) {
          locations.push(new vscode.Location(instance.uri, instance.moduleNameRange));
        }
      }
    }

    return sortLocations(deduplicateLocations(locations));
  }

  private findInstanceModuleAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    compileUnitId = ''
  ): ModuleInstanceRecord | undefined {
    return this.scanner
      .scan(document.getText(), document.uri, compileUnitId)
      .find((instance) => rangeContains(instance.moduleNameRange, position));
  }

  private async findMacroReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    referenceContext: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): Promise<vscode.Location[] | undefined> {
    const macro = getMacroAtPosition(document, position);
    if (!macro) {
      return undefined;
    }

    const snapshot = this.projectService.getSnapshot();
    const index = this.indexService.getIndex();
    const fileContext = this.projectService.getPreferredFileContext(document.uri);
    if (!macro.isDefinition && !isMacroKnown(macro.name, fileContext, index)) {
      return undefined;
    }

    const files = getReferenceFiles(snapshot, fileContext?.compileUnitId);
    if (isTooLarge(files.length)) {
      return [];
    }

    const locations: vscode.Location[] = [];
    if (referenceContext.includeDeclaration) {
      const sourceMacro = findSourceMacro(macro.name, fileContext, index);
      if (sourceMacro) {
        locations.push(new vscode.Location(sourceMacro.uri, sourceMacro.selectionRange));
      } else {
        const projectDefineLocation = fileContext?.defines[macro.name]?.location;
        if (projectDefineLocation) {
          locations.push(projectDefineLocation);
        }
      }
    }

    for (const entry of files) {
      if (token.isCancellationRequested) {
        return locations;
      }
      const text = await readText(entry.uri);
      if (text === undefined) {
        continue;
      }
      for (const occurrence of scanMacroUsages(text)) {
        if (occurrence.name === macro.name) {
          locations.push(new vscode.Location(entry.uri, occurrence.range));
        }
      }
    }

    return sortLocations(deduplicateLocations(locations));
  }

  private async findIncludeReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Location[] | undefined> {
    const include = getIncludeAtPosition(document, position);
    if (!include) {
      return undefined;
    }

    const snapshot = this.projectService.getSnapshot();
    const fileContext = this.projectService.getPreferredFileContext(document.uri) ?? createLocalFileContext(document.uri);
    const target = this.indexService.getIndex().resolveInclude(include.includeText, fileContext);
    if (!target) {
      return [new vscode.Location(document.uri, include.range)];
    }

    const files = getReferenceFiles(snapshot, fileContext.compileUnitId);
    if (isTooLarge(files.length)) {
      return [];
    }

    const locations: vscode.Location[] = [];
    for (const entry of files) {
      if (token.isCancellationRequested) {
        return locations;
      }
      const text = await readText(entry.uri);
      if (text === undefined) {
        continue;
      }
      const context = createFileContext(entry.uri, entry.compileUnit);
      for (const occurrence of scanIncludeOccurrences(text)) {
        const resolved = this.indexService.getIndex().resolveInclude(occurrence.includeText, context);
        if (resolved?.fsPath === target.fsPath) {
          locations.push(new vscode.Location(entry.uri, occurrence.range));
        }
      }
    }

    return sortLocations(deduplicateLocations(locations));
  }

  private async findIndexedSymbolReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    referenceContext: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): Promise<vscode.Location[]> {
    const wordRange = document.getWordRangeAtPosition(position, WORD_PATTERN);
    if (!wordRange) {
      return [];
    }

    const word = document.getText(wordRange);
    const snapshot = this.projectService.getSnapshot();
    const index = this.indexService.getIndex();
    const fileContext = this.projectService.getPreferredFileContext(document.uri);
    const preferredSymbols = fileContext
      ? index.findSymbolsByName(word, { compileUnitId: fileContext.compileUnitId, kinds: INDEXED_REFERENCE_KINDS })
      : [];
    const symbols = preferredSymbols.length > 0
      ? preferredSymbols
      : index.findSymbolsByName(word, { kinds: INDEXED_REFERENCE_KINDS });
    if (symbols.length === 0) {
      return [];
    }

    const compileUnitId = fileContext?.compileUnitId ?? symbols[0]?.compileUnitId;
    const files = getReferenceFiles(snapshot, compileUnitId);
    if (isTooLarge(files.length)) {
      return [];
    }

    const locations: vscode.Location[] = [];
    const declarationSymbols = symbols.filter((candidate) => !compileUnitId || candidate.compileUnitId === compileUnitId);
    if (referenceContext.includeDeclaration) {
      for (const symbol of declarationSymbols) {
        locations.push(new vscode.Location(symbol.uri, symbol.selectionRange));
      }
    }

    for (const entry of files) {
      if (token.isCancellationRequested) {
        return locations;
      }
      const text = await readText(entry.uri);
      if (text === undefined) {
        continue;
      }
      for (const occurrence of scanWordOccurrences(text, word)) {
        if (!referenceContext.includeDeclaration && isDeclarationOccurrence(entry.uri, occurrence.range, declarationSymbols)) {
          continue;
        }
        locations.push(new vscode.Location(entry.uri, occurrence.range));
      }
    }

    return sortLocations(deduplicateLocations(locations));
  }
}

function isInstanceOfModule(
  instance: ModuleInstanceRecord,
  moduleRecord: ModuleRecord,
  index: SemanticIndex
): boolean {
  const resolved = index.findBestModule(instance.moduleName, instance.compileUnitId);
  return resolved?.name === moduleRecord.name && resolved.compileUnitId === moduleRecord.compileUnitId;
}

function getReferenceFiles(snapshot: ProjectSnapshot, compileUnitId?: string): ProjectFileEntry[] {
  const compileUnits = compileUnitId
    ? snapshot.compileUnits.filter((compileUnit) => compileUnit.id === compileUnitId)
    : snapshot.compileUnits;
  const files = new Map<string, ProjectFileEntry>();
  for (const compileUnit of compileUnits) {
    for (const sourceFile of compileUnit.files) {
      const key = sourceFile.uri.toString();
      if (!files.has(key)) {
        files.set(key, { uri: sourceFile.uri, compileUnit, sourceFile });
      }
    }
  }
  return [...files.values()];
}

function isTooLarge(fileCount: number): boolean {
  const maxFiles = vscode.workspace.getConfiguration().get<number>('verilog.references.maxFiles', 1000);
  if (fileCount > maxFiles) {
    logger.warn('Skipping Verilog references because the project is too large', {
      files: fileCount,
      maxFiles,
    });
    return true;
  }
  return false;
}

async function readText(uri: vscode.Uri): Promise<string | undefined> {
  try {
    return await fs.readFile(uri.fsPath, 'utf8');
  } catch (error) {
    logger.debug('Skipping unreadable file during reference search', {
      file: uri.fsPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function getMacroAtPosition(document: vscode.TextDocument, position: vscode.Position): MacroAtPosition | undefined {
  const text = document.getText();
  for (const definition of scanMacroDefinitions(text)) {
    if (rangeContains(definition.range, position)) {
      return { name: definition.name, range: definition.range, isDefinition: true };
    }
  }
  for (const occurrence of scanMacroOccurrences(text)) {
    if (!occurrence.isDirective && rangeContains(occurrence.range, position)) {
      return { name: occurrence.name, range: occurrence.range, isDefinition: false };
    }
  }
  return undefined;
}

function getIncludeAtPosition(document: vscode.TextDocument, position: vscode.Position): IncludeAtPosition | undefined {
  const line = document.lineAt(position.line).text;
  const includePattern = /`include\s*(["<])([^">]+)[">]/g;
  for (const match of line.matchAll(includePattern)) {
    const fullMatch = match[0];
    const quote = match[1] ?? '"';
    const pathText = match[2] ?? '';
    const start = match.index ?? 0;
    const pathStart = start + fullMatch.indexOf(quote) + 1;
    const pathEnd = pathStart + pathText.length;
    if (position.character >= pathStart && position.character <= pathEnd) {
      return {
        includeText: `${quote}${pathText}${quote === '<' ? '>' : quote}`,
        range: new vscode.Range(position.line, pathStart, position.line, pathEnd),
      };
    }
  }
  return undefined;
}

function isMacroKnown(
  name: string,
  context: FileContext | undefined,
  index: SemanticIndex
): boolean {
  return Boolean(
    context?.defines[name] ??
    findSourceMacro(name, context, index)
  );
}

function findSourceMacro(
  name: string,
  context: FileContext | undefined,
  index: SemanticIndex
): SymbolRecord | undefined {
  return (context
    ? index.findSymbolsByName(name, { compileUnitId: context.compileUnitId, kinds: ['macro'] }).at(0)
    : undefined)
    ?? index.findSymbolsByName(name, { kinds: ['macro'] }).at(0);
}

function createFileContext(file: vscode.Uri, compileUnit: CompileUnit): FileContext {
  return {
    file,
    compileUnitId: compileUnit.id,
    includeDirs: compileUnit.includeDirs.slice(),
    defines: { ...compileUnit.defines },
  };
}

function createLocalFileContext(uri: vscode.Uri): FileContext {
  return {
    file: uri,
    compileUnitId: '',
    includeDirs: [],
    defines: {},
  };
}

function rangeContains(range: vscode.Range, position: vscode.Position): boolean {
  return range.start.isBeforeOrEqual(position) && range.end.isAfterOrEqual(position);
}

function isDeclarationOccurrence(
  uri: vscode.Uri,
  range: vscode.Range,
  symbols: readonly SymbolRecord[]
): boolean {
  return symbols.some((symbol) =>
    symbol.uri.toString() === uri.toString() &&
    symbol.selectionRange.isEqual(range)
  );
}

function deduplicateLocations(locations: vscode.Location[]): vscode.Location[] {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = `${location.uri.toString()}:${location.range.start.line}:${location.range.start.character}:${location.range.end.line}:${location.range.end.character}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sortLocations(locations: vscode.Location[]): vscode.Location[] {
  return locations.slice().sort((left, right) => {
    const uriCompare = left.uri.fsPath.localeCompare(right.uri.fsPath);
    if (uriCompare !== 0) {
      return uriCompare;
    }
    return left.range.start.line - right.range.start.line ||
      left.range.start.character - right.range.start.character;
  });
}
