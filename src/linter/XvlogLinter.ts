// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import BaseLinter from './BaseLinter';

export default class XvlogLinter extends BaseLinter {
  private configuration: vscode.WorkspaceConfiguration;
  private linterInstalledPath: string;
  private arguments: string;
  private includePath: string[];

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: vscode.LogOutputChannel) {
    super('xvlog', diagnosticCollection, logger);
    vscode.workspace.onDidChangeConfiguration(() => {
      this.updateConfig();
    });
    this.updateConfig();
  }

  private updateConfig() {
    this.linterInstalledPath = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.path')
    );
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.xvlog');
    this.arguments = <string>this.configuration.get('arguments');
    let path = <string[]>this.configuration.get('includePath');
    this.includePath = path.map((includePath: string) => this.resolvePath(includePath));
  }

  protected lint(doc: vscode.TextDocument) {
    let binPath: string = path.join(this.linterInstalledPath, 'xvlog');

    let args: string[] = [];
    args.push('-nolog');
    if (doc.languageId === 'systemverilog') {
      args.push('-sv');
    }
    args = args.concat(this.includePath.map((path: string) => '-i ' + path));
    this.logger.warn(this.includePath.join(' '));
    args.push(this.arguments);
    args.push(`"${doc.fileName}"`);
    let command: string = binPath + ' ' + args.join(' ');

    this.logger.info('[xvlog] Execute');
    this.logger.info('[xvlog]   command: ' + command);

    child_process.exec(command, (_error: Error, stdout: string, _stderr: string) => {
      let diagnostics: vscode.Diagnostic[] = [];

      stdout.split(/\r?\n/g).forEach((line) => {
        let match = line.match(
          /^(ERROR|WARNING):\s+\[(VRFC\b[^\]]*)\]\s+(.*\S)\s+\[(.*):(\d+)\]\s*$/
        );
        if (!match) {
          return;
        }

        let severity =
          match[1] === 'ERROR'
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;

        // Get filename and line number
        let _filename = match[4];
        let linenoStr = match[5];
        let lineno = parseInt(linenoStr) - 1;

        let diagnostic: vscode.Diagnostic = {
          severity: severity,
          code: match[2],
          message: '[' + match[2] + '] ' + match[3],
          range: new vscode.Range(lineno, 0, lineno, Number.MAX_VALUE),
          source: 'xvlog',
        };

        diagnostics.push(diagnostic);
      });
      this.logger.info(diagnostics.length + ' errors/warnings returned');
      this.diagnosticCollection.set(doc.uri, diagnostics);
    });
  }
}
