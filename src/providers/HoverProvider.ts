// import * as vscode from 'vscode';
import { HoverProvider, TextDocument, Position, CancellationToken, Hover, ProviderResult, Range, SymbolInformation, workspace } from 'vscode';
import { basename } from 'path';
import VerilogWorkspaceSymbolProvider from './WorkspaceSymbolProvider';
import VerilogDocumentSymbolProvider from './DocumentSymbolProvider';

export default class VerilogHoverProvider implements HoverProvider {
    private workspaceSymProvider: VerilogWorkspaceSymbolProvider;
    private docSymProvider: VerilogDocumentSymbolProvider;
    // lang: verilog / systemverilog
    private lang: string;

    constructor(workspaceSymProvider: VerilogWorkspaceSymbolProvider, docSymProvider: VerilogDocumentSymbolProvider, lang: string) {
        this.lang = lang;
        this.workspaceSymProvider = workspaceSymProvider;
        this.docSymProvider = docSymProvider;
    }

    public provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        // get word start and end
        let textRange = document.getWordRangeAtPosition(position);
        if (!textRange)
            return;
        // hover word
        let targetText = document.getText(textRange);
        return new Promise((resolve, reject) => {
            let textRange = document.getWordRangeAtPosition(position);
            if (!textRange)
                return resolve(undefined);

            // hover word
            let targetText = document.getText(textRange);

            // First, lookup in the current document
            return this.docSymProvider.provideDocumentSymbols(document).then(docSyms => {
                docSyms.forEach(docSym => {
                    if (docSym.name == targetText) {
                        return resolve(this.buildHover(document, docSym, textRange));
                    }
                });

                // Then, lookup in the workspace if current document failed
                return this.workspaceSymProvider.provideWorkspaceSymbols(targetText, token, true).then((sym) => {
                    if (sym.length !== 0) {
                        resolve(this.buildHover(document, sym[0], textRange));
                    }
                    else
                        resolve(undefined);
                });
            });

        });
    }
    public buildHover(document: TextDocument, symbol: SymbolInformation, range?: Range):ProviderResult<Hover> {
        // Open document containing the symbol
        if (symbol.location.uri === document.uri) {
            // Same document, don't provide a path
            return this.hoverSymbol(document.lineAt(symbol.location.range.start).text);
        } else {
            return workspace.openTextDocument(symbol.location.uri).then(symbol_doc => {
                return this.hoverSymbol(
                    symbol_doc.lineAt(symbol.location.range.start).text,
                    basename(symbol_doc.uri.path)
                );
            });
        }
    
        
    }

    public hoverSymbol(line: string, fileName?: string) {
        // Return the line where the symbol is declared, highlighted as SV
        return new Hover([
            {
                language: this.lang,
                value: line
            },
            fileName
        ]);
    }
}


