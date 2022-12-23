import * as vscode from 'vscode';
import * as child from 'child_process';
import BaseLinter from './BaseLinter';

var isWindows = process.platform === 'win32';

export default class IcarusLinter extends BaseLinter {
  private iverilogPath: string;
  private iverilogArgs: string;
  private runAtFileLocation: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: vscode.LogOutputChannel) {
    super('iverilog', diagnosticCollection, logger);
    vscode.workspace.onDidChangeConfiguration(() => {
      this.getConfig();
    });
    this.getConfig();
  }

  private getConfig() {
    this.iverilogPath = <string>vscode.workspace.getConfiguration().get('verilog.linting.path');
    this.iverilogArgs = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.iverilog.arguments')
    );
    this.runAtFileLocation = <boolean>(
      vscode.workspace.getConfiguration().get('verilog.linting.iverilog.runAtFileLocation')
    );
  }

  protected lint(doc: vscode.TextDocument) {
    this.logger.info('[iverilog-lint] iverilog lint requested');
    let docUri: string = doc.uri.fsPath; //path of current doc
    let lastIndex: number = isWindows == true ? docUri.lastIndexOf('\\') : docUri.lastIndexOf('/');
    let docFolder = docUri.substr(0, lastIndex); //folder of current doc
    let runLocation: string =
      this.runAtFileLocation == true ? docFolder : vscode.workspace.rootPath; //choose correct location to run
    let svArgs: string = doc.languageId == 'systemverilog' ? '-g2012' : ''; //SystemVerilog args
    let command: string =
      this.iverilogPath +
      'iverilog ' +
      svArgs +
      ' -t null ' +
      this.iverilogArgs +
      ' "' +
      doc.fileName +
      '"'; //command to execute
    this.logger.info('[iverilog-lint] Execute command: ' + command);

    var foo: child.ChildProcess = child.exec(
      command,
      { cwd: runLocation },
      (_error: Error, _stdout: string, stderr: string) => {
        let diagnostics: vscode.Diagnostic[] = [];
        let lines = stderr.split(/\r?\n/g);
        // Parse output lines
        lines.forEach((line, _) => {
          if (line.startsWith(doc.fileName)) {
            line = line.replace(doc.fileName, '');
            let terms = line.split(':');
            let lineNum = parseInt(terms[1].trim()) - 1;
            if (terms.length == 3) {
              diagnostics.push({
                severity: vscode.DiagnosticSeverity.Error,
                range: new vscode.Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                message: terms[2].trim(),
                code: 'iverilog',
                source: 'iverilog',
              });
            } else if (terms.length >= 4) {
              let sev: vscode.DiagnosticSeverity;
              if (terms[2].trim() == 'error') {
                sev = vscode.DiagnosticSeverity.Error;
              } else if (terms[2].trim() == 'warning') {
                sev = vscode.DiagnosticSeverity.Warning;
              } else {
                sev = vscode.DiagnosticSeverity.Information;
              }
              diagnostics.push({
                severity: sev,
                range: new vscode.Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                message: terms[3].trim(),
                code: 'iverilog',
                source: 'iverilog',
              });
            }
          }
        });
        this.logger.info('[iverilog-lint] ' + diagnostics.length + ' errors/warnings returned');
        this.diagnosticCollection.set(doc.uri, diagnostics);
      }
    );
  }
}
