// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';

let isWindows = process.platform === 'win32';

export default class SlangLinter extends BaseLinter {
  private configuration: vscode.WorkspaceConfiguration;
  private linterInstalledPath: string;
  private arguments: string;
  private includePath: string[];
  private runAtFileLocation: boolean;
  private useWSL: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: vscode.LogOutputChannel) {
    super('slang', diagnosticCollection, logger);
    vscode.workspace.onDidChangeConfiguration(() => {
      this.updateConfig();
    });
    this.updateConfig();
  }

  private updateConfig() {
    this.linterInstalledPath = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.path')
    );
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.slang');
    this.arguments = <string>this.configuration.get('arguments');
    let path = <string[]>this.configuration.get('includePath');
    this.includePath = path.map((includePath: string) => this.resolvePath(includePath));
    this.runAtFileLocation = <boolean>this.configuration.get('runAtFileLocation');
    this.useWSL = <boolean>this.configuration.get('useWSL');
  }

  protected convertToSeverity(severityString: string) {
    if (severityString.startsWith('error')) {
      return vscode.DiagnosticSeverity.Error;
    } else if (severityString.startsWith('warning')) {
      return vscode.DiagnosticSeverity.Warning;
    }
    return vscode.DiagnosticSeverity.Information;
  }

  private convertToWslPath(inputPath: string): string {
    let cmd: string = `wsl wslpath '${inputPath}'`;
    return child.execSync(cmd, {}).toString().replace(/\r?\n/g, '');
  }

  protected lint(doc: vscode.TextDocument) {
    let docUri: string = doc.uri.fsPath;
    let docFolder: string = path.dirname(docUri);
    if (isWindows) {
      if (this.useWSL) {
        docUri = this.convertToWslPath(docUri);
        this.logger.info(`Rewrote docUri to ${docUri} for WSL`);

        docFolder = this.convertToWslPath(docFolder);
        this.logger.info(`Rewrote docFolder to ${docFolder} for WSL`);
      } else {
        docUri = docUri.replace(/\\/g, '/');
        docFolder = docFolder.replace(/\\/g, '/');
      }
    }

    let slang: string = isWindows ? (this.useWSL ? 'wsl slang' : 'slang.exe') : 'slang';

    let binPath = path.join(this.linterInstalledPath, slang);
    let args: string[] = [];
    args.push(`-I ${docFolder}`);
    args = args.concat(this.includePath.map((path: string) => `-I ${path}`));
    args.push(this.arguments);
    args.push(`"${docUri}"`);
    let command: string = binPath + ' ' + args.join(' ');

    let cwd: string = this.runAtFileLocation
      ? docFolder
      : vscode.workspace.workspaceFolders[0].uri.fsPath;

    this.logger.info('[slang] Execute');
    this.logger.info('[slang]   command: ' + command);
    this.logger.info('[slang]   cwd    : ' + cwd);

    var _: child.ChildProcess = child.exec(
      command,
      { cwd: cwd },
      (_error: Error, _stdout: string, stderr: string) => {
        let diagnostics: vscode.Diagnostic[] = [];
        const re = /(.+?):(\d+):(\d+):\s(note|warning|error):\s([^[\]]*)(\[-W(.*)\])?/;
        stderr.split(/\r?\n/g).forEach((line, _) => {
          if (line.search(re) === -1) {
            return;
          }

          let rex = line.match(re);

          if (rex && rex[0].length > 0) {
            let lineNum = Number(rex[2]) - 1;
            let colNum = Number(rex[3]) - 1;

            diagnostics.push({
              severity: this.convertToSeverity(rex[4]),
              range: new vscode.Range(lineNum, colNum, lineNum, Number.MAX_VALUE),
              message: rex[5],
              code: rex[7] ? rex[7] : 'error',
              source: 'slang',
            });
            return;
          }
          this.logger.warn('[slang] failed to parse error: ' + line);
        });
        this.logger.info(`[slang] ${diagnostics.length} errors/warnings returned`);
        this.diagnosticCollection.set(doc.uri, diagnostics);
      }
    );
  }
}
