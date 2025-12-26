// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { Logger } from '../logger';

let isWindows = process.platform === 'win32';

export default class VerilatorLinter extends BaseLinter {
  private configuration!: vscode.WorkspaceConfiguration;
  private linterInstalledPath!: string;
  private arguments!: string;
  private includePath!: string[];
  private runAtFileLocation!: boolean;
  private useWSL!: boolean;

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

  private convertFromWslPath(inputPath: string): string {
    let cmd: string = `wsl wslpath -w '${inputPath}'`;
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
      : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? docFolder;
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
      (_error: child.ExecException | null, _stdout: string, stderr: string) => {
        // basically DiagnosticsCollection but with ability to append diag lists
        let filesDiag = new Map();

        stderr.split(/\r?\n/g).forEach((line, _, stderrLines) => {
          // if lineIndex is 0 and it doesn't start with %Error or %Warning,
          // the whole loop would skip
          // and it is probably a system error (wrong file name/directory/something)
          let lastDiagMessageType: string = "Error";

          // parsing previous lines for message type
          // shouldn't be more than 5 or so
          for (let lineIndex = _; lineIndex >= 0; lineIndex--) {
            if (stderrLines[lineIndex].startsWith("%Error")) {
              lastDiagMessageType = "Error";
              break;
            }
            if (stderrLines[lineIndex].startsWith("%Warning")) {
              lastDiagMessageType = "Warning";
              break;
            }
          }

          // Remove superfluous NUL from line head
          while (line.startsWith('\0')) {
            line = line.slice(1);
          }

          // first line would be normal stderr output like "directory name is invalid"
          // others are verilator sort of "highlighting" the issue, the block with "^~~~~"
          // this can actually be used for better error/warning highlighting

          // also this might have some false positives
          // probably something like "stderr passthrough setting" would be a good idea
          if (!line.startsWith('%')) {

            // allows for persistent 
            if (lastDiagMessageType === 'Warning') { this.logger.warn(line); }
            else { this.logger.error(line); }
            return;
          }

          // important match sections are named now:
          // severity - Error or Warning
          // errorCode - error code, if there is one, something like PINNOTFOUND
          // filePath - full path to the file, including it's name and extension
          // lineNumber - line number
          // columNumber - columnNumber
          // verboseError - error elaboration by verilator

          let errorParserRegex = new RegExp(
            /%(?<severity>\w+)/.source + // matches "%Warning" or "%Error"

            // this matches errorcode with "-" before it, but the "-" doesn't go into ErrorCode match group
            /(-(?<errorCode>[A-Z0-9]+))?/.source + // matches error code like -PINNOTFOUND

            /: /.source + // ": " before file path or error message

            // this one's a bit of a mess, but apparently one can't cleanly split regex match group between lines
            // and this is a large group since it matches file path and line and column numbers which may not exist at all

            // note: end of file path is detected using file extension at the end of it
            // this also allows for spaces in path.
            // (neiter Linux, nor Windows actually prohibits it, and Verilator handles spaces just fine)
            // In my testing, didn't lead cause any problems, but it potentially can
            // extension names are placed so that longest one is first and has highest priority

            /((?<filePath>(\S| )+(?<fileExtension>(\.svh)|(\.sv)|(\.SV)|(\.vh)|(\.vl)|(\.v))):((?<lineNumber>\d+):)?((?<columnNumber>\d+):)? )?/.source +

            // matches error message produced by Verilator
            /(?<verboseError>.*)/.source
            , "g"
          );

          let rex = errorParserRegex.exec(line);

          // Check if rex or rex.groups is undefined
          if (!rex || !rex.groups) {
            return;
          }

          // stderr passthrough
          // probably better toggled with a parameter
          if (rex.groups["severity"] === "Error") { this.logger.error(line); }
          else if (rex.groups["severity"] === "Warning") { this.logger.warn(line); }

          // theoretically, this shoudn't "fire", but just in case
          else { this.logger.error(line); }


          // vscode problems are tied to files
          // if there isn't a file name, no point going further
          if (!rex.groups["filePath"]) {
            return;
          }

          // replacing "\\" and "\" with "/" for consistency
          if (isWindows) {
            rex.groups["filePath"] = rex.groups["filePath"].replace(/(\\\\)|(\\)/g, "/");

            // if WSL is used, convert the path to Windows format
            if (this.useWSL) {
              rex.groups["filePath"] = this.convertFromWslPath(rex.groups["filePath"]);
            }
          }

          // if there isn't a list of errors for this file already, it
          // needs to be created
          if (!filesDiag.has(rex.groups["filePath"])) {
            filesDiag.set(rex.groups["filePath"], []);
          }

          if (rex && rex[0].length > 0) {
            let lineNum = Number(rex.groups["lineNumber"]) - 1;
            let colNum = Number(rex.groups["columnNumber"]) - 1;

            colNum = isNaN(colNum) ? 0 : colNum; // for older Verilator versions (< 4.030 ~ish)

            if (!isNaN(lineNum)) {

              // appending diagnostic message to an array of messages
              // tied to a file
              filesDiag.get(rex.groups["filePath"]).push({
                severity: this.convertToSeverity(rex.groups["severity"]),
                range: new vscode.Range(lineNum, colNum, lineNum, Number.MAX_VALUE),
                message: rex.groups["verboseError"],
                code: rex.groups["errorCode"],
                source: 'verilator',
              });

            }
            return;
          }
        });

        // since error parsing has been redone "from the ground up"
        // earlier errors are discarded
        this.diagnosticCollection.clear();

        filesDiag.forEach((issuesArray, fileName) => {
          let fileURI = vscode.Uri.file(fileName);
          this.diagnosticCollection.set(
            fileURI,
            issuesArray
          );
        }
        );
      }
    );
  }
}
