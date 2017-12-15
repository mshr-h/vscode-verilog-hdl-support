'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const child = require("child_process");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let diagnosticCollection;
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
    diagnosticCollection = vscode_1.languages.createDiagnosticCollection();
    context.subscriptions.push(diagnosticCollection);
}
exports.activate = activate;
class Linter {
    // private output: string;
    constructor() {
        let subscriptions = [];
        // window.onDidChangeTextEditorSelection(this._runIVerilog, this, subscriptions);
        vscode_1.workspace.onDidOpenTextDocument(this._runIVerilog, this, subscriptions);
        vscode_1.workspace.onDidCloseTextDocument((textDocument) => {
            diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
        vscode_1.workspace.onDidSaveTextDocument(this._runIVerilog, this, subscriptions);
        // window.onDidChangeActiveTextEditor(this._runIVerilog, this, subscriptions);
    }
    _runIVerilog(doc) {
        if (doc.languageId == 'verilog') {
            vscode_1.window.showInformationMessage('linter running');
            var foo = child.exec('iverilog -t null ' + doc.fileName + ' ', (error, stdout, stderr) => {
                // this.output = stderr;
                // console.log(stderr);
                let isWindows = false;
                if (doc.fileName[1] == ':') {
                    isWindows = true;
                }
                let diagnostics = [];
                let lines = stderr.split(/\r?\n/g);
                lines.forEach((line, i) => {
                    if (line.startsWith(doc.fileName)) {
                        line = line.replace(doc.fileName, '');
                        let terms = line.split(':');
                        console.log(terms[1] + ' ' + terms[2]);
                        let lineNum = parseInt(terms[1].trim());
                        if (terms.length == 3)
                            diagnostics.push({
                                severity: vscode_1.DiagnosticSeverity.Error,
                                range: new vscode_1.Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                                message: terms[2].trim(),
                                code: 'iverilog'
                            });
                        else if (terms.length == 4) {
                            let sev;
                            if (terms[2].trim() == 'error')
                                sev = vscode_1.DiagnosticSeverity.Error;
                            else if (terms[2].trim() == 'warning')
                                sev = vscode_1.DiagnosticSeverity.Warning;
                            else
                                sev = vscode_1.DiagnosticSeverity.Information;
                            diagnostics.push({
                                severity: sev,
                                range: new vscode_1.Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                                message: terms[3].trim(),
                                code: 'iverilog'
                            });
                        }
                    }
                });
                diagnosticCollection.set(doc.uri, diagnostics);
            });
        }
    }
    parseOutput(doc, output) {
    }
}
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map