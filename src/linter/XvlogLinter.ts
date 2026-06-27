// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import BaseLinter from './BaseLinter';
import type { ProjectService } from '../project/ProjectService';
import { END_OF_LINE } from '../constants';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import { splitCommandLineArgs } from '../utils/commandLine';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';
import type { LintRunOptions } from './LintMode';

export interface BuildXvlogArgsOptions {
  languageId: string;
  includePaths: string[];
  defineArgs?: string[];
  customArguments: string;
  documentPath: string;
  workLibrary?: string;
}

export function buildXvlogArgs(options: BuildXvlogArgsOptions): string[] {
  const args: string[] = ['-nolog'];
  if (options.languageId === 'systemverilog') {
    args.push('-sv');
  }
  for (const includePath of options.includePaths) {
    args.push('-i', includePath);
  }
  for (const defineArg of options.defineArgs ?? []) {
    args.push('--define', defineArg);
  }
  if (options.workLibrary) {
    args.push('-work', options.workLibrary);
  }
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(options.documentPath);
  return args;
}

export function hasXvlogWorkArgument(customArguments: string): boolean {
  return splitCommandLineArgs(customArguments).some((arg) =>
    arg === '-work' || arg === '--work' || arg.startsWith('-work=') || arg.startsWith('--work=')
  );
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
  constructor(
    diagnosticManager: LinterDiagnosticManager,
    runManager: LintRunManager,
    projectService?: ProjectService
  ) {
    super('xvlog', diagnosticManager, runManager, projectService);
    this.updateConfig();
  }

  protected override updateConfig() {
    const configuration = vscode.workspace.getConfiguration('verilog.linting.xvlog');
    this.config.arguments = configuration.get<string>('arguments', '');
    this.config.includePath = configuration.get<string[]>('includePath', []);
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    return convertXvlogSeverity(severityString);
  }

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle, options: LintRunOptions): Promise<void> {
    this.warnUnsupportedCompileUnitMode(options);
    const binPath: string = path.join(this.config.linterInstalledPath, 'xvlog');
    const cwd = this.getWorkingDirectory(doc);
    const userManagedWorkLibrary = hasXvlogWorkArgument(this.config.arguments);
    const tempDir = userManagedWorkLibrary
      ? undefined
      : fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-verilog-xvlog-'));
    const tempWorkDir = tempDir ? path.join(tempDir, 'work') : undefined;
    if (tempWorkDir) {
      fs.mkdirSync(tempWorkDir, { recursive: true });
    }

    const args = buildXvlogArgs({
      languageId: doc.languageId,
      includePaths: this.getConfiguredAndProjectIncludePaths(doc),
      defineArgs: this.getProjectContext(doc).defineArgs,
      customArguments: this.config.arguments,
      documentPath: doc.fileName,
      workLibrary: tempWorkDir ? `work=${tempWorkDir}` : undefined,
    });

    try {
      this.logger.info("Executing", { command: binPath, args, cwd, tempDir });

      await this.runXvlog(binPath, args, cwd, doc, run);
    } finally {
      if (tempDir) {
        this.cleanupTempDir(tempDir);
      }
    }
  }

  private cleanupTempDir(tempDir: string): void {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      this.logger.warn('Failed to clean xvlog temporary directory', {
        tempDir,
        error: String(err),
      });
    }
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
