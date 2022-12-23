import * as vscode from 'vscode';
import { ChildProcess, exec } from 'child_process';
import BaseLinter from './BaseLinter';

export default class XvlogLinter extends BaseLinter {
    private xvlogPath: string;
    private xvlogArgs: string;

    constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: vscode.LogOutputChannel) {
        super('xvlog', diagnosticCollection, logger);
        vscode.workspace.onDidChangeConfiguration(() => {
            this.getConfig();
        });
        this.getConfig();
    }

    private getConfig() {
        this.xvlogPath = <string>(
            vscode.workspace.getConfiguration().get('verilog.linting.path')
        );
        this.xvlogArgs = <string>(
            vscode.workspace.getConfiguration().get('verilog.linting.xvlog.arguments')
        );
    }

    protected lint(doc: vscode.TextDocument) {
        this.logger.info('xvlog lint requested');
        let svArgs: string = doc.languageId == 'systemverilog' ? '-sv' : ''; //Systemverilog args
        let command =
            this.xvlogPath +
            'xvlog ' +
            svArgs +
            ' -nolog ' +
            this.xvlogArgs +
            ' "' +
            doc.fileName +
            '"';
        this.logger.info("Execute command: " + command);

        let process: ChildProcess = exec(
            command,
            (_error: Error, stdout: string, _stderr: string) => {
                let diagnostics: vscode.Diagnostic[] = [];

                let lines = stdout.split(/\r?\n/g);
                lines.forEach((line) => {
                    let match = line.match(
                        /^(ERROR|WARNING):\s+\[(VRFC\b[^\]]*)\]\s+(.*\S)\s+\[(.*):(\d+)\]\s*$/
                    );
                    if (!match) {
                        return;
                    }

                    let severity =
                        match[1] === 'ERROR'
                            ? vscode.DiagnosticSeverity.Error
                            : vscode.DiagnosticSeverity.Warning;

                    // Get filename and line number
                    let filename = match[4];
                    let linenoStr = match[5];
                    let lineno = parseInt(linenoStr) - 1;

                    // if (filename != doc.fileName) // Check that filename matches
                    //     return;

                    let diagnostic: vscode.Diagnostic = {
                        severity: severity,
                        code: match[2],
                        message: '[' + match[2] + '] ' + match[3],
                        range: new vscode.Range(lineno, 0, lineno, Number.MAX_VALUE),
                        source: 'xvlog',
                    };

                    diagnostics.push(diagnostic);
                });
                this.logger.info(diagnostics.length + ' errors/warnings returned');
                this.diagnosticCollection.set(doc.uri, diagnostics);
            }
        );
    }
}
