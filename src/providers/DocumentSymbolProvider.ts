import {DocumentSymbolProvider, CancellationToken, TextDocument, Position, SymbolKind, Range, DocumentSymbol, workspace, window, TextEdit, TextEditor} from 'vscode'
import { Ctags, CtagsManager, Symbol } from '../ctags';

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

export function isContainer(type: SymbolKind) : boolean {
    switch(type) {
        case SymbolKind.Array:
        case SymbolKind.Boolean:
        case SymbolKind.Constant:
        case SymbolKind.EnumMember:
        case SymbolKind.Event:
        case SymbolKind.Field:
        case SymbolKind.Key:
        case SymbolKind.Null:
        case SymbolKind.Number:
        case SymbolKind.Object:
        case SymbolKind.Property:
        case SymbolKind.String:
        case SymbolKind.TypeParameter:
        case SymbolKind.Variable:
            return false
        case SymbolKind.Class:
        case SymbolKind.Constructor:
        case SymbolKind.Enum:
        case SymbolKind.File:
        case SymbolKind.Function:
        case SymbolKind.Interface:
        case SymbolKind.Method:
        case SymbolKind.Module:
        case SymbolKind.Namespace:
        case SymbolKind.Package:
        case SymbolKind.Struct:
            return true
    }
}


// find the appropriate container RECURSIVELY and add to its childrem
// return true: if done
// return false: if container not found
function findContainer(con:DocumentSymbol, sym: DocumentSymbol) : boolean {
    let res:boolean = false;
    for(let i of con.children) {
        if(isContainer(i.kind) && i.range.contains(sym.range)) {
            res = findContainer(i, sym);
            if(res) return true;
        }
    }
    if(!res) {
        con.children.push(sym);
        return true;
    }
}

// TODO: Use parentscope/parenttype of symbol to construct heirarchial DocumentSymbol []
// Build heiarchial DocumentSymbol[] from linear symbolsList[]
function buildDocumentSymbolList(symbolsList : Symbol []) : DocumentSymbol[] {
    let list : DocumentSymbol [] = [];
    symbolsList = symbolsList.sort((a,b) : number => {
        if(a.startPosition.isBefore(b.startPosition)) return -1;
        if(a.startPosition.isAfter(b.startPosition)) return 1;
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
                if(isContainer(j.kind) && j.range.contains(sym.range)) {
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
}

export class VerilogDocumentSymbolProvider implements DocumentSymbolProvider {

    // end tags
    public eRegex: RegExp = /^(?![\r\n])\s*end(\w*)*[\s:]?/gm;
    public docSymbols : DocumentSymbol [] = [];

    provideDocumentSymbols(document: TextDocument, token: CancellationToken): Thenable<DocumentSymbol[]> {
        return new Promise((resolve, reject) => {
            let symbols: Symbol [] = [];
            console.log("symbol provider");
            let activeDoc : TextDocument = window.activeTextEditor.document;
            if(CtagsManager.ctags.doc === undefined || CtagsManager.ctags.doc.uri.fsPath !== activeDoc.uri.fsPath)
                CtagsManager.ctags.setDocument(activeDoc);
            let ctags : Ctags = CtagsManager.ctags;
            if(ctags.isDirty) {
                ctags.index()
                .then(() => {
                    symbols = ctags.symbols;
                    console.log(symbols);
                    this.docSymbols =  buildDocumentSymbolList(symbols);
                    resolve(this.docSymbols);
                })
            }
            else {
                    resolve(this.docSymbols);
            }
        })
    }
}