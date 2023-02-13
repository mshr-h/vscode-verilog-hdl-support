// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';

let isWindows = process.platform === 'win32';

export default class VerilatorLinter extends BaseLinter {
  private configuration: vscode.WorkspaceConfiguration;
  private linterInstalledPath: string;
  private arguments: string;
  private includePath: string[];
  private runAtFileLocation: boolean;
  private useWSL: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: vscode.LogOutputChannel) {
    super('verilator', diagnosticCollection, logger);
    vscode.workspace.onDidChangeConfiguration(() => {
      this.updateConfig();
    });
    this.updateConfig();
  }

  private updateConfig() {
    this.linterInstalledPath = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.path')
    );
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.verilator');
    this.arguments = <string>this.configuration.get('arguments');
    let path = <string[]>this.configuration.get('includePath');
    this.includePath = path.map((includePath: string) => this.resolvePath(includePath));
    this.runAtFileLocation = <boolean>this.configuration.get('runAtFileLocation');
    this.useWSL = <boolean>this.configuration.get('useWSL');
  }

  protected splitTerms(line: string) {
    let terms = line.split(':');

    for (var i = 0; i < terms.length; i++) {
      if (terms[i] === ' ') {
        terms.splice(i, 1);
        i--;
      } else {
        terms[i] = terms[i].trim();
      }
    }

    return terms;
  }

  protected convertToSeverity(severityString: string) {
    if (severityString.startsWith('Error')) {
      return vscode.DiagnosticSeverity.Error;
    } else if (severityString.startsWith('Warning')) {
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

    let verilator: string = isWindows
      ? this.useWSL
        ? 'wsl verilator'
        : 'verilator_bin.exe'
      : 'verilator';

    let binPath = path.join(this.linterInstalledPath, verilator);
    let args: string[] = [];
    if (doc.languageId === 'systemverilog') {
      args.push('-sv');
    }
    args.push('--lint-only');
    args.push(`-I"${docFolder}"`);
    args = args.concat(this.includePath.map((path: string) => '-I' + path));
    args.push(this.arguments);
    args.push(`"${docUri}"`);
    let command: string = binPath + ' ' + args.join(' ');

    let cwd: string = this.runAtFileLocation
      ? docFolder
      : vscode.workspace.workspaceFolders[0].uri.fsPath;

    this.logger.info('[verilator] Execute');
    this.logger.info('[verilator]   command: ' + command);
    this.logger.info('[verilator]   cwd    : ' + cwd);

    var _: child.ChildProcess = child.exec(
      command,
      { cwd: cwd },
      (_error: Error, _stdout: string, stderr: string) => {
        let diagnostics: vscode.Diagnostic[] = [];
        stderr.split(/\r?\n/g).forEach((line, _) => {
          if (!line.startsWith('%') || line.indexOf(docUri) <= 0) {
            return;
          }

          let rex = line.match(
            /%(\w+)(-[A-Z0-9_]+)?:\s*(\w+:)?(?:[^:]+):\s*(\d+):(?:\s*(\d+):)?\s*(\s*.+)/
          );

          if (rex && rex[0].length > 0) {
            let severity = this.convertToSeverity(rex[1]);
            let lineNum = Number(rex[4]) - 1;
            let colNum = Number(rex[5]) - 1;
            let message = rex[6];
            // Type of warning is in rex[2]
            colNum = isNaN(colNum) ? 0 : colNum; // for older Verilator versions (< 4.030 ~ish)

            if (!isNaN(lineNum)) {
              diagnostics.push({
                severity: severity,
                range: new vscode.Range(lineNum, colNum, lineNum, Number.MAX_VALUE),
                message: message,
                code: 'verilator',
                source: 'verilator',
              });
            }
            return;
          }
          this.logger.warn('[verilator] failed to parse error: ' + line);
        });
        this.logger.info(`[verilator] ${diagnostics.length} errors/warnings returned`);
        this.diagnosticCollection.set(doc.uri, diagnostics);
      }
    );
  }
}
