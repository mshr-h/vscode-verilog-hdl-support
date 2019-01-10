import {Disposable, Range, TextDocument, Diagnostic, DiagnosticSeverity, DiagnosticCollection} from "vscode";
import {ChildProcess, exec} from 'child_process';
import BaseLinter from "./BaseLinter";


export default class XvlogLinter extends BaseLinter {
    private iverilogArgs: string;

    constructor() {
        super("xvlog");
    }

    protected lint(doc: TextDocument) {
        let svArgs : string = (doc.languageId == "systemverilog") ? "-sv" : "";         //Systemverilog args
        let command = "xvlog " + svArgs + " -nolog " + doc.fileName;

        let process: ChildProcess = exec(command, (error: Error, stdout: string, stderr: string) => {
            let diagnostics: Diagnostic[] = [];

            let lines = stdout.split(/\r?\n/g);
            lines.forEach((line) => {

                let tokens = line.split(/:?\s*(?:\[|\])\s*/).filter(Boolean);
                if (tokens.length < 4
                    || tokens[0] != "ERROR"
                    || !tokens[1].startsWith("VRFC")) {
                    return;
                }

                // Get filename and line number
                let [filename, lineno_str] = tokens[3].split(/:(\d+)/);
                let lineno = parseInt(lineno_str) - 1;

                // if (filename != doc.fileName) // Check that filename matches
                //     return;

                let diagnostic: Diagnostic = {
                    severity: DiagnosticSeverity.Error,
                    code: tokens[1],
                    message: "[" + tokens[1] + "] " + tokens[2],
                    range: new Range(lineno, 0, lineno, Number.MAX_VALUE),
                    source: "xvlog",
                }

                diagnostics.push(diagnostic);
            })
            this.diagnostic_collection.set(doc.uri, diagnostics)
        })
    }
}
