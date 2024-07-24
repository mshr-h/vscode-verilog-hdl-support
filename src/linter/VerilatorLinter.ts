// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { Logger } from '../logger';

let isWindows = process.platform === 'win32';

export default class VerilatorLinter extends BaseLinter {
  private configuration: vscode.WorkspaceConfiguration;
  private linterInstalledPath: string;
  private arguments: string;
  private includePath: string[];
  private runAtFileLocation: boolean;
  private useWSL: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: Logger) {
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

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
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
    let docUri: string = isWindows
      ? this.useWSL
        ? this.convertToWslPath(doc.uri.fsPath)
        : doc.uri.fsPath.replace(/\\/g, '/')
      : doc.uri.fsPath;
    let docFolder: string = isWindows
      ? this.useWSL
        ? this.convertToWslPath(path.dirname(doc.uri.fsPath))
        : path.dirname(doc.uri.fsPath).replace(/\\/g, '/')
      : path.dirname(doc.uri.fsPath);
    let cwd: string = this.runAtFileLocation
      ? isWindows
        ? path.dirname(doc.uri.fsPath.replace(/\\/g, '/'))
        : docFolder
      : vscode.workspace.workspaceFolders[0].uri.fsPath;
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
    args = args.concat(this.includePath.map((path: string) => `-I"${path}"`));
    args.push(this.arguments);
    args.push(`"${docUri}"`);
    let command: string = binPath + ' ' + args.join(' ');

    this.logger.info('[verilator] Execute');
    this.logger.info('[verilator]   command: ' + command);
    this.logger.info('[verilator]   cwd    : ' + cwd);

    var _: child.ChildProcess = child.exec(
      command,
      { cwd: cwd },
      (_error: Error, _stdout: string, stderr: string) => {
        //let diagnostics: vscode.Diagnostic[] = [];

        // basically DiagnosticsCollection but with ability to append diag lists
        let filesDiag = {};
        let error_warning_counter = 0;
        stderr.split(/\r?\n/g).forEach((line, _) => {

          if (!line.startsWith('%')) {
            this.logger.error(line);
            return;
          }

          // for this regex, match sections are:
          // 1 - severity (warning/error)
          // 3 - error/warning code (EOFNEWLINE, ...),
          // 5 - file path
          // 9 - line number
          // 11 - column number
          // 12 - message

          let rex = line.match(
            /(\w+)(-([A-Z0-9]+))?: ((\S+((\.sv)|(\.v))):(\d+):((\d+):)? )?(.*)/
          );

          // vscode problems are tied to files, so if there is no file name, no point adding
          if (!rex[5]) {return;}
          
          // replacing "\\" and "\" with "/" for consistency
          if (isWindows)
          {
            rex[5] = rex[5].replace(/(\\\\)|(\\)/, "/");
          }

          // if no errors for this file, new list needs to be created
          if (!(rex[5] in Object.keys(filesDiag)))
          {
            filesDiag[rex[5]] = [];
          }
          

          if (rex && rex[0].length > 0) {
            let lineNum = Number(rex[9]) - 1;
            let colNum = Number(rex[11]) - 1;
            // Type of warning is in rex[2]
            colNum = isNaN(colNum) ? 0 : colNum; // for older Verilator versions (< 4.030 ~ish)

            if (!isNaN(lineNum)) {
              filesDiag[rex[5]].push({
                severity: this.convertToSeverity(rex[1]),
                range: new vscode.Range(lineNum, colNum, lineNum, Number.MAX_VALUE),
                message: rex[12],
                code: rex[3],
                source: 'verilator',
              });

              error_warning_counter++;
            }
            return;
          }
          this.logger.warn('[verilator] failed to parse error: ' + line);
        });
        this.logger.info(`[verilator] ${error_warning_counter} errors/warnings returned`);
        this.diagnosticCollection.clear()
        for (let fileName in filesDiag)
        {
          let fileURI = vscode.Uri.file(fileName);
          // adding diag info for each file
          this.diagnosticCollection.set(
            fileURI,
            filesDiag[fileName]
          );
        }
      }
    );
  }
}
