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
import { Logger, Log_Severity } from '../Logger';

export default class XvlogLinter extends BaseLinter {
    private xvlogArgs: string;

    constructor(diagnostic_collection: DiagnosticCollection, logger: Logger) {
        super('xvlog', diagnostic_collection, logger);
        workspace.onDidChangeConfiguration(() => {
            this.getConfig();
        });
        this.getConfig();
    }

    private getConfig() {
        this.xvlogArgs = <string>(
            workspace.getConfiguration().get('verilog.linting.xvlog.arguments')
        );
    }

    protected lint(doc: TextDocument) {
        this.logger.log('xvlog lint requested');
        let svArgs: string = doc.languageId == 'systemverilog' ? '-sv' : ''; //Systemverilog args
        let command =
            'xvlog ' +
            svArgs +
            ' -nolog ' +
            this.xvlogArgs +
            ' "' +
            doc.fileName +
            '"';
        this.logger.log(command, Log_Severity.Command);

        let process: ChildProcess = exec(
            command,
            (error: Error, stdout: string, stderr: string) => {
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
                    let lineno_str = match[5];
                    let lineno = parseInt(lineno_str) - 1;

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
                this.diagnostic_collection.set(doc.uri, diagnostics);
            }
        );
    }
}
