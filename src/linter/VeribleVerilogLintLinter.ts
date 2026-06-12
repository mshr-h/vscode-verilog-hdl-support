// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import { splitCommandLineArgs } from '../utils/commandLine';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';
import type { LintRunOptions } from './LintMode';

const isWindows = process.platform === 'win32';

export interface BuildVeribleVerilogLintArgsOptions {
  customArguments: string;
  documentPath: string;
}

export interface ParseVeribleVerilogLintDiagnosticsOptions {
  output: string;
  cwd: string;
  documentPath: string;
  isWindows: boolean;
}

export function buildVeribleVerilogLintArgs(
  options: BuildVeribleVerilogLintArgsOptions
): string[] {
  return [...splitCommandLineArgs(options.customArguments), options.documentPath];
}

function convertVeribleSeverity(message: string): vscode.DiagnosticSeverity {
  const lower = message.toLowerCase();
  if (lower.includes('error') || lower.includes('fatal') || lower.includes('syntax')) {
    return vscode.DiagnosticSeverity.Error;
  }
  if (lower.includes('warning')) {
    return vscode.DiagnosticSeverity.Warning;
  }
  return vscode.DiagnosticSeverity.Warning;
}

export function parseVeribleVerilogLintDiagnostics(
  options: ParseVeribleVerilogLintDiagnosticsOptions
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const re = /^(.*?):(\d+):(\d+)(?:-(\d+))?:\s*(.*?)(?:\s*\[(.+?)\])?$/;
  let docPath = options.documentPath;
  if (options.isWindows) {
    docPath = docPath.replace(/\\/g, '/');
  }

  options.output.split(/\r?\n/g).forEach((line) => {
    const rex = line.match(re);
    if (!rex) {
      return;
    }

    const filePath = rex[1];
    let resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(options.cwd, filePath);
    if (options.isWindows) {
      resolvedPath = resolvedPath.replace(/\\/g, '/');
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
      severity: convertVeribleSeverity(message),
      range: new vscode.Range(lineNum, colStart, lineNum, colEnd),
      message,
      code: ruleName.length > 0 ? ruleName : 'verible-verilog-lint',
      source: 'verible-verilog-lint',
    });
  });

  return diagnostics;
}

export default class VeribleVerilogLintLinter extends BaseLinter {
  constructor(diagnosticManager: LinterDiagnosticManager, runManager: LintRunManager) {
    super('verible-verilog-lint', diagnosticManager, runManager);
    this.updateConfig();
  }

  protected override updateConfig() {
    const configuration = vscode.workspace.getConfiguration('verilog.linting.veribleVerilogLint');
    this.config.arguments = configuration.get<string>('arguments', '');
    this.config.runAtFileLocation = configuration.get<boolean>('runAtFileLocation', false);
  }

  protected convertToSeverity(message: string): vscode.DiagnosticSeverity {
    return convertVeribleSeverity(message);
  }

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle, options: LintRunOptions): Promise<void> {
    this.warnUnsupportedCompileUnitMode(options);
    this.logger.info`Executing VeribleVerilogLintLinter.lint()`;

    const binName = isWindows ? 'verible-verilog-lint.exe' : 'verible-verilog-lint';
    const binPath: string = path.join(this.config.linterInstalledPath, binName);
    this.logger.info`verible-verilog-lint binary path: ${binPath}`;
    const docUri: string = doc.uri.fsPath;
    const cwd: string = this.getWorkingDirectory(doc);

    const args = buildVeribleVerilogLintArgs({
      customArguments: this.config.arguments,
      documentPath: docUri,
    });

    this.logger.info("Executing", { command: binPath, args, cwd });

    await this.runVeribleVerilogLint(binPath, args, cwd, doc, run);
  }

  private async runVeribleVerilogLint(
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
      const output = [result.stdout, result.stderr].filter((value) => value.length > 0).join('\n');
      const diagnostics = parseVeribleVerilogLintDiagnostics({
        output,
        cwd,
        documentPath: doc.uri.fsPath,
        isWindows,
      });
      this.logger.info`${diagnostics.length} errors/warnings returned`;
      this.publishDocumentDiagnosticsIfCurrent(doc, run, diagnostics);
    } catch (err) {
      if (err instanceof ToolRunError && err.reason === 'cancelled') {
        return;
      }
      if (err instanceof ToolRunError) {
        this.logger.error`verible-verilog-lint failed: ${err.message}`;
      } else {
        this.logger.error`verible-verilog-lint exception: ${err}`;
      }
      this.publishDocumentDiagnosticsIfCurrent(doc, run, []);
    }
  }
}
