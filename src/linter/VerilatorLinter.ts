import {
    workspace,
    window,
    Disposable,
    Range,
    TextDocument,
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticCollection,
    languages,
} from 'vscode';
import * as child from 'child_process';
import BaseLinter from './BaseLinter';
import { join } from 'path';
import { Logger, LogSeverity } from '../Logger';

var isWindows = process.platform === 'win32';
let logger: Logger = new Logger();

export default class VerilatorLinter extends BaseLinter {
    private verilatorPath: string;
    private verilatorArgs: string;
    private runAtFileLocation: boolean;
    private useWSL: boolean;

    constructor(diagnosticCollection: DiagnosticCollection, logger: Logger) {
        super('verilator', diagnosticCollection, logger);

        workspace.onDidChangeConfiguration(() => {
            this.getConfig();
        });
        this.getConfig();
    }

    private getConfig() {
        this.verilatorPath = <string>(
            workspace
                .getConfiguration()
                .get('verilog.linting.path', '')
        );
        this.verilatorArgs = <string>(
            workspace
                .getConfiguration()
                .get('verilog.linting.verilator.arguments', '')
        );
        this.runAtFileLocation = <boolean>(
            workspace
                .getConfiguration()
                .get('verilog.linting.verilator.runAtFileLocation')
        );
        this.useWSL = <boolean>(
            workspace.getConfiguration().get('verilog.linting.verilator.useWSL')
        );
    }

    protected splitTerms(line: string) {
        let terms = line.split(':');

        for (var i = 0; i < terms.length; i++) {
            if (terms[i] == ' ') {
                terms.splice(i, 1);
                i--;
            } else {
                terms[i] = terms[i].trim();
            }
        }

        return terms;
    }

    protected getSeverity(severityString: string) {
        let result = DiagnosticSeverity.Information;

        if (severityString.startsWith('Error')) {
            result = DiagnosticSeverity.Error;
        } else if (severityString.startsWith('Warning')) {
            result = DiagnosticSeverity.Warning;
        }

        return result;
    }

    protected lint(doc: TextDocument) {
        this.logger.log('verilator lint requested');
        let docUri: string = doc.uri.fsPath; //path of current doc
        let lastIndex: number =
            isWindows == true
                ? docUri.lastIndexOf('\\')
                : docUri.lastIndexOf('/');
        let docFolder = docUri.substr(0, lastIndex); //folder of current doc
        let runLocation: string =
            this.runAtFileLocation == true ? docFolder : workspace.rootPath; //choose correct location to run
        let svArgs: string = doc.languageId == 'systemverilog' ? '-sv' : ''; //Systemverilog args
        let verilator: string = 'verilator';
        if (isWindows) {
            if (this.useWSL == true) {
                verilator = `wsl ${verilator}`;
                let docUriCmd: string = `wsl wslpath '${docUri}'`;
                docUri = child
                    .execSync(docUriCmd, {})
                    .toString()
                    .replace(/\r?\n/g, '');
                this.logger.log(
                    `Rewrote docUri to ${docUri} for WSL`,
                    LogSeverity.info
                );

                let docFolderCmd: string = `wsl wslpath '${docFolder}'`;
                docFolder = child
                    .execSync(docFolderCmd, {})
                    .toString()
                    .replace(/\r?\n/g, '');
                this.logger.log(
                    `Rewrote docFolder to ${docFolder} for WSL`,
                    LogSeverity.info
                );
            } else {
                verilator = verilator + '_bin.exe';
                docUri = docUri.replace(/\\/g, '/');
                docFolder = docFolder.replace(/\\/g, '/');
            }
        }
        let command: string =
            this.verilatorPath +
            verilator +
            ' ' +
            svArgs +
            ' --lint-only -I' +
            '"' +
            docFolder +
            '" ' +
            this.verilatorArgs +
            ' "' +
            docUri +
            '"'; //command to execute
        this.logger.log(command, LogSeverity.command);

        var foo: child.ChildProcess = child.exec(
            command,
            { cwd: runLocation },
            (_error: Error, _stdout: string, stderr: string) => {
                let diagnostics: Diagnostic[] = [];
                let lines = stderr.split(/\r?\n/g);

                // Parse output lines
                lines.forEach((line, _) => {
                    // Error for our file
                    if (line.startsWith('%') && line.indexOf(docUri) > 0) {
                        let rex = line.match(
                            /%(\w+)(-[A-Z0-9_]+)?:\s*(\w+:)?(?:[^:]+):\s*(\d+):(?:\s*(\d+):)?\s*(\s*.+)/
                        );

                        if (rex && rex[0].length > 0) {
                            let severity = this.getSeverity(rex[1]);
                            let lineNum = Number(rex[4]) - 1;
                            let colNum = Number(rex[5]) - 1;
                            let message = rex[6];
                            // Type of warning is in rex[2]
                            colNum = isNaN(colNum) ? 0 : colNum; // for older Verilator versions (< 4.030 ~ish)

                            if (!isNaN(lineNum)) {
                                logger.log(
                                    severity + ': [' + lineNum + '] ' + message
                                );

                                diagnostics.push({
                                    severity: severity,
                                    range: new Range(
                                        lineNum,
                                        colNum,
                                        lineNum,
                                        Number.MAX_VALUE
                                    ),
                                    message: message,
                                    code: 'verilator',
                                    source: 'verilator',
                                });
                            }
                        } else {
                            this.logger.log(
                                'failed to parse error: ' + line,
                                LogSeverity.warn
                            );
                        }
                    }
                });
                this.logger.log(
                    diagnostics.length + ' errors/warnings returned'
                );
                this.diagnosticCollection.set(doc.uri, diagnostics);
            }
        );
    }
}
