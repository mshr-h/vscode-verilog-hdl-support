import { CompletionItemProvider, CompletionItem, TextDocument, Position, CancellationToken, CompletionContext, ProviderResult, CompletionItemKind, CompletionTriggerKind, Range, MarkdownString, SymbolKind } from "vscode";

import VerilogWorkspaceSymbolProvider from "./WorkspaceSymbolProvider";
import VerilogDocumentSymbolProvider from "./DocumentSymbolProvider";
export default class VerilogCompletionItemProvider implements CompletionItemProvider {

    private workspaceSymProvider: VerilogWorkspaceSymbolProvider;
    private docSymProvider: VerilogDocumentSymbolProvider;


    constructor(workspaceSymProvider: VerilogWorkspaceSymbolProvider, docSymProvider: VerilogDocumentSymbolProvider) {
        this.workspaceSymProvider = workspaceSymProvider;
        this.docSymProvider = docSymProvider;
    };

    //TODO: Better context based completion items
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken,
        context: CompletionContext): ProviderResult<CompletionItem[]> {
        return new Promise((resolve, reject) => {
            let items: CompletionItem[] = [];

            if (!this.docSymProvider.docSymbols) { // systemverilog keywords
                return;
            }
            else {
                this.docSymProvider.docSymbols.forEach(symbol => {
                    let newItem: CompletionItem = new CompletionItem(symbol.name, this.getCompletionItemKind(symbol.kind));
                    let codeRange = symbol.location.range;
                    let code = document.getText(codeRange).trim();
                    //newItem.detail = symbol.detail;
                    let doc: string = "```systemverilog\n" + code + "\n```";
                    /* if(symbol.parentScope !== undefined && symbol.parentScope !== "")
                        doc += "\nHeirarchial Scope: " + symbol.parentScope; */
                    newItem.documentation = new MarkdownString(doc);
                    items.push(newItem);
                });
            }
            resolve(items);
        })
    }

    private getCompletionItemKind(type: SymbolKind): CompletionItemKind {
        switch (type) {
            case SymbolKind.Constant: return CompletionItemKind.Constant;
            case SymbolKind.Event: return CompletionItemKind.Event;
            case SymbolKind.Function: return CompletionItemKind.Function;
            case SymbolKind.Module: return CompletionItemKind.Module;
            case SymbolKind.Variable: return CompletionItemKind.Variable;
            case SymbolKind.Class: return CompletionItemKind.Class;
            case SymbolKind.Enum : return CompletionItemKind.Enum;
            case SymbolKind.Interface : return CompletionItemKind.Interface;
            case SymbolKind.Property: return CompletionItemKind.Property;
            case SymbolKind.Struct: return CompletionItemKind.Struct;
            case SymbolKind.TypeParameter: return CompletionItemKind.TypeParameter;
            default: return CompletionItemKind.Variable;
        }
    }

}