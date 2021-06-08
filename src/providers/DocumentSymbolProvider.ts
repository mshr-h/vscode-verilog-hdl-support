import { resolve } from 'url';
import { DocumentSymbolProvider, CancellationToken, TextDocument, SymbolKind, DocumentSymbol, window, ProviderResult, SymbolInformation } from 'vscode'
import { BsvInfoProviderManger } from '../BsvProvider';
import { Ctags, CtagsManager, Symbol } from '../ctags';
import { Logger, Log_Severity } from '../Logger';


export class VerilogDocumentSymbolProvider implements DocumentSymbolProvider {

    public docSymbols: DocumentSymbol[] = [];

    private logger: Logger;
    constructor(logger: Logger) {
        this.logger = logger
    }

    async provideDocumentSymbols(document: TextDocument, token: CancellationToken): Promise<DocumentSymbol[]> {
        this.logger.log("Symbols Requested: " + document.uri)
        console.log("symbol provider");
        let symbols: Symbol[] = await CtagsManager.getSymbols(document);
        console.log(symbols);
        this.docSymbols = this.buildDocumentSymbolList(symbols);
        this.logger.log(this.docSymbols.length + " top-level symbols returned", (this.docSymbols.length > 0) ? Log_Severity.Info : Log_Severity.Warn)
        return this.docSymbols;
    }

    isContainer(type: SymbolKind): boolean {
        switch (type) {
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
    findContainer(con: DocumentSymbol, sym: DocumentSymbol): boolean {
        let res: boolean = false;
        for (let i of con.children) {
            if (this.isContainer(i.kind) && i.range.contains(sym.range)) {
                res = this.findContainer(i, sym);
                if (res) return true;
            }
        }
        if (!res) {
            con.children.push(sym);
            return true;
        }
    }

    // Build heiarchial DocumentSymbol[] from linear symbolsList[] using start and end position
    // TODO: Use parentscope/parenttype of symbol to construct heirarchial DocumentSymbol []
    buildDocumentSymbolList(symbolsList: Symbol[]): DocumentSymbol[] {
        let list: DocumentSymbol[] = [];
        symbolsList = symbolsList.sort((a, b): number => {
            if (a.startPosition.isBefore(b.startPosition)) return -1;
            if (a.startPosition.isAfter(b.startPosition)) return 1;
            return 0;
        })
        // Add each of the symbols in order
        for (let i of symbolsList) {
            let sym: DocumentSymbol = i.getDocumentSymbol();
            // if no top level elements present
            if (list.length === 0) {
                list.push(sym);
                continue;
            }
            else {
                // find a parent among the top level element
                let done: boolean;
                for (let j of list) {
                    if (this.isContainer(j.kind) && j.range.contains(sym.range)) {
                        this.findContainer(j, sym);
                        done = true;
                        break;
                    }
                }
                // add a new top level element
                if (!done)
                    list.push(sym);
            }
        }

        return list;
    }

}


export class BsvDocumentSymbolProvider implements DocumentSymbolProvider {
    private logger: Logger;
    constructor(logger: Logger) {
        this.logger = logger
    }

    provideDocumentSymbols(document: TextDocument, token: CancellationToken): ProviderResult<DocumentSymbol[] | SymbolInformation[]> {
        // return new Promise((resolve)=>{
        //     const provider = BsvInfoProviderManger.getInstance().getProvider();
        //     var info = provider.getSymbol(document);
    
        //     resolve(info);
        // })
        const provider = BsvInfoProviderManger.getInstance().getProvider();
        var info = provider.getSymbol(document);

        return info;
    }

}