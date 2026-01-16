// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';

const isWindows = process.platform === 'win32';

export default class SlangLinter extends BaseLinter {
  private configuration!: vscode.WorkspaceConfiguration;
  private useWSL!: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    super('slang', diagnosticCollection);
    this.updateConfig();
  }

  protected override updateConfig() {
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.slang');
    this.config.arguments = this.configuration.get<string>('arguments', '');
    const paths = this.configuration.get<string[]>('includePath', []);
    this.config.includePath = this.resolveIncludePaths(paths);
    this.config.runAtFileLocation = this.configuration.get<boolean>('runAtFileLocation', false);
    this.useWSL = this.configuration.get<boolean>('useWSL', false);
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    if (severityString.startsWith('error')) {
      return vscode.DiagnosticSeverity.Error;
    } else if (severityString.startsWith('warning')) {
      return vscode.DiagnosticSeverity.Warning;
    }
    return vscode.DiagnosticSeverity.Information;
  }

  protected lint(doc: vscode.TextDocument) {
    // TODO: Refactoring
    let docUri: string = doc.uri.fsPath;
    let docFolder: string = path.dirname(docUri);
    const cwdWin: string = path.dirname(docUri);
    if (isWindows) {
      if (this.useWSL) {
        docUri = this.convertToWslPath(docUri);
        this.logger.info`Rewrote docUri to ${docUri} for WSL`;

        docFolder = this.convertToWslPath(docFolder);
        this.logger.info`Rewrote docFolder to ${docFolder} for WSL`;
      } else {
        docUri = docUri.replace(/\\/g, '/');
        docFolder = docFolder.replace(/\\/g, '/');
      }
    }

    const slang: string = isWindows ? (this.useWSL ? 'wsl slang' : 'slang.exe') : 'slang';

    const binPath = path.join(this.config.linterInstalledPath, slang);
    let args: string[] = [];
    args.push(`-I "${docFolder}"`);
    args = args.concat(this.config.includePath.map((p: string) => `-I "${p}"`));
    args.push(this.config.arguments);
    args.push(`"${docUri}"`);
    const command: string = `${binPath  } ${  args.join(' ')}`;

    const cwd: string = this.config.runAtFileLocation
      ? isWindows && this.useWSL
        ? cwdWin
        : docFolder
      : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? docFolder;

    this.logger.info("Executing", { command, cwd });

    const _: child.ChildProcess = child.exec(
      command,
      { cwd },
      (_error: Error | null, _stdout: string, stderr: string) => {
        const diagnostics: vscode.Diagnostic[] = [];
        const re = /(.+?):(\d+):(\d+):\s(note|warning|error):\s(.*?)(\[-W(.*)\]|$)/;
        stderr.split(/\r?\n/g).forEach((line, _) => {
          if (line.search(re) === -1) {
            return;
          }

          const rex = line.match(re);
          if (!rex) {
            return;
          }

          let filePath = rex[1];
          if (isWindows) {
            if (this.useWSL) {
              filePath = this.convertToWslPath(filePath);
              this.logger.info`Rewrote filePath to ${filePath} for WSL`;
            } else {
              filePath = filePath.replace(/\\/g, '/');
            }
          }

          if (!docUri.endsWith(filePath)) {
            return;
          }

          if (rex && rex[0] && rex[0].length > 0) {
            const lineNum = Number(rex[2]) - 1;
            const colNum = Number(rex[3]) - 1;

            diagnostics.push({
              severity: this.convertToSeverity(rex[4]),
              range: new vscode.Range(lineNum, colNum, lineNum, END_OF_LINE),
              message: rex[5],
              code: rex[7] ? rex[7] : 'error',
              source: 'slang',
            });
            return;
          }
          this.logger.warn`failed to parse error: ${line}`;
        });
        this.logger.info`${diagnostics.length} errors/warnings returned`;
        this.diagnosticCollection.set(doc.uri, diagnostics);
      }
    );
  }
}
