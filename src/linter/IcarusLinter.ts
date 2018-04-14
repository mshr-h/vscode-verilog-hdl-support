import {workspace, window, Disposable, Range, TextDocument, Diagnostic, DiagnosticSeverity, DiagnosticCollection, languages} from "vscode";
import * as child from 'child_process';
import BaseLinter from "./BaseLinter";


export default class IcarusLinter extends BaseLinter {
    private iverilogArgs: string;

    constructor() {
        super("iverilog");

        workspace.onDidChangeConfiguration(() => {
            this.getArgs();
        })
        this.getArgs();
    }

    private getArgs() {
        this.iverilogArgs = <string>workspace.getConfiguration().get('verilog.linting.iverilog.arguments');
    }

    protected lint(doc: TextDocument) {
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
                    let lineNum = parseInt(terms[1].trim()) - 1;
                    if(terms.length == 3)
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range:new Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                            message: terms[2].trim(),
                            code: 'iverilog',
                            source: 'iverilog'
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
                            code: 'iverilog',
                            source: 'iverilog'
                        });
                    }
                }
            })
            this.diagnostic_collection.set(doc.uri, diagnostics)
        })
    }
}
