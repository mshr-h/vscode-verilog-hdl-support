// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import {exec, ExecException} from 'child_process';
import * as path from 'path';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';

export default class XvlogLinter extends BaseLinter {
  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    super('xvlog', diagnosticCollection);
    this.updateConfig();
  }

  protected override updateConfig() {
    const configuration = vscode.workspace.getConfiguration('verilog.linting.xvlog');
    this.config.arguments = configuration.get<string>('arguments', '');
    const paths = configuration.get<string[]>('includePath', []);
    this.config.includePath = this.resolveIncludePaths(paths);
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    if (severityString === 'ERROR') {
      return vscode.DiagnosticSeverity.Error;
    }
    return vscode.DiagnosticSeverity.Warning;
  }

  protected lint(doc: vscode.TextDocument) {
    const binPath: string = path.join(this.config.linterInstalledPath, 'xvlog');

    let args: string[] = [];
    args.push('-nolog');
    if (doc.languageId === 'systemverilog') {
      args.push('-sv');
    }
    args = args.concat(this.config.includePath.map((p: string) => `-i "${p}"`));
    this.logger.warn`${this.config.includePath.join(' ')}`;
    args.push(this.config.arguments);
    args.push(`"${doc.fileName}"`);
    const command: string = `${binPath  } ${  args.join(' ')}`;

    this.logger.info("Executing", { command });

    exec(command, (_error: ExecException | null, stdout: string, _stderr: string) => {
      const diagnostics: vscode.Diagnostic[] = [];

      stdout.split(/\r?\n/g).forEach((line) => {
        const match = line.match(
          /^(ERROR|WARNING):\s+\[(VRFC\b[^\]]*)\]\s+(.*\S)\s+\[(.*):(\d+)\]\s*$/
        );
        if (!match) {
          return;
        }

        // Get filename and line number
        const _filename = match[4];
        const lineno = parseInt(match[5]) - 1;

        const diagnostic: vscode.Diagnostic = {
          severity: this.convertToSeverity(match[1]),
          code: match[2],
          message: `[${  match[2]  }] ${  match[3]}`,
          range: new vscode.Range(lineno, 0, lineno, END_OF_LINE),
          source: 'xvlog',
        };

        diagnostics.push(diagnostic);
      });
      this.logger.info`${diagnostics.length} errors/warnings returned`;
      this.diagnosticCollection.set(doc.uri, diagnostics);
    });
  }
}
