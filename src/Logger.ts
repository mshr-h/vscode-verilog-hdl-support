import {OutputChannel, workspace, window} from 'vscode'

const logChannel: OutputChannel = window.createOutputChannel("verilog");

export default class Logger {

    name: string;
    isEnabled: boolean;

    constructor(name: string) {
        this.name = name;
        // Register for any changes to logging
        workspace.onDidChangeConfiguration(() => {
            this.CheckIfEnabled();
        })
        this.CheckIfEnabled();
    }

    CheckIfEnabled() {
        this.isEnabled = <boolean>workspace.getConfiguration().get('verilog.logging.enabled');
    }

    log(msg: string) {
        if(this.isEnabled) {
            logChannel.appendLine("[" + this.name + "] " + msg)
        }
    }

}