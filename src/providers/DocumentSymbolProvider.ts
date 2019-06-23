import { DocumentSymbolProvider, SymbolInformation, CancellationToken, TextDocument, Location, Position, SymbolKind, Range, TreeDataProvider, TreeItem, Event, EventEmitter, TreeItemCollapsibleState, DocumentSymbol, workspace, window, TextEdit, TextEditor,  } from 'vscode'

export default class VerilogDocumentSymbolProvider implements DocumentSymbolProvider {
    // XXX: Does not match virtual interface instantiantion, eg virtual intf u_virtInterface;
    // XXX: Does not match input/output/inout ports, eg input logic din, ..
    private illegalTypes = /(?!return|begin|end|else|join|fork|for|if|virtual|static|automatic|generate)/
    // TODO: Match labels with SymbolKind.Enum
    public regex: RegExp = new RegExp([
        // Potential identifier
        , /(?<=^\s*(?:(?:virtual|static|automatic|rand|randc|pure virtual)\s+)?)/
        // Illegal Symbol types
        , this.illegalTypes
        // Symbol type
        , /([:\w]+)\s+/
        // (modifier? returnType [.*]?      | parameterlist)?
        , /(?:(?:\w*\s+)?\w+(?:\s*\[.*?\])?\s+|\s*#\s*\([\s\S]*?\)\s*)?/
        // Symbol name, ignore multiple defines FIXME
        , this.illegalTypes
        , /(\w+)(?:\s*,\s*\w+)*?/
        // Port-list | class suffix
        , /(?:\s*\([\s\S]*?\)|(?:\s+(?:extends|implements)\s+\w+)+)?/
        // End of definition
        , /\s*;/
    ].map(x => x.source).join(''), 'mg');


    public docSymbols: DocumentSymbol[] = [];

    provideDocumentSymbols(document: TextDocument, token?: CancellationToken, regex?: RegExp): Thenable<SymbolInformation[]> {
        return new Promise((resolve, reject) => {
            let symbols = [];
            var match;
            console.log("symbol provider");
            let targetText =  document.getText();

            if (regex == undefined) {
                regex = this.regex;
            }
            /* 
                Matches the regex and uses the index from the regex to find the position
            */
            do {
                match = regex.exec(targetText);
                if (match) {
                    let s = new SymbolInformation(
                        match[2],
                        getSymbolKind(match[1]),
                        match[1],
                        new Location(document.uri,
                            new Range(document.positionAt(match.index),
                                document.positionAt(match.index + match[0].length)
                            )))
                    symbols.push(s);
                }
            } while (match != null);

            resolve(symbols);
        })
    }
}

//See test/SymbolKind_icons.png for an overview of the icons
export function getSymbolKind(name: String): SymbolKind {
    switch (name) {
        case 'constant':
        case 'parameter':
        case 'localparam': return SymbolKind.Constant;
        case 'package':
        case 'import': return SymbolKind.Package;
        case 'wire':
        case 'port':
        case 'modport'  :// same as ports
        case 'logic': return SymbolKind.Boolean;
        case 'string': return SymbolKind.String;
        case 'class': return SymbolKind.Class;
        case 'task':
        case 'prototype':
        case 'function': return SymbolKind.Function;
        case 'interface': return SymbolKind.Interface;
        case 'event': return SymbolKind.Event;
        case 'struct': return SymbolKind.Struct;
        case 'module' :
        case 'block' :
        case 'program': return SymbolKind.Module;
        case 'enum' : return SymbolKind.Enum;
        case 'property' : return SymbolKind.Property;
        case 'typedef' : return SymbolKind.TypeParameter;
        case 'net' :
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