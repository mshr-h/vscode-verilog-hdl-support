// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import BaseLinter from './BaseLinter';

var isWindows = process.platform === 'win32';

export default class ModelsimLinter extends BaseLinter {
  private modelsimPath: string;
  private modelsimArgs: string;
  private modelsimWork: string;
  private runAtFileLocation: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: vscode.LogOutputChannel) {
    super('modelsim', diagnosticCollection, logger);
    vscode.workspace.onDidChangeConfiguration(() => {
      this.getConfig();
    });
    this.getConfig();
  }

  private getConfig() {
    this.modelsimPath = <string>vscode.workspace.getConfiguration().get('verilog.linting.path');
    //get custom arguments
    this.modelsimArgs = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.modelsim.arguments')
    );
    this.modelsimWork = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.modelsim.work')
    );
    this.runAtFileLocation = <boolean>(
      vscode.workspace.getConfiguration().get('verilog.linting.modelsim.runAtFileLocation')
    );
  }

  protected lint(doc: vscode.TextDocument) {
    this.logger.info('modelsim lint requested');
    let docUri: string = doc.uri.fsPath; //path of current doc
    let lastIndex: number = isWindows == true ? docUri.lastIndexOf('\\') : docUri.lastIndexOf('/');
    let docFolder = docUri.substr(0, lastIndex); //folder of current doc
    let runLocation: string =
      this.runAtFileLocation == true ? docFolder : vscode.workspace.rootPath; //choose correct location to run
    // no change needed for systemverilog
    let command: string =
      this.modelsimPath +
      'vlog -nologo -work ' +
      this.modelsimWork +
      ' "' +
      doc.fileName +
      '" ' +
      this.modelsimArgs; //command to execute
    var process: child.ChildProcess = child.exec(
      command,
      { cwd: runLocation },
      (_error: Error, stdout: string, _stderr: string) => {
        let diagnostics: vscode.Diagnostic[] = [];
        let lines = stdout.split(/\r?\n/g);

        // ^\*\* (((Error)|(Warning))( \(suppressible\))?: )(\([a-z]+-[0-9]+\) )?([^\(]*\(([0-9]+)\): )(\([a-z]+-[0-9]+\) )?((((near|Unknown identifier|Undefined variable):? )?["']([\w:;\.]+)["'][ :.]*)?.*)
        // From https://github.com/dave2pi/SublimeLinter-contrib-vlog/blob/master/linter.py
        let regexExp =
          '^\\*\\* (((Error)|(Warning))( \\(suppressible\\))?: )(\\([a-z]+-[0-9]+\\) )?([^\\(]*)\\(([0-9]+)\\): (\\([a-z]+-[0-9]+\\) )?((((near|Unknown identifier|Undefined variable):? )?["\']([\\w:;\\.]+)["\'][ :.]*)?.*)';
        // Parse output lines
        lines.forEach((line, _) => {
          let sev: vscode.DiagnosticSeverity;
          if (line.startsWith('**')) {
            let m = line.match(regexExp);
            try {
              if (m[7] != doc.fileName) {
                return;
              }
              switch (m[2]) {
                case 'Error':
                  sev = vscode.DiagnosticSeverity.Error;
                  break;
                case 'Warning':
                  sev = vscode.DiagnosticSeverity.Warning;
                  break;
                default:
                  sev = vscode.DiagnosticSeverity.Information;
                  break;
              }
              let lineNum = parseInt(m[8]) - 1;
              let msg = m[10];
              diagnostics.push({
                severity: sev,
                range: new vscode.Range(lineNum, 0, lineNum, Number.MAX_VALUE),
                message: msg,
                code: 'modelsim',
                source: 'modelsim',
              });
            } catch (e) {
              diagnostics.push({
                severity: sev,
                range: new vscode.Range(0, 0, 0, Number.MAX_VALUE),
                message: line,
                code: 'modelsim',
                source: 'modelsim',
              });
            }
          }
        });
        this.logger.info(diagnostics.length + ' errors/warnings returned');
        this.diagnosticCollection.set(doc.uri, diagnostics);
      }
    );
  }
}
