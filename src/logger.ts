import * as vscode from 'vscode';

const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Verilog');

export enum LogSeverity {
    info,
    warn,
    error,
    command,
}

export class Logger {
    constructor() {
    }

    log(msg: string, severity: LogSeverity = LogSeverity.info) {
        if (severity === LogSeverity.command) { outputChannel.appendLine('> ' + msg); }
        else {
            outputChannel.appendLine(
                '[' + LogSeverity[severity] + '] ' + msg
            );
        }
    }
}
