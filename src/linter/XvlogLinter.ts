// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import { splitCommandLineArgs } from './IcarusLinter';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';

export interface BuildXvlogArgsOptions {
  languageId: string;
  includePaths: string[];
  customArguments: string;
  documentPath: string;
}

export function buildXvlogArgs(options: BuildXvlogArgsOptions): string[] {
  const args: string[] = ['-nolog'];
  if (options.languageId === 'systemverilog') {
    args.push('-sv');
  }
  for (const includePath of options.includePaths) {
    args.push('-i', includePath);
  }
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(options.documentPath);
  return args;
}

function convertXvlogSeverity(severityString: string): vscode.DiagnosticSeverity {
  if (severityString === 'ERROR') {
    return vscode.DiagnosticSeverity.Error;
  }
  return vscode.DiagnosticSeverity.Warning;
}

export function parseXvlogDiagnostics(stdout: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  stdout.split(/\r?\n/g).forEach((line) => {
    const match = line.match(
      /^(ERROR|WARNING):\s+\[(VRFC\b[^\]]*)\]\s+(.*\S)\s+\[(.*):(\d+)\]\s*$/
    );
    if (!match) {
      return;
    }

    const lineno = parseInt(match[5]) - 1;

    diagnostics.push({
      severity: convertXvlogSeverity(match[1]),
      code: match[2],
      message: `[${  match[2]  }] ${  match[3]}`,
      range: new vscode.Range(lineno, 0, lineno, END_OF_LINE),
      source: 'xvlog',
    });
  });

  return diagnostics;
}

export default class XvlogLinter extends BaseLinter {
  constructor(diagnosticManager: LinterDiagnosticManager, runManager: LintRunManager) {
    super('xvlog', diagnosticManager, runManager);
    this.updateConfig();
  }

  protected override updateConfig() {
    const configuration = vscode.workspace.getConfiguration('verilog.linting.xvlog');
    this.config.arguments = configuration.get<string>('arguments', '');
    const paths = configuration.get<string[]>('includePath', []);
    this.config.includePath = this.resolveIncludePaths(paths);
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    return convertXvlogSeverity(severityString);
  }

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle): Promise<void> {
    const binPath: string = path.join(this.config.linterInstalledPath, 'xvlog');

    const args = buildXvlogArgs({
      languageId: doc.languageId,
      includePaths: this.config.includePath,
      customArguments: this.config.arguments,
      documentPath: doc.fileName,
    });
    this.logger.warn`${this.config.includePath.join(' ')}`;
    const cwd = this.getWorkingDirectory(doc);

    this.logger.info("Executing", { command: binPath, args, cwd });

    await this.runXvlog(binPath, args, cwd, doc, run);
  }

  private async runXvlog(
    command: string,
    args: string[],
    cwd: string,
    doc: vscode.TextDocument,
    run: LintRunHandle
  ): Promise<void> {
    try {
      const result = await runTool({
        command,
        args,
        cwd,
        collectStdout: true,
        collectStderr: true,
        cancellationToken: run.cancellationToken,
      });
      if (!run.isCurrent()) {
        return;
      }
      const diagnostics = parseXvlogDiagnostics(result.stdout);
      this.logger.info(`${diagnostics.length} errors/warnings returned`);
      this.publishDocumentDiagnosticsIfCurrent(doc, run, diagnostics);
    } catch (err) {
      if (err instanceof ToolRunError && err.reason === 'cancelled') {
        return;
      }
      if (err instanceof ToolRunError) {
        this.logger.error`xvlog failed: ${err.message}`;
      } else {
        this.logger.error`xvlog exception: ${err}`;
      }
      this.publishDocumentDiagnosticsIfCurrent(doc, run, []);
    }
  }
}
