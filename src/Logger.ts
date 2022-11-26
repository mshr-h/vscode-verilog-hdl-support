import { OutputChannel, workspace, window } from 'vscode';

const logChannel: OutputChannel = window.createOutputChannel('Verilog');

export enum LogSeverity {
    info,
    warn,
    error,
    command,
}

export class Logger {
    isEnabled: boolean;

    constructor() {
        // Register for any changes to logging
        workspace.onDidChangeConfiguration(() => {
            this.checkIfEnabled();
        });
        this.checkIfEnabled();
    }

    checkIfEnabled() {
        this.isEnabled = <boolean>(
            workspace.getConfiguration().get('verilog.logging.enabled')
        );
    }

    log(msg: string, severity: LogSeverity = LogSeverity.info) {
        if (this.isEnabled) {
            if (severity === LogSeverity.command)
                {logChannel.appendLine('> ' + msg);}
            else
                {logChannel.appendLine(
                    '[' + LogSeverity[severity] + '] ' + msg
                );}
        }
    }
}
