import {DocumentSymbolProvider, SymbolInformation, CancellationToken, TextDocument, Location, Position, SymbolKind, Range,
    Event, EventEmitter, window, ProviderResult, DocumentSymbol, workspace} from 'vscode'
import * as child from 'child_process';
var isWindows = process.platform === "win32";

export function getSymbolKind(name: String): SymbolKind {
    switch (name) {
        case 'parameter':
        case 'localparam': return SymbolKind.Constant;
        case 'package':
        case 'import': return SymbolKind.Package;
        case 'wire':
        case 'reg':
        case 'logic': return SymbolKind.Boolean;
        case 'int':
        case 'integer':
        case 'longint':
        case 'shortint': return SymbolKind.Number;
        case 'string': return SymbolKind.String;
        case 'class': return SymbolKind.Class;
        case 'task': return SymbolKind.Method;
        case 'function': return SymbolKind.Function;
        case 'interface': return SymbolKind.Interface;
        case 'event': return SymbolKind.Event;
        case 'struct': return SymbolKind.Struct;
        case 'enum': return SymbolKind.Enum;
        case 'module':
        case 'program': return SymbolKind.Module;
        default: return SymbolKind.Variable;
    }
    /* Not used! / Free SymbolKind icons
        return SymbolKind.EnumMember;
        return SymbolKind.Operator;
        return SymbolKind.TypeParameter;
        return SymbolKind.Property;
        return SymbolKind.Array;
    */
}

// Store the starting index of each line
let symbolsList : Symbol [] = [];

// Internal representation of a symbol
class Symbol {
    name: string;
    type: string;
    startPosition: Position;
    endPosition: Position;
    parentScope: string;
    parentType: string;
    isContainer: boolean;
    isValid: boolean;
    constructor(name: string, type: string, startPosition: Position, parentScope: string, parentType: string, endPosition: Position, isValid: boolean) {
        this.name = name;
        this.type = type;
        this.startPosition = startPosition;
        this.parentScope = parentScope;
        this.parentType = parentType;
        this.isValid = isValid;
        this.endPosition = endPosition;
    }

    setEndPosition(endPosition: Position) {
        this.endPosition = endPosition;
        this.isValid = true;
    }

    getDocumentSymbol() : DocumentSymbol {
        let range = new Range(this.startPosition, this.endPosition);
        let selectionRange = new Range(this.startPosition, new Position(this.endPosition.line, this.endPosition.character - 1));
        return new DocumentSymbol(this.name, this.type, getSymbolKind(this.type), range, selectionRange);
    }
}

// find the appropriate container RECURSIVELY and add to its childrem
// return true: if done
// return false: if container not found
function findContainer(con:DocumentSymbol, sym: DocumentSymbol) : boolean {
    let res:boolean = false;
    for(let i of con.children) {
        if(i.range.contains(sym.range)) {
            res = findContainer(i, sym);
            if(res) return true;
        }
    }
    if(!res) {
        con.children.push(sym);
        return true;
    }
}

/*
// Build heiarchial DocumentSymbol[] from linear symbolsList[]
function buildDocumentSymbolList() : DocumentSymbol[] {
    let list : DocumentSymbol [] = [];
    symbolsList = symbolsList.sort((a,b) : number => {
        if(a.startLine < b.startLine) return -1;
        if(a.startLine > b.startLine) return 1;
        return 0;
    })
    // Add each of the symbols in order
    for(let i of symbolsList) {
        let sym: DocumentSymbol = i.getDocumentSymbol();
        // if no top level elements present
        if(list.length === 0) {
            list.push(sym);
            continue;
        }
        else {
            // find a parent among the top level element
            let done : boolean;
            for(let j of list) {
                if(j.range.contains(sym.range)) {
                    findContainer(j, sym);
                    done = true;
                    break;
                }
            }
            // add a new top level element
            if(!done)
                list.push(sym);
        }
    }

    return list;
}*/

export class VerilogDocumentSymbolProvider implements DocumentSymbolProvider {

    // end tags
    public eRegex: RegExp = /^(?![\r\n])\s*end(\w*)*[\s:]?/gm;

    provideDocumentSymbols(document: TextDocument, token: CancellationToken): Thenable<DocumentSymbol[]> {
        return new Promise((resolve, reject) => {
            // if(document.isDirty)
            //     return;
            let symbols: Symbol [] = [];
            let ctags: string = <string>workspace.getConfiguration().get('verilog.ctags.path');
            let command: string = ctags + ' -f - --fields=+nK --sort=no "' + document.uri.fsPath + '"';
            console.log(command);
            var cmd: child.ChildProcess = child.exec(command, (error:Error, stdout:string, stderr:string) => {
                // console.log(stdout);
                if(stdout == '')
                return;
                let lines: string [] = stdout.split('\r\n');
                lines.forEach(line => {
                    if(line == '')
                        return;
                    let name, type, lineNoStr, parentScope, parentType : string;
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
                    lineNo = <number>((lineNoStr.split(':'))[1]);
                    symbols.push(new Symbol(name, type, new Position(lineNo, 0), parentScope, parentType, new Position(lineNo, Number.MAX_VALUE), true));
                });

/*                let match;
                let endPosition;
                let text = document.getText();
                // end tags
                while(match = this.eRegex.exec(text)) {
                    if(match) {
                        endPosition = document.positionAt(match.index + match[0].length - 1);
                        // get the starting symbols of the same type
                        if(typeof match[1] !== 'undefined') {
                            let s = symbols.filter(i => i.type === match[1] && i.startPosition.isBeforeOrEqual(endPosition) && !i.isValid);
                            // get the symbol nearest to the end tag
                            let max : Symbol = s[0];
                            for(let i = 0; i < s.length; i++) {
                                max = s[i].startPosition.isAfter(max.startPosition) ? s[i] : max;
                            }
                            for(let i of symbols) {
                                if(i.name === max.name && i.startPosition.isEqual(max.startPosition) && i.type === max.type) {
                                    // i.setEndPosition(new Position(endPosition.line, Number.MAX_VALUE));
                                    i.setEndPosition(endPosition);
                                    break;
                                }
                            }
                        }
                    }
                }
*/                console.log(symbols);
                try {
                let docSym : DocumentSymbol [] = [];
                symbols.forEach(sym => {
                    docSym.push(sym.getDocumentSymbol());
                });

                console.log(docSym);
                resolve(docSym);
                }
                catch(e) {console.log(e);}
            })
        })
    }

}