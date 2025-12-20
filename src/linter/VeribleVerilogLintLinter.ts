// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { Logger } from '../logger';

let isWindows = process.platform === 'win32';

export default class VeribleVerilogLintLinter extends BaseLinter {
  private configuration!: vscode.WorkspaceConfiguration;
  private linterInstalledPath!: string;
  private arguments!: string;
  private runAtFileLocation!: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: Logger) {
    super('verible-verilog-lint', diagnosticCollection, logger);
    vscode.workspace.onDidChangeConfiguration(() => {
      this.updateConfig();
    });
    this.updateConfig();
  }

  private updateConfig() {
    this.linterInstalledPath = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.path')
    );
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.veribleVerilogLint');
    this.arguments = <string>this.configuration.get('arguments');
    this.runAtFileLocation = <boolean>this.configuration.get('runAtFileLocation');
  }

  protected convertToSeverity(message: string): vscode.DiagnosticSeverity {
    const lower = message.toLowerCase();
    if (lower.includes('error') || lower.includes('fatal') || lower.includes('syntax')) {
      return vscode.DiagnosticSeverity.Error;
    }
    if (lower.includes('warning')) {
      return vscode.DiagnosticSeverity.Warning;
    }
    return vscode.DiagnosticSeverity.Warning;
  }

  protected lint(doc: vscode.TextDocument) {
    this.logger.info('Executing VeribleVerilogLintLinter.lint()');

    let binName = isWindows ? 'verible-verilog-lint.exe' : 'verible-verilog-lint';
    let binPath: string = path.join(this.linterInstalledPath, binName);
    this.logger.info('verible-verilog-lint binary path: ' + binPath);

    let docUri: string = doc.uri.fsPath;
    let docFolder: string = path.dirname(docUri);
    let cwd: string = this.runAtFileLocation
      ? docFolder
      : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? docFolder;

    let args: string[] = [];
    args.push(this.arguments);
    args.push(`"${docUri}"`);

    let command: string = binPath + ' ' + args.join(' ');

    this.logger.info('[verible-verilog-lint] Execute');
    this.logger.info('[verible-verilog-lint]   command: ' + command);
    this.logger.info('[verible-verilog-lint]   cwd    : ' + cwd);

    var _: child.ChildProcess = child.exec(
      command,
      { cwd: cwd },
      (_error: child.ExecException | null, stdout: string, stderr: string) => {
        let diagnostics: vscode.Diagnostic[] = [];
        const output = [stdout, stderr].filter((value) => value.length > 0).join('\n');
        const re = /^(.*?):(\d+):(\d+)(?:-(\d+))?:\s*(.*?)(?:\s*\[(.+?)\])?$/;

        output.split(/\r?\n/g).forEach((line, _) => {
          if (line.search(re) === -1) {
            return;
          }

          let rex = line.match(re);
          if (!rex) {
            return;
          }

          let filePath = rex[1];
          let resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
          if (isWindows) {
            resolvedPath = resolvedPath.replace(/\\/g, '/');
          }
          let docPath = docUri;
          if (isWindows) {
            docPath = docPath.replace(/\\/g, '/');
          }

          if (path.normalize(resolvedPath) !== path.normalize(docPath)) {
            return;
          }

          let lineNum = Number(rex[2]) - 1;
          let colStart = Number(rex[3]) - 1;
          let colEnd = rex[4] ? Number(rex[4]) - 1 : Number.MAX_VALUE;
          let message = rex[5].trim();
          let ruleName = rex[6] ? rex[6].trim() : '';

          diagnostics.push({
            severity: this.convertToSeverity(message),
            range: new vscode.Range(lineNum, colStart, lineNum, colEnd),
            message: message,
            code: ruleName.length > 0 ? ruleName : 'verible-verilog-lint',
            source: 'verible-verilog-lint',
          });
        });

        this.logger.info(
          `[verible-verilog-lint] ${diagnostics.length} errors/warnings returned`
        );
        this.diagnosticCollection.set(doc.uri, diagnostics);
      }
    );
  }
}
