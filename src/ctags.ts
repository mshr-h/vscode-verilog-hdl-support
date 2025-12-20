// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import {exec as execNonPromise} from 'child_process';
import * as util from 'util';
import { Logger } from './logger';
const exec = util.promisify(execNonPromise);

// Internal representation of a symbol
export class Symbol {
  name: string;
  type: string;
  pattern: string;
  startPosition: vscode.Position;
  endPosition: vscode.Position;
  parentScope: string;
  parentType: string;
  isValid: boolean;
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
    this.endPosition = new vscode.Position(endLine ?? startLine, Number.MAX_VALUE);
  }

  setEndPosition(endLine: number) {
    this.endPosition = new vscode.Position(endLine, Number.MAX_VALUE);
    this.isValid = true;
  }

  getDocumentSymbol(): vscode.DocumentSymbol {
    let range = new vscode.Range(this.startPosition, this.endPosition);
    return new vscode.DocumentSymbol(
      this.name,
      this.type,
      Symbol.getSymbolKind(this.type),
      range,
      range
    );
  }

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

  // types used by ctags
  // taken from https://github.com/universal-ctags/ctags/blob/master/parsers/verilog.c
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

export class Ctags {
  /// Symbol definitions (no rhs)
  symbols: Symbol[];
  doc: vscode.TextDocument;
  isDirty: boolean;
  private logger: Logger;
  private ctagBinPath!: string;

  constructor(logger: Logger, document: vscode.TextDocument) {
    this.symbols = [];
    this.isDirty = true;
    this.logger = logger;
    this.doc = document;
    vscode.workspace.onDidChangeConfiguration(() => {
      this.updateConfig();
    });
    this.updateConfig();
  }

  private updateConfig() {
    this.ctagBinPath = <string>(
      vscode.workspace.getConfiguration().get('verilog.ctags.path', 'ctags')
    );
  }

  clearSymbols() {
    this.isDirty = true;
    this.symbols = [];
  }

  getSymbolsList(): Symbol[] {
    return this.symbols;
  }

  async execCtags(filepath: string): Promise<string> {
    let command: string = this.ctagBinPath + ' -f - --fields=+K --sort=no --excmd=n --fields-SystemVerilog=+{parameter} "' + filepath + '"';
    this.logger.info('Executing Command: ' + command);
    try {
      const {stdout, stderr} = await exec(command);
      if(stdout) {
        return stdout.toString();
      }
      if(stderr) {
        this.logger.error('stderr> ' + stderr);
      }
    }
    catch (err) {
      this.logger.error('Exception caught: ' + (err instanceof Error ? err.message : String(err)));
      if (err instanceof Error && err.stack) {
        this.logger.error(err.stack);
      }
    }

    // Return empty promise if ctags path is not set to avoid errors when indexing
    return Promise.resolve('');
  }

  parseTagLine(line: string): Symbol | undefined {
    try {
      let name, type, pattern, lineNoStr, parentScope, parentType: string;
      let scope: string[];
      let lineNo: number;
      let parts: string[] = line.split('\t');
      name = parts[0];
      pattern = parts[2];
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
      lineNoStr = parts[2];
      lineNo = Number(lineNoStr.slice(0, -2)) - 1;
      return new Symbol(name, type, pattern, lineNo, parentScope, parentType, lineNo, false);
    } catch (err) {
      this.logger.error('Line Parser: ' + err);
      this.logger.error('Line: ' + line);
    }
    return undefined;
  }

  async buildSymbolsList(tags: string): Promise<void> {
    try {
      if (this.isDirty) {
        this.logger.info('building symbols');
        if (tags === '') {
          this.logger.error('No output from ctags');
          return;
        }
        // Parse ctags output
        let lines: string[] = tags.split(/\r?\n/);
        lines.forEach((line) => {
          if (line !== '') {
            let tag: Symbol | undefined = this.parseTagLine(line);
            if (tag) {
              this.symbols.push(tag);
            }
          }
        });

        // end tags are not supported yet in ctags. So, using regex
        let match: RegExpExecArray | null;
        let endPosition: vscode.Position;
        let text = this.doc.getText();
        let eRegex: RegExp = /^(?![\r\n])\s*end(\w*)*[\s:]?/gm;
        while ((match = eRegex.exec(text))) {
          if (match && typeof match[1] !== 'undefined') {
            endPosition = this.doc.positionAt(match.index + match[0].length - 1);
            // get the starting symbols of the same type
            // doesn't check for begin...end blocks
            const matchType = match[1];
            let s = this.symbols.filter(
              (i) => i.type === matchType && i.startPosition.isBefore(endPosition) && !i.isValid
            );
            if (s.length > 0) {
              // get the symbol nearest to the end tag
              let max: Symbol = s[0];
              for (let i = 0; i < s.length; i++) {
                max = s[i].startPosition.isAfter(max.startPosition) ? s[i] : max;
              }
              for (let i of this.symbols) {
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
        this.isDirty = false;
      }
    } catch (err) {
      this.logger.error(String(err));
      if (err instanceof Error && err.stack) {
        this.logger.error(err.stack);
      }
    }
  }

  async index(): Promise<void> {
    this.logger.info('indexing ', this.doc.uri.fsPath);
    
    let output = await this.execCtags(this.doc.uri.fsPath);
    await this.buildSymbolsList(output);
  }
}

export class CtagsManager {
  private filemap: Map<vscode.TextDocument, Ctags> = new Map();
  private logger!: Logger;
  private enabled = false;

  configure(logger: Logger) {
    this.logger = logger;
    this.logger.info('ctags manager configure');
    this.updateConfig();
    vscode.workspace.onDidSaveTextDocument(this.onSave.bind(this));
    vscode.workspace.onDidCloseTextDocument(this.onClose.bind(this));
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('verilog.ctags')) {
        this.updateConfig();
      }
    });
  }

  private updateConfig() {
    let config = vscode.workspace.getConfiguration('verilog.ctags');
    let nextEnabled = <boolean>config.get('enabled', false);
    if (this.enabled !== nextEnabled) {
      this.enabled = nextEnabled;
      this.logger.info('ctags enabled: ' + this.enabled);
      this.invalidateCache();
    }
  }

  private invalidateCache() {
    for (let ctags of this.filemap.values()) {
      ctags.clearSymbols();
    }
  }

  getCtags(doc: vscode.TextDocument): Ctags {
    let ctags: Ctags | undefined = this.filemap.get(doc);
    if (ctags === undefined) {
      ctags = new Ctags(this.logger, doc);
      this.filemap.set(doc, ctags);
    }
    return ctags;
  }
  onClose(doc: vscode.TextDocument) {
    this.filemap.delete(doc);
  }

  onSave(doc: vscode.TextDocument) {
    this.logger.info('on save');
    if (!this.enabled) {
      return;
    }
    let ctags: Ctags = this.getCtags(doc);
    ctags.clearSymbols();
  }

  async getSymbols(doc: vscode.TextDocument): Promise<Symbol[]> {
    if (!this.enabled) {
      return [];
    }
    let ctags: Ctags = this.getCtags(doc);
    // If dirty, re index and then build symbols
    if (ctags.isDirty) {
      await ctags.index();
    }
    return ctags.symbols;
  }



  /// find a matching symbol in a single document
  async findDefinition(document: vscode.TextDocument, targetText: string): Promise<vscode.DefinitionLink[]> {
    if (!this.enabled) {
      return [];
    }
    let symbols: Symbol[] = await this.getSymbols(document);
    let matchingSymbols = symbols.filter((sym) => sym.name === targetText);

    return matchingSymbols.map((i) => {
      return {
        targetUri: document.uri,
        targetRange: new vscode.Range(
          i.startPosition,
          new vscode.Position(i.startPosition.line, Number.MAX_VALUE)
        ),
        targetSelectionRange: new vscode.Range(i.startPosition, i.endPosition),
      };
    });
  }

  /// Finds a symbols definition, but also looks in targetText.sv to get module/interface defs
  async findSymbol(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.DefinitionLink[]> {
    if (!this.enabled) {
      return [];
    }
    
    let textRange = document.getWordRangeAtPosition(position);
    if (!textRange || textRange.isEmpty) {
      return [];
    }
    let targetText = document.getText(textRange);
    
    // always search the current doc
    let tasks = [this.findDefinition(document, targetText)];

    // if the previous character is :: or ., look up prev word
    let prevChar = textRange.start.character - 1;
    let prevCharRange = new vscode.Range(position.line, prevChar, position.line, prevChar+1);
    let prevCharText = document.getText(prevCharRange);
    let moduleToFind: string = targetText;
    if (prevCharText === '.' || prevCharText === ':') {
      let prevWordRange = document.getWordRangeAtPosition(new vscode.Position(position.line, prevChar - 2));
      if (prevWordRange) {
        moduleToFind = document.getText(prevWordRange);
      }
    }

    // kick off async job for indexing for module.sv
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      let searchPattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], `**/${moduleToFind}.sv`);
      let files = await vscode.workspace.findFiles(searchPattern);
      if (files.length !== 0) {
        let file = await vscode.workspace.openTextDocument(files[0]);
        tasks.push(this.findDefinition(file, targetText));
      }
    }
    
    // TODO: use promise.race
    const results: vscode.DefinitionLink[][] = await Promise.all(tasks);
    return results.reduce((acc, val) => acc.concat(val), []);
  }
}
