// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import { splitCommandLineArgs } from '../utils/commandLine';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';

export interface BuildXvlogArgsOptions {
  languageId: string;
  includePaths: string[];
  customArguments: string;
  customArgumentBaseDir?: string;
  documentPath: string;
}

const XVLOG_PATH_OPTIONS = new Set(['-f', '--file', '-prj', '--prj']);

export function resolveXvlogArgumentPaths(args: string[], baseDir: string): string[] {
  const resolved = [...args];
  for (let index = 0; index < resolved.length; index++) {
    const argument = resolved[index];
    if (XVLOG_PATH_OPTIONS.has(argument)) {
      const valueIndex = index + 1;
      if (valueIndex < resolved.length && resolved[valueIndex] !== '') {
        resolved[valueIndex] = resolveArgumentPath(resolved[valueIndex], baseDir);
        index = valueIndex;
      }
      continue;
    }

    for (const option of XVLOG_PATH_OPTIONS) {
      const prefix = `${option}=`;
      if (argument.startsWith(prefix) && argument.length > prefix.length) {
        resolved[index] = `${prefix}${resolveArgumentPath(argument.slice(prefix.length), baseDir)}`;
        break;
      }
    }
  }
  return resolved;
}

function resolveArgumentPath(inputPath: string, baseDir: string): string {
  return path.isAbsolute(inputPath) ? path.normalize(inputPath) : path.resolve(baseDir, inputPath);
}

export function buildXvlogArgs(options: BuildXvlogArgsOptions): string[] {
  const args: string[] = ['-nolog'];
  if (options.languageId === 'systemverilog') {
    args.push('-sv');
  }
  for (const includePath of options.includePaths) {
    args.push('-i', includePath);
  }
  const customArgs = splitCommandLineArgs(options.customArguments);
  args.push(
    ...(options.customArgumentBaseDir
      ? resolveXvlogArgumentPaths(customArgs, options.customArgumentBaseDir)
      : customArgs)
  );
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
    this.config.includePath = configuration.get<string[]>('includePath', []);
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    return convertXvlogSeverity(severityString);
  }

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle): Promise<void> {
    const binPath: string = path.join(this.config.linterInstalledPath, 'xvlog');
    const originalCwd = this.getWorkingDirectory(doc);
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'vscode-verilog-xvlog-')
    );

    try {
      const args = buildXvlogArgs({
        languageId: doc.languageId,
        includePaths: this.resolveIncludePaths(this.config.includePath, doc).map((includePath) =>
          resolveArgumentPath(includePath, originalCwd)
        ),
        customArguments: this.config.arguments,
        customArgumentBaseDir: originalCwd,
        documentPath: resolveArgumentPath(doc.fileName, originalCwd),
      });

      this.logger.info("Executing", { command: binPath, args, cwd: tempDir });
      await this.runXvlog(binPath, args, tempDir, doc, run);
    } finally {
      await this.cleanupTempDir(tempDir);
    }
  }

  private async cleanupTempDir(tempDir: string): Promise<void> {
    try {
      await fs.promises.rm(tempDir, {
        recursive: true,
        force: true,
        // A Windows batch launcher can exit just before its child releases cwd.
        maxRetries: 10,
        retryDelay: 50,
      });
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
      const failed = result.exitCode !== 0 || result.signal !== null;
      if (failed) {
        const status = formatXvlogFailureStatus(result.exitCode, result.signal);
        const detail = firstOutputLine(result.stderr) ?? firstOutputLine(result.stdout);
        this.logger.error('xvlog failed', { status, detail });
        if (diagnostics.length === 0) {
          diagnostics.push(createXvlogFailureDiagnostic(status, detail));
        }
      } else {
        this.logger.info(`${diagnostics.length} errors/warnings returned`);
      }
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
      this.publishDocumentDiagnosticsIfCurrent(doc, run, [
        createXvlogFailureDiagnostic('invocation failed', err instanceof Error ? err.message : String(err)),
      ]);
    }
  }
}

function formatXvlogFailureStatus(
  exitCode: number | null,
  signal: NodeJS.Signals | null
): string {
  if (exitCode !== null) {
    return `exit code ${exitCode}`;
  }
  return signal ? `signal ${signal}` : 'unknown process failure';
}

function firstOutputLine(output: string): string | undefined {
  return output.split(/\r?\n/g).map((line) => line.trim()).find((line) => line !== '');
}

function createXvlogFailureDiagnostic(status: string, detail?: string): vscode.Diagnostic {
  const message = `xvlog failed (${status})${detail ? `: ${detail}` : ''}`;
  return new vscode.Diagnostic(
    new vscode.Range(0, 0, 0, END_OF_LINE),
    message,
    vscode.DiagnosticSeverity.Error
  );
}
