import * as vscode from 'vscode';
import * as child from 'child_process';
import BaseLinter from './BaseLinter';
import * as path from 'path';

export default class IcarusLinter extends BaseLinter {
  private linterDir: string;
  private arguments: string;
  private includePath: string[];
  private runAtFileLocation: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: vscode.LogOutputChannel) {
    super('iverilog', diagnosticCollection, logger);
    vscode.workspace.onDidChangeConfiguration(() => {
      this.updateConfig();
    });
    this.updateConfig();
  }

  private updateConfig() {
    this.linterDir = <string>vscode.workspace.getConfiguration().get('verilog.linting.path');
    this.arguments = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.iverilog.arguments')
    );
    let path = <string[]>(
      vscode.workspace.getConfiguration().get('verilog.linting.iverilog.includePath')
    );
    this.includePath = path.map((includePath: string) => this.resolvePath(includePath));

    this.runAtFileLocation = <boolean>(
      vscode.workspace.getConfiguration().get('verilog.linting.iverilog.runAtFileLocation')
    );
  }

  // returns absolute path
  private resolvePath(inputPath: string): string {
    if (!path || path.isAbsolute(inputPath) || !vscode.workspace.workspaceFolders[0]) {
      return '';
    }
    return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, inputPath);
  }

  protected lint(doc: vscode.TextDocument) {
    this.logger.info('[iverilog-lint] iverilog lint requested');
    let args: string[] = [];

    args.push('-t null');

    if (doc.languageId === 'systemverilog') {
      args.push('-g2012');
    }

    args = args.concat(this.includePath.map((path: string) => '-I ' + path));

    args.push(this.arguments);
    args.push(doc.uri.fsPath);

    let command: string = path.join(this.linterDir, 'iverilog') + ' ' + args.join(' ');

    let cwd: string = this.runAtFileLocation
      ? path.dirname(doc.uri.fsPath)
      : vscode.workspace.workspaceFolders[0].uri.fsPath;

    this.logger.info('[iverilog-lint] Execute');
    this.logger.info('[iverilog-lint]   command: ' + command);
    this.logger.info('[iverilog-lint]   cwd    : ' + cwd);

    var _: child.ChildProcess = child.exec(
      command,
      { cwd: cwd },
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
