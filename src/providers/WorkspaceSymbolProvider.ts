import {
    SymbolInformation,
    WorkspaceSymbolProvider,
    CancellationToken,
    workspace,
    window,
    ProgressLocation,
    GlobPattern
} from 'vscode';
import VerilogDocumentSymbolProvider from './DocumentSymbolProvider';
import { isContainer, Ctags } from "../ctags";

export default class VerilogWorkspaceSymbolProvider implements WorkspaceSymbolProvider {

    public moduleSymbols: Array<SymbolInformation>;
    public building: Boolean = false;
    public docProvider: VerilogDocumentSymbolProvider;
    public ctags: Ctags;

    public NUM_FILES: number = 250;
    public parallelProcessing: number = 50;
    public exclude: GlobPattern = undefined;

    constructor(docProvider: VerilogDocumentSymbolProvider, ctags: Ctags,
        disabled?: Boolean, exclude?: GlobPattern, parallelProcessing?: number) {
        this.docProvider = docProvider;
        this.ctags = ctags;
        if (disabled) {
        } else {
            if (exclude != "insert globPattern here") {
                this.exclude = exclude;
            }
            if (parallelProcessing) {
                this.parallelProcessing = parallelProcessing;
            }
            this.build_index();
        }
    };

    public dispose() {
        delete this.moduleSymbols
    }

    /** 
        Queries a symbol from this.symbols, performs an exact match if exactMatch is set to true,
        and a partial match if it's not passed or set to false.

        @param query the symbol's name
        @param token the CancellationToken
        @param exactMatch whether to perform an exact or a partial match
        @return an array of matching SymbolInformation 
    */
    public provideWorkspaceSymbols(query: string, token: CancellationToken, exactMatch?: Boolean): Thenable<SymbolInformation[]> {
        console.log({
            "symbols_workspace": this.moduleSymbols,
        });
        return new Promise((resolve, reject) => {
            if (query.length === 0) { // Show maximum 250 files for speedup
                resolve(this.moduleSymbols.slice(0, 250))
            } else {
                const pattern = new RegExp(".*" + query.replace(" ", "").split("").map((c) => c).join(".*") + ".*", 'i');
                let results: SymbolInformation[] = [];

                for (let i = 0; i < this.moduleSymbols.length; i++) {
                    let s = this.moduleSymbols[i];
                    if (exactMatch === true) {
                        if (s.name == query) {
                            results.push(s);
                        }
                    } else if (s.name.match(pattern)) {
                        results.push(s)
                    }
                }
                resolve(results);
            }
        });
    }

    /**  
        Stores the module's container to this.moduleContainers.

        @param symbolInfo the SymbolInformation object
    */
    /* public storeModuleContainer(symbolInfo: SymbolInformation): void {
        let uri = symbolInfo.location.uri;
        let range = symbolInfo.location.range;
        try {
            workspace.openTextDocument(uri).then(doc => {
                let container = doc.getText(range);
                this.moduleContainers.set(symbolInfo.name, container);
            });
        } catch (error) {
            console.log(error);
            this.moduleContainers.set(symbolInfo.name, undefined);
        }
    } */

    /**  
        Scans the workspace for SystemVerilog and Verilog files for symbols,
        and saves the symbols as SymbolInformation objects to this.symbols.

        @return status message when indexing is successful or failed with an error.
    */
    public async build_index(): Promise<any> {
        var cancelled = false;
        this.building = true;

        return await window.withProgress({
            location: ProgressLocation.Notification,
            title: "Verilog-HDL Indexing...",
            cancellable: true
        }, async (progress, token) => {
            this.moduleSymbols = new Array<SymbolInformation>();
            let uris = await Promise.resolve(workspace.findFiles('**/*.{sv,v,svh,vh}', this.exclude, undefined, token));
            for (var filenr = 0; filenr < uris.length; filenr += this.parallelProcessing) {
                let subset = uris.slice(filenr, filenr + this.parallelProcessing)
                if (token.isCancellationRequested) {
                    cancelled = true;
                    break;
                }
                await Promise.all(subset.map(uri => {
                    return new Promise(async (resolve) => {
                        resolve(workspace.openTextDocument(uri).then(doc => {
                            return this.docProvider.provideDocumentSymbols(doc, token, true)
                        }))
                    }).catch(() => {
                        console.log("SystemVerilog: Indexing: Unable to process file: ", uri.toString());
                        return undefined
                    });
                })).then((symbols_arr: Array<SymbolInformation>[]) => {
                    for (let i = 0; i < symbols_arr.length; i++) {
                        if (symbols_arr[i] !== undefined) {
                            let symbolInfo = symbols_arr[i];
                            this.moduleSymbols = [...new Set([...this.moduleSymbols, ...symbolInfo])];

                            /* //if it's a module, store the container
                            if (symbolInfo && symbolInfo.containerName == "module") {
                                this.storeModuleContainer(symbolInfo);
                            } */
                        }
                    }
                });
            }
        }).then(() => {
            this.building = false;
            if (cancelled) {
                return "Verilog-HDL: Indexing cancelled";
            } else {
                return 'Verilog-HDL: ' + this.moduleSymbols.length + ' indexed objects'
            }
        });
    }
}