// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import BaseLinter from './BaseLinter';
import { Logger } from '../logger';
import { END_OF_LINE } from '../constants';

export default class ModelsimLinter extends BaseLinter {
  private modelsimWork!: string;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: Logger) {
    super('modelsim', diagnosticCollection, logger);
    this.updateConfig();
  }

  protected override updateConfig() {
    const configuration = vscode.workspace.getConfiguration('verilog.linting.modelsim');
    this.config.arguments = configuration.get<string>('arguments', '');
    this.modelsimWork = configuration.get<string>('work', '');
    this.config.runAtFileLocation = configuration.get<boolean>('runAtFileLocation', false);
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    switch (severityString) {
      case 'Error':
        return vscode.DiagnosticSeverity.Error;
      case 'Warning':
        return vscode.DiagnosticSeverity.Warning;
    }
    return vscode.DiagnosticSeverity.Information;
  }

  protected lint(doc: vscode.TextDocument) {
    this.logger.info('modelsim lint requested');
    const cwd: string = this.getWorkingDirectory(doc);
    // no change needed for systemverilog
    const command: string =
      this.config.linterInstalledPath +
      'vlog -nologo -work ' +
      this.modelsimWork +
      ' "' +
      doc.fileName +
      '" ' +
      this.config.arguments; //command to execute
    var process: child.ChildProcess = child.exec(
      command,
      { cwd: cwd },
      (_error: Error | null, stdout: string, _stderr: string) => {
        let diagnostics: vscode.Diagnostic[] = [];
        let lines = stdout.split(/\r?\n/g);

        // ^\*\* (((Error)|(Warning))( \(suppressible\))?: )(\([a-z]+-[0-9]+\) )?([^\(]*\(([0-9]+)\): )(\([a-z]+-[0-9]+\) )?((((near|Unknown identifier|Undefined variable):? )?["']([\w:;\.]+)["'][ :.]*)?.*)
        // From https://github.com/dave2pi/SublimeLinter-contrib-vlog/blob/master/linter.py
        let regexExp =
          '^\\*\\* (((Error)|(Warning))( \\(suppressible\\))?: )(\\([a-z]+-[0-9]+\\) )?([^\\(]*)\\(([0-9]+)\\): (\\([a-z]+-[0-9]+\\) )?((((near|Unknown identifier|Undefined variable):? )?["\']([\\w:;\\.]+)["\'][ :.]*)?.*)';
        // Parse output lines
        lines.forEach((line, _) => {
          if (line.startsWith('**')) {
            try {
              let m = line.match(regexExp);
              if (!m || m[7] !== doc.fileName) {
                return;
              }
              let lineNum = parseInt(m[8]) - 1;
              let msg = m[10];
              diagnostics.push({
                severity: this.convertToSeverity(m[2]),
                range: new vscode.Range(lineNum, 0, lineNum, END_OF_LINE),
                message: msg,
                code: 'modelsim',
                source: 'modelsim',
              });
            } catch (e) {
              diagnostics.push({
                severity: vscode.DiagnosticSeverity.Information,
                range: new vscode.Range(0, 0, 0, END_OF_LINE),
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
