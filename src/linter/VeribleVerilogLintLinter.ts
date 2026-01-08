// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { Logger } from '../logger';
import { END_OF_LINE } from '../constants';

const isWindows = process.platform === 'win32';

export default class VeribleVerilogLintLinter extends BaseLinter {
  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: Logger) {
    super('verible-verilog-lint', diagnosticCollection, logger);
    this.updateConfig();
  }

  protected override updateConfig() {
    const configuration = vscode.workspace.getConfiguration('verilog.linting.veribleVerilogLint');
    this.config.arguments = configuration.get<string>('arguments', '');
    this.config.runAtFileLocation = configuration.get<boolean>('runAtFileLocation', false);
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

    const binName = isWindows ? 'verible-verilog-lint.exe' : 'verible-verilog-lint';
    const binPath: string = path.join(this.config.linterInstalledPath, binName);
    this.logger.info(`verible-verilog-lint binary path: ${  binPath}`);

    const docUri: string = doc.uri.fsPath;
    const cwd: string = this.getWorkingDirectory(doc);

    const args: string[] = [];
    args.push(this.config.arguments);
    args.push(`"${docUri}"`);

    const command: string = `${binPath  } ${  args.join(' ')}`;

    this.logger.info('[verible-verilog-lint] Execute');
    this.logger.info(`[verible-verilog-lint]   command: ${  command}`);
    this.logger.info(`[verible-verilog-lint]   cwd    : ${  cwd}`);

    const _: child.ChildProcess = child.exec(
      command,
      { cwd },
      (_error: child.ExecException | null, stdout: string, stderr: string) => {
        const diagnostics: vscode.Diagnostic[] = [];
        const output = [stdout, stderr].filter((value) => value.length > 0).join('\n');
        const re = /^(.*?):(\d+):(\d+)(?:-(\d+))?:\s*(.*?)(?:\s*\[(.+?)\])?$/;

        output.split(/\r?\n/g).forEach((line, _) => {
          if (line.search(re) === -1) {
            return;
          }

          const rex = line.match(re);
          if (!rex) {
            return;
          }

          const filePath = rex[1];
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

          const lineNum = Number(rex[2]) - 1;
          const colStart = Number(rex[3]) - 1;
          const colEnd = rex[4] ? Number(rex[4]) - 1 : END_OF_LINE;
          const message = rex[5].trim();
          const ruleName = rex[6] ? rex[6].trim() : '';

          diagnostics.push({
            severity: this.convertToSeverity(message),
            range: new vscode.Range(lineNum, colStart, lineNum, colEnd),
            message,
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
