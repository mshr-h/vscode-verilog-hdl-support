import { DocumentSymbolProvider, SymbolInformation, CancellationToken, TextDocument, Location, Position, SymbolKind, Range, TreeDataProvider, TreeItem, Event, EventEmitter, TreeItemCollapsibleState, DocumentSymbol, workspace, window, TextEdit, TextEditor, } from 'vscode'
import { Ctags, isContainer } from '../ctags';

export default class VerilogDocumentSymbolProvider implements DocumentSymbolProvider {
    public docSymbols: SymbolInformation[] = [];
    private ctags: Ctags;

    constructor(ctags: Ctags) {
        this.ctags = ctags;
    }

    provideDocumentSymbols(document: TextDocument, token?: CancellationToken, isWorkplace?: boolean): Thenable<SymbolInformation[]> {
        if (isWorkplace == undefined) isWorkplace = false;
        return new Promise((resolve, reject) => {
            //let symbols : SymbolInformation[] = [];
            var match;
            console.log("symbol provider");
            let targetText = document.getText();
            this.ctags.setDocument(document);
            if (this.ctags.isDirty) {
                this.ctags.index()
                    .then((symbols) => {
                        this.docSymbols = symbols.filter(
                            sym => (!isWorkplace ||
                                (isWorkplace && isContainer(sym.containerName)))
                        );
                        resolve(this.docSymbols);
                    })
            }
        })
    }
}
