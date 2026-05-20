// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { type Logger } from '@logtape/logtape';
import { getExtensionLogger } from './logging';
import { END_OF_LINE } from './constants';
import { runTool, ToolRunError, type ToolRunResult } from './tools/ToolRunner';
import { getWorkspaceFolderForUri } from './utils/workspace';
import { WorkspaceCtagsIndex } from './ctagsWorkspaceIndex';

/**
 * Represents a symbol parsed from ctags output.
 * Symbols include modules, functions, ports, nets, and other Verilog/SystemVerilog constructs.
 */
export class Symbol {
  /** The name of the symbol (e.g., module name, signal name) */
  name: string;
  /** The ctags type (e.g., 'module', 'function', 'port', 'net') */
  type: string;
  /** The pattern from ctags output */
  pattern: string;
  /** The starting position of the symbol in the document */
  startPosition: vscode.Position;
  /** The ending position of the symbol in the document */
  endPosition: vscode.Position;
  /** The parent scope name (e.g., the module containing this signal) */
  parentScope: string;
  /** The type of the parent scope (e.g., 'module') */
  parentType: string;
  /** Whether the symbol has a valid end position */
  isValid: boolean;

  /**
   * Creates a new Symbol instance.
   * @param name - The symbol name
   * @param type - The ctags type
   * @param pattern - The pattern from ctags
   * @param startLine - The line number where the symbol starts (0-indexed)
   * @param parentScope - The name of the parent scope
   * @param parentType - The type of the parent scope
   * @param endLine - The line number where the symbol ends (optional)
   * @param isValid - Whether the symbol has a valid end position (optional)
   */
  constructor(
    name: string,
    type: string,
    pattern: string,
    startLine: number,
    parentScope: string,
    parentType: string,
    endLine?: number,
    isValid?: boolean
  ) {
    this.name = name;
    this.type = type;
    this.pattern = pattern;
    this.startPosition = new vscode.Position(startLine, 0);
    this.parentScope = parentScope;
    this.parentType = parentType;
    this.isValid = isValid ?? false;
    this.endPosition = new vscode.Position(endLine ?? startLine, END_OF_LINE);
  }

  /**
   * Sets the end position of the symbol and marks it as valid.
   * @param endLine - The line number where the symbol ends (0-indexed)
   */
  setEndPosition(endLine: number) {
    this.endPosition = new vscode.Position(endLine, END_OF_LINE);
    this.isValid = true;
  }

  /**
   * Converts this Symbol to a VS Code DocumentSymbol for the outline view.
   * @returns A DocumentSymbol representing this symbol
   */
  getDocumentSymbol(): vscode.DocumentSymbol {
    const range = new vscode.Range(this.startPosition, this.endPosition);
    return new vscode.DocumentSymbol(
      this.name,
      this.type,
      Symbol.getSymbolKind(this.type),
      range,
      range
    );
  }

  /**
   * Determines if a symbol type can contain other symbols.
   * Container types include modules, functions, classes, etc.
   * @param type - The ctags type string
   * @returns True if the type can contain child symbols
   */
  static isContainer(type: string): boolean {
    switch (type) {
      case 'constant':
      case 'parameter':
      case 'event':
      case 'net':
      case 'port':
      case 'register':
      case 'modport':
      case 'prototype':
      case 'typedef':
      case 'property':
      case 'assert':
        return false;
      case 'function':
      case 'module':
      case 'task':
      case 'block':
      case 'class':
      case 'covergroup':
      case 'enum':
      case 'interface':
      case 'package':
      case 'program':
      case 'struct':
        return true;
    }
    return false;
  }

  /**
   * Maps a ctags type string to a VS Code SymbolKind.
   * @param name - The ctags type string
   * @returns The corresponding VS Code SymbolKind
   * @see https://github.com/universal-ctags/ctags/blob/master/parsers/verilog.c
   */
  static getSymbolKind(name: String): vscode.SymbolKind {
    switch (name) {
      case 'constant':
        return vscode.SymbolKind.Constant;
      case 'parameter':
        return vscode.SymbolKind.Constant;
      case 'event':
        return vscode.SymbolKind.Event;
      case 'function':
        return vscode.SymbolKind.Function;
      case 'module':
        return vscode.SymbolKind.Module;
      case 'net':
        return vscode.SymbolKind.Variable;
      // Boolean uses a double headed arrow as symbol (kinda looks like a port)
      case 'port':
        return vscode.SymbolKind.Boolean;
      case 'register':
        return vscode.SymbolKind.Variable;
      case 'task':
        return vscode.SymbolKind.Function;
      case 'block':
        return vscode.SymbolKind.Module;
      case 'assert':
        return vscode.SymbolKind.Variable; // No idea what to use
      case 'class':
        return vscode.SymbolKind.Class;
      case 'covergroup':
        return vscode.SymbolKind.Class; // No idea what to use
      case 'enum':
        return vscode.SymbolKind.Enum;
      case 'interface':
        return vscode.SymbolKind.Interface;
      case 'modport':
        return vscode.SymbolKind.Boolean; // same as ports
      case 'package':
        return vscode.SymbolKind.Package;
      case 'program':
        return vscode.SymbolKind.Module;
      case 'prototype':
        return vscode.SymbolKind.Function;
      case 'property':
        return vscode.SymbolKind.Property;
      case 'struct':
        return vscode.SymbolKind.Struct;
      case 'typedef':
        return vscode.SymbolKind.TypeParameter;
      default:
        return vscode.SymbolKind.Variable;
    }
  }
}

/**
 * Parses a single ctags output line into a Symbol.
 * @param line - A line from ctags output
 * @param logger - Logger used for parse diagnostics
 * @returns A Symbol object or undefined if parsing fails
 */
export function parseCtagsTagLine(line: string, logger: Logger): Symbol | undefined {
  try {
    let type, parentScope, parentType: string;
    let scope: string[];
    const parts: string[] = line.split('\t');
    const name = parts[0];
    const pattern = parts[2];
    type = parts[3];
    // override "type" for parameters (See #102)
    if (parts.length === 6 && parts[5] === 'parameter:') {
      type = 'parameter';
    }
    if (parts.length >= 5) {
      scope = parts[4].split(':');
      parentType = scope[0];
      parentScope = scope[1];
    } else {
      parentScope = '';
      parentType = '';
    }
    const lineNoStr = parts[2];
    const lineNo = Number(lineNoStr.slice(0, -2)) - 1;
    return new Symbol(name, type, pattern, lineNo, parentScope, parentType, lineNo, false);
  } catch (err) {
    logger.error`Line Parser: ${err}`;
    logger.error`Line: ${line}`;
  }
  return undefined;
}

/**
 * Manages ctags execution and symbol parsing for a single document.
 * Caches parsed symbols and re-indexes when the document is dirty.
 */
export class Ctags implements vscode.Disposable {
  /** The list of parsed symbols */
  symbols: Symbol[];
  /** The document being indexed */
  doc: vscode.TextDocument;
  /** Whether the symbol cache needs to be rebuilt */
  isDirty: boolean;
  private logger: Logger;
  private ctagBinPath!: string;
  private indexingPromise?: Promise<void>;
  private readonly disposables: vscode.Disposable[] = [];
  private disposed = false;

  /**
   * Creates a new Ctags instance for a document.
   * @param logger - The logger instance for output
   * @param document - The document to index
   */
  constructor(logger: Logger, document: vscode.TextDocument) {
    this.symbols = [];
    this.isDirty = true;
    this.logger = logger;
    this.doc = document;
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('verilog.ctags')) {
          this.updateConfig();
        }
      })
    );
    this.updateConfig();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.symbols = [];
  }

  private updateConfig() {
    this.ctagBinPath = <string>(
      vscode.workspace.getConfiguration().get('verilog.ctags.path', 'ctags')
    );
  }

  /**
   * Clears the cached symbols and marks the cache as dirty.
   */
  clearSymbols() {
    if (this.disposed) {
      return;
    }
    this.isDirty = true;
    this.symbols = [];
  }

  /**
   * Gets the list of parsed symbols.
   * @returns The array of Symbol objects
   */
  getSymbolsList(): Symbol[] {
    return this.symbols;
  }

  /**
   * Executes ctags on a file and returns the raw output.
   * @param filepath - The path to the file to index
   * @returns The ctags output as a string
   */
  async execCtags(filepath: string): Promise<string> {
    this.logger.info`Executing ctags: ${this.ctagBinPath} ${this.getCtagsArgs(filepath).join(' ')}`;
    try {
      const result = await runTool({
        command: this.ctagBinPath,
        args: this.getCtagsArgs(filepath),
        collectStdout: true,
        collectStderr: true,
      });
      if (result.exitCode === 0) {
        if (result.stdout === '') {
          this.logger.info`ctags completed with no output for ${filepath}`;
        }
        return result.stdout;
      }
      if (result.stderr !== '') {
        this.logger.warn`ctags stderr: ${result.stderr}`;
      }
      this.logger.warn`ctags exited with code ${result.exitCode} for ${filepath}`;
    } catch (err) {
      this.logCtagsError(filepath, err);
    }

    // Return empty promise if ctags path is not set to avoid errors when indexing
    return Promise.resolve('');
  }

  protected getCtagsArgs(filepath: string): string[] {
    return [
      '-f',
      '-',
      '--fields=+K',
      '--sort=no',
      '--excmd=n',
      '--fields-SystemVerilog=+{parameter}',
      filepath,
    ];
  }

  /**
   * Parses a single line of ctags output into a Symbol.
   * @param line - A line from ctags output
   * @returns A Symbol object or undefined if parsing fails
   */
  parseTagLine(line: string): Symbol | undefined {
    return parseCtagsTagLine(line, this.logger);
  }

  protected addTagLine(line: string): void {
    if (this.disposed || line === '') {
      return;
    }
    const tag: Symbol | undefined = this.parseTagLine(line);
    if (tag) {
      this.symbols.push(tag);
    }
  }

  protected finalizeSymbolRanges(): void {
    if (this.disposed) {
      return;
    }
    // end tags are not supported yet in ctags. So, using regex
    let match: RegExpExecArray | null;
    let endPosition: vscode.Position;
    const text = this.doc.getText();
    const eRegex: RegExp = /^(?![\r\n])\s*end(\w*)*[\s:]?/gm;
    while ((match = eRegex.exec(text))) {
      if (match && typeof match[1] !== 'undefined') {
        endPosition = this.doc.positionAt(match.index + match[0].length - 1);
        // get the starting symbols of the same type
        // doesn't check for begin...end blocks
        const matchType = match[1];
        const s = this.symbols.filter(
          (i) => i.type === matchType && i.startPosition.isBefore(endPosition) && !i.isValid
        );
        if (s.length > 0) {
          // get the symbol nearest to the end tag
          let max: Symbol = s[0];
          for (let i = 0; i < s.length; i++) {
            max = s[i].startPosition.isAfter(max.startPosition) ? s[i] : max;
          }
          for (const i of this.symbols) {
            if (
              i.name === max.name &&
              i.startPosition.isEqual(max.startPosition) &&
              i.type === max.type
            ) {
              i.setEndPosition(endPosition.line);
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Builds the symbols list from ctags output.
   * Parses the output and determines end positions using regex.
   * @param tags - The raw ctags output
   */
  async buildSymbolsList(tags: string): Promise<void> {
    if (this.disposed) {
      return;
    }
    try {
      if (this.isDirty) {
        this.logger.info`building symbols`;
        this.symbols = [];
        if (tags === '') {
          if (this.disposed) {
            return;
          }
          this.logger.info`ctags completed with no tags`;
          this.isDirty = false;
          return;
        }
        // Parse ctags output
        const lines: string[] = tags.split(/\r?\n/);
        lines.forEach((line) => {
          this.addTagLine(line);
        });

        if (this.disposed) {
          return;
        }
        this.finalizeSymbolRanges();
        if (this.disposed) {
          return;
        }
        this.isDirty = false;
      }
    } catch (err) {
      this.logger.error`${err}`;
    }
  }

  protected async runCtagsStreaming(filepath: string): Promise<ToolRunResult> {
    let tagCount = 0;
    const result = await runTool({
      command: this.ctagBinPath,
      args: this.getCtagsArgs(filepath),
      collectStderr: true,
      onStdoutLine: (line) => {
        if (line !== '') {
          tagCount++;
        }
        this.addTagLine(line);
      },
    });
    if (result.exitCode === 0 && tagCount === 0) {
      this.logger.info`ctags completed with no tags for ${filepath}`;
    }
    return result;
  }

  private async rebuildIndex(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.logger.info`indexing ${this.doc.uri.fsPath}`;
    this.symbols = [];
    try {
      const result = await this.runCtagsStreaming(this.doc.uri.fsPath);
      if (this.disposed) {
        return;
      }
      if (result.exitCode === 0) {
        this.finalizeSymbolRanges();
        if (this.disposed) {
          return;
        }
        this.isDirty = false;
        return;
      }
      if (result.stderr !== '') {
        this.logger.warn`ctags stderr: ${result.stderr}`;
      }
      this.logger.warn`ctags exited with code ${result.exitCode} for ${this.doc.uri.fsPath}`;
      this.symbols = [];
    } catch (err) {
      if (this.disposed) {
        return;
      }
      this.symbols = [];
      this.logCtagsError(this.doc.uri.fsPath, err);
    }
  }

  private logCtagsError(filepath: string, err: unknown): void {
    if (err instanceof ToolRunError) {
      this.logger.warn`ctags failed for ${filepath}: ${err.message}`;
      return;
    }
    this.logger.error`ctags exception for ${filepath}: ${err}`;
  }

  /**
   * Indexes the document by running ctags and building the symbols list.
   */
  async index(): Promise<void> {
    if (this.disposed || !this.isDirty) {
      return;
    }
    if (this.indexingPromise) {
      return this.indexingPromise;
    }
    this.indexingPromise = this.rebuildIndex().finally(() => {
      this.indexingPromise = undefined;
    });
    return this.indexingPromise;
  }
}

/**
 * Manages Ctags instances for multiple documents.
 * Provides caching, configuration management, and symbol lookup across files.
 */
export class CtagsManager implements vscode.Disposable {
  private filemap: Map<vscode.TextDocument, Ctags> = new Map();
  private readonly logger = getExtensionLogger('Ctags', 'Manager');
  private readonly workspaceIndex = new WorkspaceCtagsIndex(this.logger);
  private readonly subscriptions: vscode.Disposable[] = [];
  private enabled = false;
  private disposed = false;

  /**
   * Configures the CtagsManager and sets up event listeners.
   */
  configure() {
    if (this.disposed) {
      return;
    }
    if (this.subscriptions.length > 0) {
      this.updateConfig();
      return;
    }
    this.logger.info`ctags manager configure`;
    this.updateConfig();
    this.workspaceIndex.configure();
    this.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(this.onSave.bind(this)),
      vscode.workspace.onDidCloseTextDocument(this.onClose.bind(this)),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('verilog.ctags')) {
          this.updateConfig();
          this.workspaceIndex.configure();
        }
      })
    );
  }

  private updateConfig() {
    const config = vscode.workspace.getConfiguration('verilog.ctags');
    const nextEnabled = <boolean>config.get('enabled', false);
    if (this.enabled !== nextEnabled) {
      this.enabled = nextEnabled;
      this.logger.info`ctags enabled: ${this.enabled}`;
      this.invalidateCache();
    }
  }

  private invalidateCache() {
    if (this.disposed) {
      return;
    }
    for (const ctags of this.filemap.values()) {
      ctags.clearSymbols();
    }
    this.workspaceIndex.invalidateAll();
  }

  /**
   * Gets or creates a Ctags instance for a document.
   * @param doc - The document to get the Ctags instance for
   * @returns The Ctags instance for the document
   */
  getCtags(doc: vscode.TextDocument): Ctags {
    if (this.disposed) {
      const ctags = new Ctags(this.logger, doc);
      ctags.dispose();
      return ctags;
    }
    let ctags: Ctags | undefined = this.filemap.get(doc);
    if (ctags === undefined) {
      ctags = new Ctags(this.logger, doc);
      this.filemap.set(doc, ctags);
    }
    return ctags;
  }

  /**
   * Handles document close events by removing the cached Ctags instance.
   * @param doc - The document that was closed
   */
  onClose(doc: vscode.TextDocument) {
    const ctags = this.filemap.get(doc);
    if (ctags) {
      ctags.dispose();
      this.filemap.delete(doc);
    }
  }

  /**
   * Handles document save events by invalidating the symbol cache.
   * @param doc - The document that was saved
   */
  onSave(doc: vscode.TextDocument) {
    this.logger.info`on save`;
    if (this.disposed || !this.enabled) {
      return;
    }
    const ctags: Ctags = this.getCtags(doc);
    ctags.clearSymbols();
    this.workspaceIndex.invalidateUri(doc.uri);
  }

  /**
   * Gets all symbols for a document, indexing if necessary.
   * @param doc - The document to get symbols for
   * @returns An array of Symbol objects
   */
  async getSymbols(doc: vscode.TextDocument): Promise<Symbol[]> {
    if (this.disposed || !this.enabled) {
      return [];
    }
    const ctags: Ctags = this.getCtags(doc);
    // If dirty, re index and then build symbols
    if (ctags.isDirty) {
      await ctags.index();
    }
    return ctags.symbols;
  }

  /**
   * Finds symbol definitions matching a target text in a single document.
   * @param document - The document to search in
   * @param targetText - The symbol name to find
   * @returns An array of DefinitionLink objects
   */
  async findDefinition(document: vscode.TextDocument, targetText: string): Promise<vscode.DefinitionLink[]> {
    if (this.disposed || !this.enabled) {
      return [];
    }
    const symbols: Symbol[] = await this.getSymbols(document);
    const matchingSymbols = symbols.filter((sym) => sym.name === targetText);

    return matchingSymbols.map((i) => ({
        targetUri: document.uri,
        targetRange: new vscode.Range(
          i.startPosition,
          new vscode.Position(i.startPosition.line, END_OF_LINE)
        ),
        targetSelectionRange: new vscode.Range(i.startPosition, i.endPosition),
      }));
  }

  /**
   * Finds symbol definitions at a position, searching the current document
   * and related files (e.g., module.sv for module definitions).
   * @param document - The document containing the position
   * @param position - The position to look up
   * @returns An array of DefinitionLink objects from all searched documents
   */
  async findSymbol(
    document: vscode.TextDocument,
    position: vscode.Position,
    token?: vscode.CancellationToken
  ): Promise<vscode.DefinitionLink[]> {
    if (this.disposed || !this.enabled) {
      return [];
    }
    
    const textRange = document.getWordRangeAtPosition(position);
    if (!textRange || textRange.isEmpty) {
      return [];
    }
    const targetText = document.getText(textRange);
    const qualifier = this.getQualifier(document, textRange);
    
    const results = await this.findDefinition(document, targetText);
    const workspaceFolder = getWorkspaceFolderForUri(document.uri);
    if (workspaceFolder) {
      const workspaceResults = await this.workspaceIndex.findDefinitions(workspaceFolder, targetText, {
        currentDocument: document,
        qualifier,
        token,
      });
      results.push(...workspaceResults);
    }

    return dedupeDefinitionLinks(results);
  }

  private getQualifier(document: vscode.TextDocument, textRange: vscode.Range): string | undefined {
    const prevChar = textRange.start.character - 1;
    if (prevChar < 0) {
      return undefined;
    }
    const prevCharText = document.getText(
      new vscode.Range(textRange.start.line, prevChar, textRange.start.line, prevChar + 1)
    );
    if (prevCharText !== '.' && prevCharText !== ':') {
      return undefined;
    }
    const qualifierPosition = prevCharText === ':'
      ? new vscode.Position(textRange.start.line, Math.max(0, prevChar - 2))
      : new vscode.Position(textRange.start.line, prevChar - 1);
    const prevWordRange = document.getWordRangeAtPosition(qualifierPosition);
    if (!prevWordRange) {
      return undefined;
    }
    return document.getText(prevWordRange);
  }

  async rebuildWorkspaceIndex(
    folder?: vscode.WorkspaceFolder,
    token?: vscode.CancellationToken
  ): Promise<void> {
    if (this.disposed || !this.enabled) {
      return;
    }
    await this.workspaceIndex.rebuild(folder, token);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
    this.subscriptions.length = 0;
    for (const ctags of this.filemap.values()) {
      ctags.dispose();
    }
    this.filemap.clear();
    this.workspaceIndex.dispose();
  }
}

export function dedupeDefinitionLinks(
  links: readonly vscode.DefinitionLink[]
): vscode.DefinitionLink[] {
  const seen = new Set<string>();
  const deduped: vscode.DefinitionLink[] = [];
  for (const link of links) {
    const key = [
      link.targetUri.toString(),
      link.targetRange.start.line,
      link.targetSelectionRange?.start.line ?? link.targetRange.start.line,
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(link);
  }
  return deduped;
}
