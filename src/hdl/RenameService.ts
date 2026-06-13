// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { InstanceScanner } from '../hierarchy/InstanceScanner';
import type { ModuleInstanceRecord } from '../hierarchy/HierarchyTypes';
import type { ProjectService } from '../project/ProjectService';
import type { FileContext } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { scanMacroDefinitions, scanMacroOccurrences } from '../semantic/scanners/OccurrenceScanners';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';
import { isModuleContext } from './DefinitionService';
import type { ReferenceService } from './ReferenceService';

const HDL_LANGUAGES = new Set(['verilog', 'systemverilog']);
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const WORD_PATTERN = /[A-Za-z_][A-Za-z0-9_$]*/;

type RenameTarget =
  | { kind: 'module'; name: string; range: vscode.Range; symbol: ModuleRecord }
  | { kind: 'macro'; name: string; range: vscode.Range; symbol: SymbolRecord };

interface MacroAtPosition {
  name: string;
  range: vscode.Range;
  isDefinition: boolean;
}

export class RenameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenameError';
  }
}

export class RenameService {
  private readonly scanner = new InstanceScanner();

  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService,
    private readonly referenceService: ReferenceService
  ) {}

  async prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Range | { range: vscode.Range; placeholder: string } | undefined> {
    if (token.isCancellationRequested) {
      return undefined;
    }
    const target = this.findRenameTarget(document, position);
    return target ? { range: target.range, placeholder: target.name } : undefined;
  }

  async provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
    token: vscode.CancellationToken
  ): Promise<vscode.WorkspaceEdit | undefined> {
    if (token.isCancellationRequested) {
      return undefined;
    }
    const target = this.findRenameTarget(document, position);
    if (!target) {
      throw new RenameError('Rename is only supported for module names and source-defined macros.');
    }
    validateNewName(newName, target.kind);

    const references = await this.referenceService.provideReferences(
      document,
      position,
      { includeDeclaration: true },
      token
    );
    if (token.isCancellationRequested) {
      return undefined;
    }
    const matchingReferences = await filterExistingFileReferences(references.filter(isNonEmptyReference));
    if (matchingReferences.length === 0) {
      throw new RenameError('No safe references were found for this rename.');
    }

    const edit = new vscode.WorkspaceEdit();
    for (const location of matchingReferences) {
      edit.replace(location.uri, location.range, newName);
    }
    return edit;
  }

  private findRenameTarget(
    document: vscode.TextDocument,
    position: vscode.Position
  ): RenameTarget | undefined {
    if (!HDL_LANGUAGES.has(document.languageId)) {
      return undefined;
    }

    return this.findMacroTarget(document, position) ?? this.findModuleTarget(document, position);
  }

  private findModuleTarget(
    document: vscode.TextDocument,
    position: vscode.Position
  ): RenameTarget | undefined {
    const wordRange = document.getWordRangeAtPosition(position, WORD_PATTERN);
    if (!wordRange) {
      return undefined;
    }
    const word = document.getText(wordRange);
    const fileContext = this.projectService.getPreferredFileContext(document.uri);
    if (!fileContext) {
      return undefined;
    }
    const moduleName = isModuleContext(document, wordRange, word)
      ? word
      : this.findInstanceModuleAtPosition(document, position, fileContext.compileUnitId)?.moduleName;
    if (!moduleName) {
      return undefined;
    }

    const moduleRecord = this.indexService.getIndex().findBestModule(moduleName, fileContext);
    if (!moduleRecord || moduleRecord.compileUnitId !== fileContext.compileUnitId) {
      return undefined;
    }
    return { kind: 'module', name: moduleRecord.name, range: wordRange, symbol: moduleRecord };
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

  private findMacroTarget(
    document: vscode.TextDocument,
    position: vscode.Position
  ): RenameTarget | undefined {
    const macro = getMacroAtPosition(document, position);
    if (!macro) {
      return undefined;
    }

    const fileContext = this.projectService.getPreferredFileContext(document.uri);
    if (!fileContext) {
      return undefined;
    }
    const sourceMacro = findSourceMacro(macro.name, fileContext, this.indexService);
    if (!sourceMacro) {
      return undefined;
    }
    return { kind: 'macro', name: macro.name, range: macro.range, symbol: sourceMacro };
  }
}

function validateNewName(newName: string, kind: RenameTarget['kind']): void {
  if (newName.length === 0) {
    throw new RenameError('Rename target cannot be empty.');
  }
  if (newName.startsWith('\\')) {
    throw new RenameError('Escaped identifiers are not supported by Verilog rename.');
  }
  if (kind === 'macro' && newName.startsWith('`')) {
    throw new RenameError('Enter the macro name without the leading backtick.');
  }
  if (!IDENTIFIER_PATTERN.test(newName)) {
    throw new RenameError('Rename target must be a Verilog identifier: [A-Za-z_][A-Za-z0-9_$]*.');
  }
}

function isNonEmptyReference(location: vscode.Location): boolean {
  return location.uri.scheme === 'file' && !location.range.isEmpty;
}

async function filterExistingFileReferences(locations: vscode.Location[]): Promise<vscode.Location[]> {
  const existing: vscode.Location[] = [];
  for (const location of locations) {
    try {
      await vscode.workspace.fs.stat(location.uri);
      existing.push(location);
    } catch {
      // Stale index entries should not produce edits for missing files.
    }
  }
  return existing;
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

function findSourceMacro(
  name: string,
  context: FileContext,
  indexService: IndexService
): SymbolRecord | undefined {
  return indexService.getIndex()
    .findSymbolsByName(name, { compileUnitId: context.compileUnitId, kinds: ['macro'] })
    .at(0);
}

function rangeContains(range: vscode.Range, position: vscode.Position): boolean {
  return range.start.isBeforeOrEqual(position) && range.end.isAfterOrEqual(position);
}
