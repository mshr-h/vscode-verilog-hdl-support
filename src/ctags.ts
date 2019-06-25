import { TextDocument, Position, SymbolKind, Range, DocumentSymbol, workspace, window, TextEditor, commands, SymbolInformation, Location, Uri } from 'vscode'
import * as child from 'child_process';
import { resolve } from 'url';


export function isContainer(type: string): boolean {
    switch (type) {
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
        case 'constant':
        case 'event':
        case 'net':
        case 'port':
        case 'register':
        case 'modport':
        case 'prototype':
        case 'typedef':
        case 'property':
        case 'assert':
        default:
            return false;
    }
}

// types used by ctags
// taken from https://github.com/universal-ctags/ctags/blob/master/parsers/verilog.c
export function getSymbolKind(name: String): SymbolKind {
    switch (name) {
        case 'constant':
        case 'parameter':
        case 'localparam': return SymbolKind.Constant;
        case 'package':
        case 'import': return SymbolKind.Package;
        case 'wire':
        case 'port':
        case 'modport':// same as ports
        case 'logic': return SymbolKind.Boolean;
        case 'string': return SymbolKind.String;
        case 'class': return SymbolKind.Class;
        case 'task':
        case 'prototype':
        case 'function': return SymbolKind.Function;
        case 'interface': return SymbolKind.Interface;
        case 'event': return SymbolKind.Event;
        case 'struct': return SymbolKind.Struct;
        case 'module':
        case 'block':
        case 'program': return SymbolKind.Module;
        case 'enum': return SymbolKind.Enum;
        case 'property': return SymbolKind.Property;
        case 'typedef': return SymbolKind.TypeParameter;
        case 'net':
        case 'reg':
        default: return SymbolKind.Variable;
    }
    /* Unused/Free SymbolKind icons
        return SymbolKind.Number;
        return SymbolKind.EnumMember;
        return SymbolKind.Operator;
        return SymbolKind.Array; 
    */
}

// TODO: add a user setting to enable/disable all ctags based operations
export class Ctags {

    symbols: SymbolInformation[];
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

    getSymbolsList(): SymbolInformation[] {
        return this.symbols;
    }

    execCtags(filepath: string): Thenable<string> {
        console.log("executing ctags");

        let ctags: string = <string>workspace.getConfiguration().get('verilog.ctags.path');
        let command: string = '"' + ctags + '" -f - --fields=+K --sort=no --excmd=n "' + filepath + '"';
        console.log(command);
        return new Promise((resolve, reject) => {
            child.exec(command, (error: Error, stdout: string, stderr: string) => {
                resolve(stdout);
            })
        })
    }

    parseTagLine(line: string): SymbolInformation {
        try {
            let name: string, type: string, fs : string;
            let parts: string[] = line.split('\t');
            name = parts[0];
            fs = parts[1];
            type = parts[3];
            let lineNoStr = parts[2];
            let lineNo = Number(lineNoStr.slice(0, -2)) - 1;
            let startPosition = new Position(lineNo, 0);
            let endPosition = new Position(lineNo, Number.MAX_VALUE);
            return new SymbolInformation(
                name, getSymbolKind(type), type,
                new Location(Uri.file(fs), new Range(startPosition, endPosition))
            );
        } catch (e) { console.log(e) }
    }

    buildSymbolsList(tags: string): Thenable<SymbolInformation[]> {
        try {
            console.log("building symbols");
            if (tags === '') {
                console.log("No output from ctags");
                return;
            }
            // Parse ctags output
            let lines: string[] = tags.split(/\r?\n/);
            lines.forEach(line => {
                if (line !== '')
                    this.symbols.push(this.parseTagLine(line));
            });

            /* // end tags are not supported yet in ctags. So, using regex
            let match;
            let endPosition: Position;
            let text = this.doc.getText();
            let eRegex: RegExp = /^(?![\r\n])\s*end(\w*)*[\s:]?/gm;
            while (match = eRegex.exec(text)) {
                if (match && typeof match[1] !== 'undefined') {
                    endPosition = this.doc.positionAt(match.index + match[0].length - 1);
                    // get the starting symbols of the same type
                    // doesn't check for begin...end blocks
                    let s = this.symbols.filter(i => i.containerName === match[1] && i.location.range.start.isBefore(endPosition));
                    if (s.length > 0) {
                        // get the symbol nearest to the end tag
                        let max: SymbolInformation = s[0];
                        for (let i = 0; i < s.length; i++) {
                            max = s[i].location.range.start.isAfter(max.location.range.start) ? s[i] : max;
                        }
                        for (let i = 0; i < this.symbols.length; i++) {
                            if (this.symbols[i].name === max.name && this.symbols[i].location.range.start.isEqual(max.location.range.start) && this.symbols[i].containerName === max.containerName) {
                                this.symbols[i] = new SymbolInformation(this.symbols[i].name,
                                    this.symbols[i].kind, this.symbols[i].containerName,
                                    new Location(this.doc.uri, new Range(
                                        this.symbols[i].location.range.start,
                                        new Position(endPosition.line, this.symbols[i].name.length)
                                    )));
                                break;
                            }
                        }
                    }
                }
            } */
            console.log({ "symbols in ctags": this.symbols });
            this.isDirty = false;
            return Promise.resolve(this.symbols)
        } catch (e) { console.log(e) }
    }

    index(): Thenable<SymbolInformation[]> {
        console.log("indexing...");
        return new Promise((resolve, reject) => {
            this.execCtags(this.doc.uri.fsPath)
                .then(output => this.buildSymbolsList(output))
                .then(symbols => resolve(symbols))
        })
    }

}