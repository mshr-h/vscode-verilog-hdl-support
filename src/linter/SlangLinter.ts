// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import { convertToWslPath, type WslPathConversionOptions } from '../tools/WslPathConverter';
import { getWorkspaceRootForDocument } from '../utils/workspace';
import type { ProjectService } from '../project/ProjectService';
import { splitCommandLineArgs } from '../utils/commandLine';
import LinterDiagnosticManager, { type DiagnosticMap } from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';
import {
  buildSlangCompileUnitArgs,
  getCompileUnitDefineArgs,
  getCompileUnitIncludePaths,
  getCompileUnitSourcePaths,
} from './CompileUnitLintArgs';
import type { LintRunOptions } from './LintMode';

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
  defineArgs?: string[];
  customArguments: string;
  documentPath: string;
}

export interface ParseSlangDiagnosticsOptions {
  stderr: string;
  documentPath: string;
  isWindows: boolean;
  useWSL: boolean;
  cwd?: string;
  convertToWslPath?: (inputPath: string) => string;
}

export function buildSlangCommand(options: SlangCommandOptions): SlangCommand {
  const joinPath = options.isWindows ? path.win32.join : path.posix.join;
  if (options.isWindows && options.useWSL) {
    return {
      command: joinPath(options.linterInstalledPath, 'wsl'),
      leadingArgs: ['slang'],
    };
  }

  return {
    command: joinPath(options.linterInstalledPath, options.isWindows ? 'slang.exe' : 'slang'),
    leadingArgs: [],
  };
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
  for (const defineArg of options.defineArgs ?? []) {
    args.push('-D', defineArg);
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
  return parseSlangDiagnosticsByFile(options).get(options.documentPath) ?? [];
}

export function parseSlangDiagnosticsByFile(
  options: ParseSlangDiagnosticsOptions
): Map<string, vscode.Diagnostic[]> {
  const diagnostics: vscode.Diagnostic[] = [];
  const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();
  const re = /(.+?):(\d+):(\d+):\s(note|warning|error):\s(.*?)(\[-W(.*)\]|$)/;
  const convertToWslPath = options.convertToWslPath ?? ((inputPath: string) => inputPath);
  const pathApi = options.isWindows && !options.useWSL ? path.win32 : path.posix;

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
    if (options.cwd && !pathApi.isAbsolute(filePath)) {
      filePath = pathApi.resolve(options.cwd, filePath);
      if (options.isWindows && !options.useWSL) {
        filePath = filePath.replace(/\\/g, '/');
      }
    }

    const lineNum = Number(rex[2]) - 1;
    const colNum = Number(rex[3]) - 1;

    const diagnostic = {
      severity: convertSlangSeverity(rex[4]),
      range: new vscode.Range(lineNum, colNum, lineNum, END_OF_LINE),
      message: rex[5].trim(),
      code: rex[7] ? rex[7] : 'error',
      source: 'slang',
    };
    if (options.documentPath.endsWith(filePath)) {
      diagnostics.push(diagnostic);
    }
    const fileDiagnostics = diagnosticsByFile.get(filePath) ?? [];
    fileDiagnostics.push(diagnostic);
    diagnosticsByFile.set(filePath, fileDiagnostics);
  });

  if (diagnostics.length > 0 && !diagnosticsByFile.has(options.documentPath)) {
    diagnosticsByFile.set(options.documentPath, diagnostics);
  }
  return diagnosticsByFile;
}

export default class SlangLinter extends BaseLinter {
  private configuration!: vscode.WorkspaceConfiguration;
  private useWSL!: boolean;

  constructor(
    diagnosticManager: LinterDiagnosticManager,
    runManager: LintRunManager,
    projectService?: ProjectService
  ) {
    super('slang', diagnosticManager, runManager, projectService);
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

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle, options: LintRunOptions): Promise<void> {
    const commandInfo = buildSlangCommand({
      isWindows,
      useWSL: this.useWSL,
      linterInstalledPath: this.config.linterInstalledPath,
    });
    const paths = await this.getRunPaths(
      doc.uri.fsPath,
      getWorkspaceRootForDocument(doc),
      commandInfo.command,
      run
    );
    const decision = await this.getLintDecision(doc, options);
    if (decision.kind === 'skip') {
      this.publishDocumentDiagnosticsIfCurrent(doc, run, []);
      return;
    }
    if (decision.kind === 'compileUnit') {
      const compileUnitPaths = await this.convertCompileUnitPaths(
        getCompileUnitSourcePaths(decision.context),
        commandInfo.command,
        run
      );
      const compileUnitIncludePaths = await this.convertCompileUnitPaths(
        this.resolveIncludePaths(this.config.includePath, doc).concat(getCompileUnitIncludePaths(decision.context)),
        commandInfo.command,
        run
      );
      const args = commandInfo.leadingArgs.concat(
        buildSlangCompileUnitArgs({
          docFolder: paths.docFolder,
          includePaths: compileUnitIncludePaths,
          defineArgs: getCompileUnitDefineArgs(decision.context),
          customArguments: this.config.arguments,
          sourcePaths: compileUnitPaths,
        })
      );
      this.logger.info("Executing compile-unit lint", {
        command: commandInfo.command,
        args,
        cwd: paths.cwd,
        compileUnit: decision.context.compileUnit.id,
      });
      await this.runSlangCompileUnit(commandInfo.command, args, paths.cwd, paths.docUri, doc, run);
      return;
    }
    const args = commandInfo.leadingArgs.concat(
      buildSlangArgs({
        docFolder: paths.docFolder,
        includePaths: this.getConfiguredAndProjectIncludePaths(doc),
        // Argument order is: tool defaults, configured include paths, project include
        // paths/defines, user custom args, document. Custom args stay later so users
        // can override or supplement project context.
        defineArgs: this.getProjectContext(doc).defineArgs,
        customArguments: this.config.arguments,
        documentPath: paths.docUri,
      })
    );

    this.logger.info("Executing", { command: commandInfo.command, args, cwd: paths.cwd });

    await this.runSlang(commandInfo.command, args, paths.cwd, paths.docUri, doc, run);
  }

  private async convertCompileUnitPaths(
    paths: string[],
    wslCommand: string,
    run: LintRunHandle
  ): Promise<string[]> {
    if (!isWindows || !this.useWSL) {
      return isWindows ? paths.map((inputPath) => inputPath.replace(/\\/g, '/')) : paths;
    }
    const conversionOptions: WslPathConversionOptions = {
      cancellationToken: run.cancellationToken,
      wslCommand,
    };
    return Promise.all(paths.map((inputPath) => convertToWslPath(inputPath, conversionOptions)));
  }

  private async getRunPaths(
    documentPath: string,
    workspaceFolder: string | undefined,
    wslCommand: string,
    run: LintRunHandle
  ): Promise<SlangPaths> {
    const dirname = isWindows ? path.win32.dirname : path.dirname;
    const rawDocFolder = dirname(documentPath);
    let docUri = documentPath;
    let docFolder = rawDocFolder;

    if (isWindows) {
      if (this.useWSL) {
        const conversionOptions: WslPathConversionOptions = {
          cancellationToken: run.cancellationToken,
          wslCommand,
        };
        docUri = await convertToWslPath(documentPath, conversionOptions);
        docFolder = await convertToWslPath(rawDocFolder, conversionOptions);
      } else {
        docUri = documentPath.replace(/\\/g, '/');
        docFolder = rawDocFolder.replace(/\\/g, '/');
      }
    }

    const cwd = this.config.runAtFileLocation
      ? isWindows && this.useWSL
        ? rawDocFolder
        : docFolder
      : workspaceFolder ?? docFolder;

    return { docUri, docFolder, cwd };
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
        cwd,
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

  private async runSlangCompileUnit(
    command: string,
    args: string[],
    cwd: string,
    ownerDocumentPath: string,
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
      const diagnosticsByFile = parseSlangDiagnosticsByFile({
        stderr: result.stderr,
        documentPath: ownerDocumentPath,
        isWindows,
        useWSL: this.useWSL,
        cwd,
      });
      const diagnosticsByUri: DiagnosticMap = new Map();
      diagnosticsByFile.forEach((diagnostics, fileName) => {
        const uri = vscode.Uri.file(fileName);
        diagnosticsByUri.set(uri.toString(), { uri, diagnostics });
      });
      this.logger.info`${diagnosticsByUri.size} files with errors/warnings returned`;
      this.publishDiagnosticsIfCurrent(doc, run, diagnosticsByUri);
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
