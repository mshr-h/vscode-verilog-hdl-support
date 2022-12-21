import * as vscode from 'vscode';

export enum LogSeverity {
    info,
    warn,
    error,
    command,
}

export class Logger {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Verilog');
    }

    log(msg: string, severity: LogSeverity = LogSeverity.info) {
        if (severity === LogSeverity.command) { this.outputChannel.appendLine('> ' + msg); }
        else {
            this.outputChannel.appendLine(
                '[' + LogSeverity[severity] + '] ' + msg
            );
        }
    }
}
