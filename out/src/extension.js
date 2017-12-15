'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const child = require("child_process");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "verilog" is now active!');
    let linter = new Linter();
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode_1.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed
        // var foo: child.ChildProcess = child.exec('iverilog -V',(error:Error, stdout:string, stderr:string) => {
        //     console.log(stdout);
        // })
        // Display a message box to the user
        vscode_1.window.showInformationMessage('Hello World!');
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
class Linter {
    constructor() {
        let subscriptions = [];
        // window.onDidChangeTextEditorSelection(this._runIVerilog, this, subscriptions);
        vscode_1.workspace.onDidOpenTextDocument(this._runIVerilog, this, subscriptions);
        vscode_1.workspace.onDidCloseTextDocument(this._runIVerilog, this, subscriptions);
        vscode_1.workspace.onDidSaveTextDocument(this._runIVerilog, this, subscriptions);
        // window.onDidChangeActiveTextEditor(this._runIVerilog, this, subscriptions);
    }
    _runIVerilog(doc) {
        if (doc.languageId == 'verilog') {
            vscode_1.window.showInformationMessage('linter running');
            var foo = child.exec('iverilog -t null ' + doc.fileName + ' ', (error, stdout, stderr) => {
                this.output = stderr;
                // console.log(stderr);
                this.parseOutput(doc, stderr);
            });
        }
    }
    parseOutput(doc, output) {
        let isWindows = false;
        if (doc.fileName[1] == ':') {
            isWindows = true;
        }
        let lines = output.split(/\r?\n/g);
        lines.forEach((line, i) => {
            if (line.startsWith(doc.fileName)) {
                line = line.replace(doc.fileName, '');
                let terms = line.split(':');
                console.log(terms[1] + ' ' + terms[2]);
            }
        });
    }
}
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map