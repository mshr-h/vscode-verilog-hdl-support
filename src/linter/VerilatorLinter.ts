// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import * as process from 'process';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import {
  convertFromWslPath,
  convertToWslPath,
  type WslPathConversionOptions,
} from '../tools/WslPathConverter';
import { getWorkspaceRootForDocument } from '../utils/workspace';
import type { ProjectService } from '../project/ProjectService';
import { splitCommandLineArgs } from '../utils/commandLine';
import LinterDiagnosticManager, { type DiagnosticMap } from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';

const isWindows = process.platform === 'win32';

export interface VerilatorCommandOptions {
  isWindows: boolean;
  useWSL: boolean;
  linterInstalledPath: string;
}

export interface VerilatorCommand {
  command: string;
  leadingArgs: string[];
}

export interface VerilatorPathOptions {
  documentPath: string;
  isWindows: boolean;
  useWSL: boolean;
  runAtFileLocation: boolean;
  workspaceFolder?: string;
  convertToWslPath?: (inputPath: string) => string;
}

export interface VerilatorPaths {
  docUri: string;
  docFolder: string;
  cwd: string;
}

export interface BuildVerilatorArgsOptions {
  languageId: string;
  docFolder: string;
  includePaths: string[];
  defineArgs?: string[];
  customArguments: string;
  documentPath: string;
}

export interface BuildVerilatorRunInputsOptions {
  documentPath: string;
  languageId: string;
  isWindows: boolean;
  useWSL: boolean;
  runAtFileLocation: boolean;
  workspaceFolder?: string;
  linterInstalledPath: string;
  includePaths: string[];
  defineArgs?: string[];
  customArguments: string;
  cancellationToken?: vscode.CancellationToken;
  convertToWslPathFn?: typeof convertToWslPath;
}

export interface VerilatorRunInputs {
  command: string;
  args: string[];
  cwd: string;
}

export interface ParseVerilatorDiagnosticsOptions {
  stderr: string;
  isWindows: boolean;
  useWSL: boolean;
  onPassthrough?: (severity: 'Error' | 'Warning', line: string) => void;
}

export interface ConvertDiagnosticPathsFromWslOptions {
  cancellationToken?: vscode.CancellationToken;
  wslCommand?: string;
  convertFromWslPathFn?: typeof convertFromWslPath;
}

export function buildVerilatorCommand(options: VerilatorCommandOptions): VerilatorCommand {
  const joinPath = options.isWindows ? path.win32.join : path.join;
  if (options.isWindows && options.useWSL) {
    return {
      command: joinPath(options.linterInstalledPath, 'wsl'),
      leadingArgs: ['verilator'],
    };
  }

  const executable = options.isWindows ? 'verilator_bin.exe' : 'verilator';
  return {
    command: joinPath(options.linterInstalledPath, executable),
    leadingArgs: [],
  };
}

export function getVerilatorPaths(options: VerilatorPathOptions): VerilatorPaths {
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

  // Preserve the previous Windows/WSL cwd behavior. Generated Verilator paths are
  // converted for args, while cwd stays in the host VS Code filesystem.
  const cwd = options.runAtFileLocation
    ? options.isWindows
      ? dirname(options.documentPath.replace(/\\/g, '/'))
      : docFolder
    : options.workspaceFolder ?? docFolder;

  return { docUri, docFolder, cwd };
}

export function buildVerilatorArgs(options: BuildVerilatorArgsOptions): string[] {
  const args: string[] = [];
  if (options.languageId === 'systemverilog') {
    args.push('-sv');
  }
  args.push('--lint-only');
  args.push(`-I${options.docFolder}`);
  args.push(...options.includePaths.map((includePath) => `-I${includePath}`));
  args.push(...(options.defineArgs ?? []).map((defineArg) => `-D${defineArg}`));
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(options.documentPath);
  return args;
}

export async function buildVerilatorRunInputs(
  options: BuildVerilatorRunInputsOptions
): Promise<VerilatorRunInputs> {
  const commandInfo = buildVerilatorCommand({
    isWindows: options.isWindows,
    useWSL: options.useWSL,
    linterInstalledPath: options.linterInstalledPath,
  });
  const dirname = options.isWindows ? path.win32.dirname : path.dirname;
  const rawDocFolder = dirname(options.documentPath);
  let docUri = options.documentPath;
  let docFolder = rawDocFolder;
  let includePaths = options.includePaths;

  if (options.isWindows) {
    if (options.useWSL) {
      const convert = options.convertToWslPathFn ?? convertToWslPath;
      const conversionOptions: WslPathConversionOptions = {
        cancellationToken: options.cancellationToken,
        wslCommand: commandInfo.command,
      };
      docUri = await convert(options.documentPath, conversionOptions);
      docFolder = await convert(rawDocFolder, conversionOptions);
      includePaths = await Promise.all(
        options.includePaths.map((includePath) => convert(includePath, conversionOptions))
      );
    } else {
      docUri = options.documentPath.replace(/\\/g, '/');
      docFolder = rawDocFolder.replace(/\\/g, '/');
    }
  }

  // Preserve the previous Windows/WSL cwd behavior. Generated Verilator paths are
  // converted for args, while cwd stays in the host VS Code filesystem.
  const cwd = options.runAtFileLocation
    ? options.isWindows
      ? dirname(options.documentPath.replace(/\\/g, '/'))
      : docFolder
    : options.workspaceFolder ?? docFolder;

  const args = commandInfo.leadingArgs.concat(
      buildVerilatorArgs({
        languageId: options.languageId,
        docFolder,
        includePaths,
        defineArgs: options.defineArgs,
        customArguments: options.customArguments,
        documentPath: docUri,
    })
  );

  return { command: commandInfo.command, args, cwd };
}

function convertVerilatorSeverity(severityString: string): vscode.DiagnosticSeverity {
  if (severityString.startsWith('Error')) {
    return vscode.DiagnosticSeverity.Error;
  } else if (severityString.startsWith('Warning')) {
    return vscode.DiagnosticSeverity.Warning;
  }
  return vscode.DiagnosticSeverity.Information;
}

function normalizeVerilatorCode(code: string | undefined): string | undefined {
  if (code === 'WIDTHTRUNC' || code === 'WIDTHEXPAND') {
    return 'WIDTH';
  }
  return code;
}

export function parseVerilatorDiagnostics(
  options: ParseVerilatorDiagnosticsOptions
): Map<string, vscode.Diagnostic[]> {
  // basically DiagnosticsCollection but with ability to append diag lists
  const filesDiag = new Map<string, vscode.Diagnostic[]>();
  const errorParserRegex = new RegExp(
    /%(?<severity>\w+)/.source + // matches "%Warning" or "%Error"

    // this matches errorcode with "-" before it, but the "-" doesn't go into ErrorCode match group
    /(-(?<errorCode>[A-Z0-9]+))?/.source + // matches error code like -PINNOTFOUND

    /: /.source + // ": " before file path or error message

    // note: end of file path is detected using file extension at the end of it.
    // This also allows spaces in paths.
    /((?<filePath>(\S| )+(?<fileExtension>(\.svh)|(\.sv)|(\.SV)|(\.vh)|(\.vl)|(\.v))):((?<lineNumber>\d+):)?((?<columnNumber>\d+):)? )?/.source +

    // matches error message produced by Verilator
    /(?<verboseError>.*)/.source
  );
  const stderrLines = options.stderr.split(/\r?\n/g);

  stderrLines.forEach((line, lineIndex) => {
    // if lineIndex is 0 and it doesn't start with %Error or %Warning,
    // the whole loop would skip and it is probably a system error.
    let lastDiagMessageType: 'Error' | 'Warning' = "Error";

    // parsing previous lines for message type; shouldn't be more than 5 or so
    for (let prevLineIndex = lineIndex; prevLineIndex >= 0; prevLineIndex--) {
      if (stderrLines[prevLineIndex].startsWith("%Error")) {
        lastDiagMessageType = "Error";
        break;
      }
      if (stderrLines[prevLineIndex].startsWith("%Warning")) {
        lastDiagMessageType = "Warning";
        break;
      }
    }

    // Remove superfluous NUL from line head
    while (line.startsWith('\0')) {
      line = line.slice(1);
    }

    if (!line.startsWith('%')) {
      if (line !== '') {
        options.onPassthrough?.(lastDiagMessageType, line);
      }
      return;
    }

    const rex = errorParserRegex.exec(line);

    // Check if rex or rex.groups is undefined
    if (!rex || !rex.groups) {
      return;
    }

    // vscode problems are tied to files; if there isn't a file name, no point going further
    let filePath = rex.groups["filePath"];
    if (!filePath) {
      return;
    }

    // replacing "\\" and "\" with "/" for consistency
    if (options.isWindows) {
      filePath = filePath.replace(/(\\\\)|(\\)/g, "/");
    }

    // if there isn't a list of errors for this file already, it needs to be created
    if (!filesDiag.has(filePath)) {
      filesDiag.set(filePath, []);
    }

    const lineNum = Number(rex.groups["lineNumber"]) - 1;
    let colNum = Number(rex.groups["columnNumber"]) - 1;

    colNum = isNaN(colNum) ? 0 : colNum; // for older Verilator versions (< 4.030 ~ish)

    if (!isNaN(lineNum)) {
      // appending diagnostic message to an array of messages tied to a file
      filesDiag.get(filePath)?.push({
        severity: convertVerilatorSeverity(rex.groups["severity"]),
        range: new vscode.Range(lineNum, colNum, lineNum, END_OF_LINE),
        message: rex.groups["verboseError"],
        code: normalizeVerilatorCode(rex.groups["errorCode"]),
        source: 'verilator',
      });
    }
  });

  return filesDiag;
}

export async function convertDiagnosticPathsFromWsl(
  filesDiag: Map<string, vscode.Diagnostic[]>,
  options: ConvertDiagnosticPathsFromWslOptions = {}
): Promise<Map<string, vscode.Diagnostic[]>> {
  const convert = options.convertFromWslPathFn ?? convertFromWslPath;
  const convertedPathBySource = new Map<string, string>();
  const conversionOptions: WslPathConversionOptions = {
    cancellationToken: options.cancellationToken,
    wslCommand: options.wslCommand,
  };

  for (const filePath of filesDiag.keys()) {
    convertedPathBySource.set(filePath, await convert(filePath, conversionOptions));
  }

  const convertedDiag = new Map<string, vscode.Diagnostic[]>();
  for (const [filePath, diagnostics] of filesDiag) {
    const convertedPath = convertedPathBySource.get(filePath) ?? filePath;
    const existingDiagnostics = convertedDiag.get(convertedPath) ?? [];
    convertedDiag.set(convertedPath, existingDiagnostics.concat(diagnostics));
  }

  return convertedDiag;
}

export default class VerilatorLinter extends BaseLinter {
  private configuration!: vscode.WorkspaceConfiguration;
  private useWSL!: boolean;

  constructor(
    diagnosticManager: LinterDiagnosticManager,
    runManager: LintRunManager,
    projectService?: ProjectService
  ) {
    super('verilator', diagnosticManager, runManager, projectService);
    this.updateConfig();
  }

  protected override updateConfig() {
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.verilator');
    this.config.arguments = this.configuration.get<string>('arguments', '');
    this.config.includePath = this.configuration.get<string[]>('includePath', []);
    this.config.runAtFileLocation = this.configuration.get<boolean>('runAtFileLocation', false);
    this.useWSL = this.configuration.get<boolean>('useWSL', false);
  }

  protected splitTerms(line: string) {
    const terms = line.split(':');

    for (let i = 0; i < terms.length; i++) {
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
    return convertVerilatorSeverity(severityString);
  }

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle): Promise<void> {
    try {
      const inputs = await buildVerilatorRunInputs({
        documentPath: doc.uri.fsPath,
        languageId: doc.languageId,
        isWindows,
        useWSL: this.useWSL,
        runAtFileLocation: this.config.runAtFileLocation,
        workspaceFolder: getWorkspaceRootForDocument(doc),
        linterInstalledPath: this.config.linterInstalledPath,
        includePaths: this.getConfiguredAndProjectIncludePaths(doc),
        defineArgs: this.getProjectContext(doc).defineArgs,
        customArguments: this.config.arguments,
        cancellationToken: run.cancellationToken,
      });
      if (!run.isCurrent()) {
        return;
      }

      this.logger.info("Executing", { command: inputs.command, args: inputs.args, cwd: inputs.cwd });

      await this.runVerilator(inputs.command, inputs.args, inputs.cwd, doc, run);
    } catch (err) {
      this.handleVerilatorFailure(err, doc, run);
    }
  }

  private async runVerilator(
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
      const filesDiag = parseVerilatorDiagnostics({
        stderr: result.stderr,
        isWindows,
        useWSL: this.useWSL,
        onPassthrough: (severity, line) => {
          if (severity === 'Warning') {
            this.logger.warn`${line}`;
          } else {
            this.logger.error`${line}`;
          }
        },
      });

      const resolvedFilesDiag =
        isWindows && this.useWSL
          ? await convertDiagnosticPathsFromWsl(filesDiag, {
              cancellationToken: run.cancellationToken,
              wslCommand: command,
            })
          : filesDiag;
      if (!run.isCurrent()) {
        return;
      }

      this.replaceDiagnostics(doc, run, resolvedFilesDiag);
    } catch (err) {
      this.handleVerilatorFailure(err, doc, run);
    }
  }

  private handleVerilatorFailure(
    err: unknown,
    doc: vscode.TextDocument,
    run: LintRunHandle
  ): void {
    if (err instanceof ToolRunError && err.reason === 'cancelled') {
      return;
    }
    if (err instanceof ToolRunError) {
      this.logger.error`verilator failed: ${err.message}`;
    } else {
      this.logger.error`verilator exception: ${err}`;
    }
    this.replaceDiagnostics(doc, run, new Map<string, vscode.Diagnostic[]>());
  }

  private replaceDiagnostics(
    doc: vscode.TextDocument,
    run: LintRunHandle,
    filesDiag: Map<string, vscode.Diagnostic[]>
  ): void {
    const diagnosticsByUri: DiagnosticMap = new Map();
    filesDiag.forEach((issuesArray, fileName) => {
      const fileURI = vscode.Uri.file(fileName);
      diagnosticsByUri.set(fileURI.toString(), { uri: fileURI, diagnostics: issuesArray });
    });
    this.publishDiagnosticsIfCurrent(doc, run, diagnosticsByUri);
  }
}
