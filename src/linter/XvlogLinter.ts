import {
    workspace,
    Disposable,
    Range,
    TextDocument,
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticCollection,
} from 'vscode';
import { ChildProcess, exec } from 'child_process';
import BaseLinter from './BaseLinter';
import { Logger, LogSeverity } from '../logger';

export default class XvlogLinter extends BaseLinter {
    private xvlogPath: string;
    private xvlogArgs: string;

    constructor(diagnosticCollection: DiagnosticCollection, logger: Logger) {
        super('xvlog', diagnosticCollection, logger);
        workspace.onDidChangeConfiguration(() => {
            this.getConfig();
        });
        this.getConfig();
    }

    private getConfig() {
        this.xvlogPath = <string>(
            workspace.getConfiguration().get('verilog.linting.path')
        );
        this.xvlogArgs = <string>(
            workspace.getConfiguration().get('verilog.linting.xvlog.arguments')
        );
    }

    protected lint(doc: TextDocument) {
        this.logger.log('xvlog lint requested');
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
        this.logger.log(command, LogSeverity.command);

        let process: ChildProcess = exec(
            command,
            (_error: Error, stdout: string, _stderr: string) => {
                let diagnostics: Diagnostic[] = [];

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
                            ? DiagnosticSeverity.Error
                            : DiagnosticSeverity.Warning;

                    // Get filename and line number
                    let filename = match[4];
                    let linenoStr = match[5];
                    let lineno = parseInt(linenoStr) - 1;

                    // if (filename != doc.fileName) // Check that filename matches
                    //     return;

                    let diagnostic: Diagnostic = {
                        severity: severity,
                        code: match[2],
                        message: '[' + match[2] + '] ' + match[3],
                        range: new Range(lineno, 0, lineno, Number.MAX_VALUE),
                        source: 'xvlog',
                    };

                    diagnostics.push(diagnostic);
                });
                this.logger.log(
                    diagnostics.length + ' errors/warnings returned'
                );
                this.diagnosticCollection.set(doc.uri, diagnostics);
            }
        );
    }
}
