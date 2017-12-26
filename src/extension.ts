'use strict';

import {workspace, window, commands, Disposable, Range, ExtensionContext,
     TextDocument, Diagnostic, DiagnosticSeverity, DiagnosticCollection, languages} from 'vscode';
import * as child from 'child_process';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let diagnosticCollection: DiagnosticCollection;

export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "verilog" is now active!');

    let linter = new Linter();

    // context.subscriptions.push(disposable);
    diagnosticCollection = languages.createDiagnosticCollection();
    context.subscriptions.push(diagnosticCollection);
}

class Linter {

    private iverilogArgs: string;
    constructor(){
        let subscriptions: Disposable[] = [];
        workspace.onDidOpenTextDocument(this._runIVerilog, this, subscriptions);
        workspace.onDidCloseTextDocument( (textDocument)=> {
            diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
        workspace.onDidSaveTextDocument(this._runIVerilog, this, subscriptions);
        workspace.onDidChangeConfiguration(() => {
             this.iverilogArgs = <string>workspace.getConfiguration().get('verilog.iverilog.arguments');
        })
    }

    public _runIVerilog(doc: TextDocument) {
        if(doc.languageId=='verilog')
        {
            var foo: child.ChildProcess = child.exec('iverilog -t null' + this.iverilogArgs + ' ' + doc.fileName,{cwd:workspace.rootPath},(error:Error, stdout:string, stderr:string) => {
                let isWindows: boolean = false;
                if(doc.fileName[1] == ':'){
                    isWindows = true;
                }
                let diagnostics: Diagnostic[] = [];
                let lines = stderr.split(/\r?\n/g);
                lines.forEach((line, i) => {
                    if(line.startsWith(doc.fileName)){
                        line = line.replace(doc.fileName, '');
                        let terms = line.split(':');
                        console.log(terms[1] + ' ' + terms[2]);
                        let lineNum = parseInt(terms[1].trim());
                        if(terms.length == 3)
                            diagnostics.push({
                                severity: DiagnosticSeverity.Error,
                                range:new Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                                message: terms[2].trim(),
                                code: 'iverilog'
                            });
                        else if(terms.length == 4){
                            let sev: DiagnosticSeverity;
                            if(terms[2].trim() == 'error')
                                sev = DiagnosticSeverity.Error;
                            else if(terms[2].trim() == 'warning')
                                sev = DiagnosticSeverity.Warning
                            else
                                sev = DiagnosticSeverity.Information
                            diagnostics.push({
                                severity: sev,
                                range:new Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                                message: terms[3].trim(),
                                code: 'iverilog'
                            });
                        }
                    }
                })
                diagnosticCollection.set(doc.uri, diagnostics)
            })
        }
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}