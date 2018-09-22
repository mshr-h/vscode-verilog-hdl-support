import {TextDocument, Position, SymbolKind, Range, DocumentSymbol, workspace, window, TextEditor, commands} from 'vscode'
import * as child from 'child_process';
import { resolve } from 'url';

// Internal representation of a symbol
export class Symbol {
    name: string;
    type: string;
    pattern: string;
    startPosition: Position;
    endPosition: Position;
    parentScope: string;
    parentType: string;
    isValid: boolean;
    constructor(name: string, type: string, pattern: string, startLine: number, parentScope: string, parentType: string, endLine?: number, isValid?: boolean) {
        this.name = name;
        this.type = type;
        this.pattern = pattern;
        this.startPosition = new Position(startLine, 0);
        this.parentScope = parentScope;
        this.parentType = parentType;
        this.isValid = isValid;
        this.endPosition = new Position(endLine, Number.MAX_VALUE);
    }

    setEndPosition(endLine: number) {
        this.endPosition = new Position(endLine, Number.MAX_VALUE);
        this.isValid = true;
    }

    getDocumentSymbol() : DocumentSymbol {
        let range = new Range(this.startPosition, this.endPosition);
        return new DocumentSymbol(this.name, this.type, Symbol.getSymbolKind(this.type), range, range);
    }

    // types used by ctags
    // taken from https://github.com/universal-ctags/ctags/blob/master/parsers/verilog.c
    static getSymbolKind(name: String): SymbolKind {
        switch(name) {
            case 'constant' : return SymbolKind.Constant;
            case 'event'    : return SymbolKind.Event;
            case 'function' : return SymbolKind.Function;
            case 'module'   : return SymbolKind.Module;
            case 'net'      : return SymbolKind.Variable;
            // Boolean uses a double headed arrow as symbol (kinda looks like a port)
            case 'port'     : return SymbolKind.Boolean;
            case 'register' : return SymbolKind.Variable;
            case 'task'     : return SymbolKind.Function;
            case 'block'    : return SymbolKind.Module;
            case 'assert'   : return SymbolKind.Variable;   // No idea what to use
            case 'class'    : return SymbolKind.Class;
            case 'covergroup':return SymbolKind.Class;  // No idea what to use
            case 'enum'     : return SymbolKind.Enum;
            case 'interface': return SymbolKind.Interface;
            case 'modport'  : return SymbolKind.Boolean;    // same as ports
            case 'package'  : return SymbolKind.Package;
            case 'program'  : return SymbolKind.Module;
            case 'prototype': return SymbolKind.Function;
            case 'property' : return SymbolKind.Property;
            case 'struct'   : return SymbolKind.Struct;
            case 'typedef'  : return SymbolKind.TypeParameter;
            default         : return SymbolKind.Variable;
        }
    }
}

// TODO: add a user setting to enable/disable all ctags based operations
export class Ctags {

    symbols: Symbol [] ;
    doc: TextDocument;
    isDirty: boolean;

    constructor() {
        this.symbols = [];
        this.isDirty = true;
    }

    setDocument(doc: TextDocument) {
        this.doc = doc;
        this.clearSymbols();
    }

    clearSymbols() {
        this.isDirty = true;
        this.symbols = [];
    }

    getSymbolsList() : Symbol [] {
        return this.symbols;
    }

    execCtags() : Thenable<string> {
        console.log("executing ctags");

        let ctags: string = <string>workspace.getConfiguration().get('verilog.ctags.path');
        let command: string = ctags + ' -f - --fields=+nK --sort=no "' + this.doc.uri.fsPath + '"';
        console.log(command);
        return new Promise((resolve, reject) =>{
            child.exec(command, (error:Error, stdout:string, stderr:string) => {
            resolve(stdout);
            })
        })
    }

    parseTagLine(line: string) : Symbol {
        try {
        let name, type, pattern, lineNoStr, parentScope, parentType : string;
        let scope: string [];
        let lineNo: number;
        let parts: string [] = line.split('\t');
        name = parts[0];
        type = parts[3];
        if(parts.length == 6) {
            scope = parts[5].split(':');
            parentType = scope[0];
            parentScope = scope[1];
        }
        else {
            parentScope = '';
            parentType = '';
        }
        lineNoStr = parts[4];
        lineNo = Number((lineNoStr.split(':'))[1]) - 1;
        return new Symbol(name, type, pattern, lineNo, parentScope, parentType, lineNo, false);
        } catch(e) {console.log(e)}
    }

    buildSymbolsList(tags:string) : Thenable<void> {
        try {
        console.log("building symbols");
        if(tags === '') {
            console.log("No output from ctags");
            return;
        }
        // Parse ctags output
        let lines: string [] = tags.split(/\r?\n/);
        lines.forEach(line => {
            if(line !== '')
                this.symbols.push(this.parseTagLine(line));
        });

        // end tags are not supported yet in ctags. So, using regex
        let match;
        let endPosition;
        let text = this.doc.getText();
        let eRegex: RegExp = /^(?![\r\n])\s*end(\w*)*[\s:]?/gm;
        while(match = eRegex.exec(text)) {
            if(match && typeof match[1] !== 'undefined') {
                endPosition = this.doc.positionAt(match.index + match[0].length - 1);
                // get the starting symbols of the same type
                // doesn't check for begin...end blocks
                let s = this.symbols.filter(i => i.type === match[1] && i.startPosition.isBefore(endPosition) && !i.isValid);
                if(s.length > 0) {
                    // get the symbol nearest to the end tag
                    let max : Symbol = s[0];
                    for(let i = 0; i < s.length; i++) {
                        max = s[i].startPosition.isAfter(max.startPosition) ? s[i] : max;
                    }
                    for(let i of this.symbols) {
                        if(i.name === max.name && i.startPosition.isEqual(max.startPosition) && i.type === max.type) {
                            i.setEndPosition(endPosition.line);
                            break;
                        }
                    }
                }
            }
        }
        console.log(this.symbols);
        this.isDirty = false;
        return Promise.resolve()
    } catch(e) {console.log(e)}
    }

    index() : Thenable<void> {
        console.log("indexing...");
        return new Promise((resolve, reject) => {
            this.execCtags()
            .then(output => this.buildSymbolsList(output))
            .then(() => resolve());
        })
    }

}

export class CtagsManager {
    static ctags : Ctags;

    constructor() {
        CtagsManager.ctags = new Ctags();
    }

    configure() {
        console.log("ctags manager configure");
        workspace.onDidSaveTextDocument(this.onSave);
        workspace.onDidOpenTextDocument(this.onOpen);
    }

    onSave(doc:TextDocument) {
        console.log("on save");
        CtagsManager.ctags.clearSymbols();
        // Should automatically refresh the Document symbols show, but doesn't seem to be working
        commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri);
    }

    onOpen(doc:TextDocument) {
        console.log("on open");
        CtagsManager.ctags.setDocument(doc);
    }
}