import {DefinitionProvider, TextDocument, CancellationToken,Location, workspace, SymbolInformation, Position, ProviderResult, Definition, Range} from 'vscode';
import VerilogWorkspaceSymbolProvider from './WorkspaceSymbolProvider';
import VerilogDocumentSymbolProvider from './DocumentSymbolProvider';

export default class VerilogDefinitionProvider implements DefinitionProvider {

    private workspaceSymProvider : VerilogWorkspaceSymbolProvider;
    private docSymProvider       : VerilogDocumentSymbolProvider;
    
    // Strings used in regex'es
    // private regex_module = '$\\s*word\\s*(';
    private regex_port = '\\.word\\s*\\(';
    
    constructor(workspaceSymProvider: VerilogWorkspaceSymbolProvider, docSymProvider : VerilogDocumentSymbolProvider) {
        this.workspaceSymProvider = workspaceSymProvider;
        this.docSymProvider = docSymProvider;
    };

    provideDefinition(document: TextDocument, position: Position, token: CancellationToken) : Promise<Definition> {
        return new Promise( async (resolve, reject) => {
            // get word start and end
            let textRange = document.getWordRangeAtPosition(position);
            if(!textRange)
                reject();
    
            // hover word
            let targetText = document.getText(textRange);
            let targetLine = document.lineAt(position.line).text;

            // Check for port
            if (targetLine.match(this.regex_port.replace('word', targetText))) {
                let container = moduleFromPort(document, textRange)

                resolve(Promise.resolve(this.workspaceSymProvider.provideWorkspaceSymbols(container, token, true).then( res => {
                    return Promise.all( res.map(x => findPortLocation(x, targetText)));
                }).then( arrWithUndefined => {
                    return clean(arrWithUndefined, undefined)
                })));
            }

            else {
                // Lookup all symbols in the current document
                await this.docSymProvider.provideDocumentSymbols(document).then(symbols => {
                    symbols.forEach(x => {
                        if(x.name === targetText) {
                            resolve(x.location);
                        }
                    });
                });

                await this.workspaceSymProvider.provideWorkspaceSymbols(targetText, token, true).then( res => {
                    if (res.length == 0) {
                        reject();
                    }
                    resolve(res.map( x => x.location ));
                });
            }

        })
    }

}


export function moduleFromPort(document, range): string {
    let text = document.getText(new Range(new Position(0,0), range.end))
    let depthParathesis = 0;
    let i = 0;

    for (i = text.length; i>0; i--) {
        if (text[i] == ')')
            depthParathesis++;
        else if (text[i] == '(')
            depthParathesis--;
        
        if (depthParathesis == -1) {
            let match_param = text.slice(0, i).match(/(\w+)\s*#\s*$/);
            let match_simple = text.slice(0, i).match(/(\w+)\s+(\w+)\s*$/);
            if (match_param)
                return match_param[1]
            else if (match_simple)
                return match_simple[1]
        }
    }
}


function findPortLocation(symbol: SymbolInformation, port:string): Thenable<Location> {
    return workspace.openTextDocument(symbol.location.uri).then( doc => {

        for (let i = symbol.location.range.start.line; i<doc.lineCount; i++) {
            let line = doc.lineAt(i).text;
            if (line.match("\\bword\\b".replace('word', port))) {
                return new Location(symbol.location.uri, new Position(i, line.indexOf(port)));
            }
        }
    });
}

function clean(arr: Array<any>, deleteValue): Array<any> {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == deleteValue) {
        arr.splice(i, 1);
        i--;
      }
    }
    return arr;
}
