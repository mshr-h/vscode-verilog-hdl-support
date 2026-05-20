// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import { ExecutionContext } from '../tools/ExecutionContext';
import { getWorkspaceRootForDocument } from '../utils/workspace';
import { splitCommandLineArgs } from '../utils/commandLine';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';

const isWindows = process.platform === 'win32';

export interface SlangCommandOptions {
  isWindows: boolean;
  useWSL: boolean;
  linterInstalledPath: string;
}

export interface SlangCommand {
  command: string;
  leadingArgs: string[];
}

export interface SlangPathOptions {
  documentPath: string;
  isWindows: boolean;
  useWSL: boolean;
  runAtFileLocation: boolean;
  workspaceFolder?: string;
  convertToWslPath?: (inputPath: string) => string;
}

export interface SlangPaths {
  docUri: string;
  docFolder: string;
  cwd: string;
}

export interface BuildSlangArgsOptions {
  docFolder: string;
  includePaths: string[];
  customArguments: string;
  documentPath: string;
}

export interface ParseSlangDiagnosticsOptions {
  stderr: string;
  documentPath: string;
  isWindows: boolean;
  useWSL: boolean;
  convertToWslPath?: (inputPath: string) => string;
}

export function buildSlangCommand(options: SlangCommandOptions): SlangCommand {
  return new ExecutionContext({
    isWindows: options.isWindows,
    useWSL: options.useWSL,
    linterInstalledPath: options.linterInstalledPath,
    windowsExecutable: 'slang.exe',
    unixExecutable: 'slang',
    runAtFileLocation: false,
  }).buildCommand();
}

export function getSlangPaths(options: SlangPathOptions): SlangPaths {
  const convertToWslPath = options.convertToWslPath ?? ((inputPath: string) => inputPath);
  const dirname = options.isWindows ? path.win32.dirname : path.dirname;
  const rawDocFolder = dirname(options.documentPath);
  const docUri = options.isWindows
    ? options.useWSL
      ? convertToWslPath(options.documentPath)
      : options.documentPath.replace(/\\/g, '/')
    : options.documentPath;
  const docFolder = options.isWindows
    ? options.useWSL
      ? convertToWslPath(rawDocFolder)
      : rawDocFolder.replace(/\\/g, '/')
    : rawDocFolder;

  const cwd = options.runAtFileLocation
    ? options.isWindows && options.useWSL
      ? rawDocFolder
      : docFolder
    : options.workspaceFolder ?? docFolder;

  return { docUri, docFolder, cwd };
}

export function buildSlangArgs(options: BuildSlangArgsOptions): string[] {
  const args: string[] = ['-I', options.docFolder];
  for (const includePath of options.includePaths) {
    args.push('-I', includePath);
  }
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(options.documentPath);
  return args;
}

function convertSlangSeverity(severityString: string): vscode.DiagnosticSeverity {
  if (severityString.startsWith('error')) {
    return vscode.DiagnosticSeverity.Error;
  } else if (severityString.startsWith('warning')) {
    return vscode.DiagnosticSeverity.Warning;
  }
  return vscode.DiagnosticSeverity.Information;
}

export function parseSlangDiagnostics(options: ParseSlangDiagnosticsOptions): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const re = /(.+?):(\d+):(\d+):\s(note|warning|error):\s(.*?)(\[-W(.*)\]|$)/;
  const convertToWslPath = options.convertToWslPath ?? ((inputPath: string) => inputPath);

  options.stderr.split(/\r?\n/g).forEach((line) => {
    const rex = line.match(re);
    if (!rex) {
      return;
    }

    let filePath = rex[1];
    if (options.isWindows) {
      if (options.useWSL) {
        filePath = convertToWslPath(filePath);
      } else {
        filePath = filePath.replace(/\\/g, '/');
      }
    }

    if (!options.documentPath.endsWith(filePath)) {
      return;
    }

    const lineNum = Number(rex[2]) - 1;
    const colNum = Number(rex[3]) - 1;

    diagnostics.push({
      severity: convertSlangSeverity(rex[4]),
      range: new vscode.Range(lineNum, colNum, lineNum, END_OF_LINE),
      message: rex[5],
      code: rex[7] ? rex[7] : 'error',
      source: 'slang',
    });
  });

  return diagnostics;
}

export default class SlangLinter extends BaseLinter {
  private configuration!: vscode.WorkspaceConfiguration;
  private useWSL!: boolean;

  constructor(diagnosticManager: LinterDiagnosticManager, runManager: LintRunManager) {
    super('slang', diagnosticManager, runManager);
    this.updateConfig();
  }

  protected override updateConfig() {
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.slang');
    this.config.arguments = this.configuration.get<string>('arguments', '');
    this.config.includePath = this.configuration.get<string[]>('includePath', []);
    this.config.runAtFileLocation = this.configuration.get<boolean>('runAtFileLocation', false);
    this.useWSL = this.configuration.get<boolean>('useWSL', false);
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    return convertSlangSeverity(severityString);
  }

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle): Promise<void> {
    const context = new ExecutionContext({
      isWindows,
      useWSL: this.useWSL,
      linterInstalledPath: this.config.linterInstalledPath,
      windowsExecutable: 'slang.exe',
      unixExecutable: 'slang',
      runAtFileLocation: this.config.runAtFileLocation,
      workspaceFolder: getWorkspaceRootForDocument(doc),
      cancellationToken: run.cancellationToken,
      cwdMode: 'hostRawForWsl',
    });
    const prepared = await context.prepare({
      documentPath: doc.uri.fsPath,
      includePaths: this.resolveIncludePaths(this.config.includePath, doc),
    });
    const args = prepared.leadingArgs.concat(
      buildSlangArgs({
        docFolder: prepared.documentFolder,
        includePaths: prepared.includePaths,
        customArguments: this.config.arguments,
        documentPath: prepared.documentPath,
      })
    );

    this.logger.info("Executing", { command: prepared.command, args, cwd: prepared.cwd });

    await this.runSlang(prepared.command, args, prepared.cwd, prepared.documentPath, doc, run);
  }

  private async runSlang(
    command: string,
    args: string[],
    cwd: string,
    documentPath: string,
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
      const diagnostics = parseSlangDiagnostics({
        stderr: result.stderr,
        documentPath,
        isWindows,
        useWSL: this.useWSL,
      });
      this.logger.info`${diagnostics.length} errors/warnings returned`;
      this.publishDocumentDiagnosticsIfCurrent(doc, run, diagnostics);
    } catch (err) {
      if (err instanceof ToolRunError && err.reason === 'cancelled') {
        return;
      }
      if (err instanceof ToolRunError) {
        this.logger.error`slang failed: ${err.message}`;
      } else {
        this.logger.error`slang exception: ${err}`;
      }
      this.publishDocumentDiagnosticsIfCurrent(doc, run, []);
    }
  }
}
