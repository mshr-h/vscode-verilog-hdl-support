import {workspace, window, Disposable, Range, TextDocument, Diagnostic, DiagnosticSeverity, DiagnosticCollection, languages} from "vscode";
import * as child from 'child_process';
import BaseLinter from "./BaseLinter";

//var isWindows = process.platform === "win32";

export default class ModelsimLinter extends BaseLinter {
    private modelsimArgs: string;

    constructor() {
        super("modelsim");
        workspace.onDidChangeConfiguration(() => {
            this.getConfig();
        })
        this.getConfig();
    }

    private getConfig() {
        //get custom arguments
        this.modelsimArgs = <string>workspace.getConfiguration().get('verilog.linting.modelsim.arguments');
    }

    protected lint(doc: TextDocument) {
        // no change needed for systemverilog
        let command: string = 'vlog -nologo -work work \"' + doc.fileName +'\" ' + this.modelsimArgs;     //command to execute
        var process: child.ChildProcess = child.exec(command, {cwd:workspace.rootPath}, (error:Error, stdout: string, stderr: string) => {
            let diagnostics: Diagnostic[] = [];
            let lines = stdout.split(/\r?\n/g);

            // ^\*\* (((Error)|(Warning))( \(suppressible\))?: )(\([a-z]+-[0-9]+\) )?([^\(]*\(([0-9]+)\): )(\([a-z]+-[0-9]+\) )?((((near|Unknown identifier|Undefined variable):? )?["']([\w:;\.]+)["'][ :.]*)?.*)
            // From https://github.com/dave2pi/SublimeLinter-contrib-vlog/blob/master/linter.py
            let regexExp = "^\\*\\* (((Error)|(Warning))( \\(suppressible\\))?: )(\\([a-z]+-[0-9]+\\) )?([^\\(]*)\\(([0-9]+)\\): (\\([a-z]+-[0-9]+\\) )?((((near|Unknown identifier|Undefined variable):? )?[\"\']([\\w:;\\.]+)[\"\'][ :.]*)?.*)";
            // Parse output lines
            lines.forEach((line, i) => {
                let sev: DiagnosticSeverity;
                if(line.startsWith('**')) {
                    let m = line.match(regexExp);
                    try {
                        if( m[7] != doc.fileName)
                            return;
                        switch (m[2]) {
                            case "Error":
                                sev = DiagnosticSeverity.Error;
                                break;
                            case "Warning":
                                sev = DiagnosticSeverity.Warning;
                                break;
                            default:
                                sev = DiagnosticSeverity.Information;
                                break;
                        }
                        let lineNum = parseInt(m[8]) - 1;
                        let msg = m[10];
                        diagnostics.push({
                            severity: sev,
                            range:new Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                            message: msg,
                            code: 'modelsim',
                            source: 'modelsim'
                        });
                    }
                    catch (e) {
                        diagnostics.push({
                            severity: sev,
                            range:new Range(0, 0, 0, Number.MAX_VALUE),
                            message: line,
                            code: 'modelsim',
                            source: 'modelsim'
                        });
                    }
                }
            })
            this.diagnostic_collection.set(doc.uri, diagnostics);
        })
    }
}
