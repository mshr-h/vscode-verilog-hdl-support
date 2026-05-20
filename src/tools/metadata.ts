// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import { Message, type LanguageClientOptions } from 'vscode-languageclient/node';
import { buildTclspInitializationOptions } from '../languageServer/tclspOptions';
import type BaseLinter from '../linter/BaseLinter';
import type { DiagnosticMap } from '../linter/LinterDiagnosticManager';
import type LinterDiagnosticManager from '../linter/LinterDiagnosticManager';
import type LintRunManager from '../linter/LintRunManager';
import type { ToolRunResult } from './ToolRunner';
import {
  buildIcarusArgs,
  buildModelsimArgs,
  buildVeribleVerilogLintArgs,
  buildXvlogArgs,
  convertIcarusSeverity,
  convertModelsimSeverity,
  convertVeribleSeverity,
  convertXvlogSeverity,
  parseIcarusDiagnostics,
  parseModelsimDiagnostics,
  parseVeribleVerilogLintDiagnostics,
  parseXvlogDiagnostics,
} from '../linter/genericLintParsers';

export type ToolKind = 'linter' | 'formatter' | 'languageServer';

export interface ToolCommand {
  command: string;
  leadingArgs: string[];
}

export interface ToolContext {
  isWindows: boolean;
  configuredPath: string;
  useWSL?: boolean;
}

export interface LinterSpec {
  kind: 'linter';
  id: string;
  label: string;
  description: string;
  configSection: string;
  supportedLanguages: string[];
  versionArgs: string[];
  buildCommand: (ctx: ToolContext) => ToolCommand;
}

export interface LinterConfigKeys {
  arguments?: string;
  includePath?: string;
  runAtFileLocation?: string;
  useWSL?: string;
  work?: string;
}

export interface LinterExecutionContext {
  document: vscode.TextDocument;
  config: {
    linterInstalledPath: string;
    arguments: string;
    includePath: string[];
    runAtFileLocation: boolean;
  };
  specificConfig: vscode.WorkspaceConfiguration;
  cwd: string;
  isWindows: boolean;
  cancellationToken?: vscode.CancellationToken;
  resolveIncludePaths: (paths: string[]) => string[];
}

export interface LinterRunInput {
  command: string;
  args: string[];
  cwd: string;
}

export type LinterDiagnosticResult =
  | { kind: 'singleFile'; diagnostics: vscode.Diagnostic[] }
  | { kind: 'multiFile'; diagnosticsByUri: DiagnosticMap };

export interface LinterExecutionSpec extends LinterSpec {
  executionMode: 'generic' | 'custom';
  configKeys: LinterConfigKeys;
  diagnosticMode: 'singleFile' | 'multiFile';
  buildArgs: (ctx: LinterExecutionContext) => string[];
  parseDiagnostics: (
    result: ToolRunResult,
    ctx: LinterExecutionContext,
    runInput: LinterRunInput
  ) => LinterDiagnosticResult | Promise<LinterDiagnosticResult>;
  convertToSeverity?: (severityString: string) => vscode.DiagnosticSeverity;
  createLinter?: (
    diagnosticManager: LinterDiagnosticManager,
    runManager: LintRunManager
  ) => BaseLinter;
}

export interface FormatterSpec {
  kind: 'formatter';
  id: string;
  label: string;
  configSection: string;
  versionArgs: string[];
  defaultExecutable: string;
}

export interface LanguageServerSpec {
  kind: 'languageServer';
  id: string;
  label: string;
  configSection: string;
  defaultExecutable: string;
  versionArgs: string[];
  serverArgs: string[];
  serverDebugArgs: string[];
  buildClientOptions: () => LanguageClientOptions;
  buildEnvironment?: () => NodeJS.ProcessEnv | undefined;
}

function joinConfiguredPath(ctx: ToolContext, executable: string): string {
  const joinPath = ctx.isWindows ? path.win32.join : path.join;
  return joinPath(ctx.configuredPath, executable);
}

export function buildSvlsEnv(): NodeJS.ProcessEnv | undefined {
  const svlintToml: string = vscode.workspace
    .getConfiguration('verilog.languageServer.svls')
    .get('svlintTomlPath', '');
  if (svlintToml === '') {
    return undefined;
  }
  return { SVLINT_CONFIG: svlintToml };
}

function toDiagnosticMap(diagMap: Map<string, vscode.Diagnostic[]>): DiagnosticMap {
  const diagnosticsByUri: DiagnosticMap = new Map();
  for (const [fsPath, diagnostics] of diagMap) {
    const uri = vscode.Uri.file(fsPath);
    diagnosticsByUri.set(uri.toString(), { uri, diagnostics });
  }
  return diagnosticsByUri;
}

export const linterSpecs: readonly LinterExecutionSpec[] = [
  {
    kind: 'linter',
    id: 'iverilog',
    label: 'iverilog',
    description: 'Icarus Verilog',
    configSection: 'iverilog',
    supportedLanguages: ['verilog', 'systemverilog'],
    versionArgs: ['-V'],
    buildCommand: (ctx) => ({ command: joinConfiguredPath(ctx, 'iverilog'), leadingArgs: [] }),
    executionMode: 'generic',
    configKeys: {
      arguments: 'arguments',
      includePath: 'includePath',
      runAtFileLocation: 'runAtFileLocation',
    },
    diagnosticMode: 'multiFile',
    buildArgs: (ctx) =>
      buildIcarusArgs({
        languageId: ctx.document.languageId,
        standards: new Map<string, string>([
          ['verilog', ctx.specificConfig.get('verilogHDL.standard') || ''],
          ['systemverilog', ctx.specificConfig.get('systemVerilog.standard') || ''],
        ]),
        includePaths: ctx.resolveIncludePaths(ctx.config.includePath),
        customArguments: ctx.config.arguments,
        documentPath: ctx.document.uri.fsPath,
      }),
    parseDiagnostics: (result, ctx) => ({
      kind: 'multiFile',
      diagnosticsByUri: toDiagnosticMap(
        parseIcarusDiagnostics(`${result.stderr  }\n${  result.stdout}`, ctx.cwd, ctx.document)
      ),
    }),
    convertToSeverity: convertIcarusSeverity,
  },
  {
    kind: 'linter',
    id: 'xvlog',
    label: 'xvlog',
    description: 'Vivado Logical Simulator',
    configSection: 'xvlog',
    supportedLanguages: ['verilog', 'systemverilog'],
    versionArgs: ['--version'],
    buildCommand: (ctx) => ({ command: joinConfiguredPath(ctx, 'xvlog'), leadingArgs: [] }),
    executionMode: 'generic',
    configKeys: {
      arguments: 'arguments',
      includePath: 'includePath',
    },
    diagnosticMode: 'singleFile',
    buildArgs: (ctx) =>
      buildXvlogArgs({
        languageId: ctx.document.languageId,
        includePaths: ctx.resolveIncludePaths(ctx.config.includePath),
        customArguments: ctx.config.arguments,
        documentPath: ctx.document.fileName,
      }),
    parseDiagnostics: (result) => ({
      kind: 'singleFile',
      diagnostics: parseXvlogDiagnostics(result.stdout),
    }),
    convertToSeverity: convertXvlogSeverity,
  },
  {
    kind: 'linter',
    id: 'modelsim',
    label: 'modelsim',
    description: 'Modelsim',
    configSection: 'modelsim',
    supportedLanguages: ['verilog', 'systemverilog'],
    versionArgs: ['-version'],
    buildCommand: (ctx) => ({ command: joinConfiguredPath(ctx, 'vlog'), leadingArgs: [] }),
    executionMode: 'generic',
    configKeys: {
      arguments: 'arguments',
      runAtFileLocation: 'runAtFileLocation',
      work: 'work',
    },
    diagnosticMode: 'singleFile',
    buildArgs: (ctx) =>
      buildModelsimArgs({
        workLibrary: ctx.specificConfig.get<string>('work', ''),
        customArguments: ctx.config.arguments,
        documentPath: ctx.document.fileName,
      }),
    parseDiagnostics: (result, ctx) => ({
      kind: 'singleFile',
      diagnostics: parseModelsimDiagnostics(result.stdout, ctx.document.fileName),
    }),
    convertToSeverity: convertModelsimSeverity,
  },
  {
    kind: 'linter',
    id: 'verilator',
    label: 'verilator',
    description: 'Verilator',
    configSection: 'verilator',
    supportedLanguages: ['verilog', 'systemverilog'],
    versionArgs: ['--version'],
    buildCommand: (ctx) =>
      ctx.isWindows && ctx.useWSL
        ? { command: joinConfiguredPath(ctx, 'wsl'), leadingArgs: ['verilator'] }
        : {
            command: joinConfiguredPath(ctx, ctx.isWindows ? 'verilator_bin.exe' : 'verilator'),
            leadingArgs: [],
          },
    executionMode: 'custom',
    configKeys: {
      arguments: 'arguments',
      includePath: 'includePath',
      runAtFileLocation: 'runAtFileLocation',
      useWSL: 'useWSL',
    },
    diagnosticMode: 'multiFile',
    buildArgs: () => [],
    parseDiagnostics: () => ({ kind: 'multiFile', diagnosticsByUri: new Map() }),
  },
  {
    kind: 'linter',
    id: 'slang',
    label: 'slang',
    description: 'Slang',
    configSection: 'slang',
    supportedLanguages: ['verilog', 'systemverilog'],
    versionArgs: ['--version'],
    buildCommand: (ctx) =>
      ctx.isWindows && ctx.useWSL
        ? { command: joinConfiguredPath(ctx, 'wsl'), leadingArgs: ['slang'] }
        : {
            command: joinConfiguredPath(ctx, ctx.isWindows ? 'slang.exe' : 'slang'),
            leadingArgs: [],
          },
    executionMode: 'custom',
    configKeys: {
      arguments: 'arguments',
      includePath: 'includePath',
      runAtFileLocation: 'runAtFileLocation',
      useWSL: 'useWSL',
    },
    diagnosticMode: 'singleFile',
    buildArgs: () => [],
    parseDiagnostics: () => ({ kind: 'singleFile', diagnostics: [] }),
  },
  {
    kind: 'linter',
    id: 'verible-verilog-lint',
    label: 'verible-verilog-lint',
    description: 'Verible Verilog Lint',
    configSection: 'veribleVerilogLint',
    supportedLanguages: ['verilog', 'systemverilog'],
    versionArgs: ['--version'],
    buildCommand: (ctx) => ({
      command: joinConfiguredPath(
        ctx,
        ctx.isWindows ? 'verible-verilog-lint.exe' : 'verible-verilog-lint'
      ),
      leadingArgs: [],
    }),
    executionMode: 'generic',
    configKeys: {
      arguments: 'arguments',
      runAtFileLocation: 'runAtFileLocation',
    },
    diagnosticMode: 'singleFile',
    buildArgs: (ctx) =>
      buildVeribleVerilogLintArgs({
        customArguments: ctx.config.arguments,
        documentPath: ctx.document.uri.fsPath,
      }),
    parseDiagnostics: (result, ctx) => ({
      kind: 'singleFile',
      diagnostics: parseVeribleVerilogLintDiagnostics({
        output: [result.stdout, result.stderr].filter((value) => value.length > 0).join('\n'),
        cwd: ctx.cwd,
        documentPath: ctx.document.uri.fsPath,
        isWindows: ctx.isWindows,
      }),
    }),
    convertToSeverity: convertVeribleSeverity,
  },
];

export const formatterSpecs: readonly FormatterSpec[] = [
  {
    kind: 'formatter',
    id: 'verilog-format',
    label: 'verilog-format',
    configSection: 'verilogFormat',
    versionArgs: ['--version'],
    defaultExecutable: 'verilog-format',
  },
  {
    kind: 'formatter',
    id: 'iStyle',
    label: 'iStyle',
    configSection: 'iStyleVerilogFormatter',
    versionArgs: ['--version'],
    defaultExecutable: 'iStyle',
  },
  {
    kind: 'formatter',
    id: 'verible-verilog-format',
    label: 'verible-verilog-format',
    configSection: 'veribleVerilogFormatter',
    versionArgs: ['--version'],
    defaultExecutable: 'verible-verilog-format',
  },
];

export const languageServerSpecs: readonly LanguageServerSpec[] = [
  {
    kind: 'languageServer',
    id: 'svls',
    label: 'svls',
    configSection: 'svls',
    defaultExecutable: 'svls',
    versionArgs: ['--version'],
    serverArgs: [],
    serverDebugArgs: ['--debug'],
    buildClientOptions: () => ({
      documentSelector: [{ scheme: 'file', language: 'systemverilog' }],
    }),
    buildEnvironment: buildSvlsEnv,
  },
  {
    kind: 'languageServer',
    id: 'veridian',
    label: 'veridian',
    configSection: 'veridian',
    defaultExecutable: 'veridian',
    versionArgs: ['--version'],
    serverArgs: [],
    serverDebugArgs: [],
    buildClientOptions: () => ({
      documentSelector: [{ scheme: 'file', language: 'systemverilog' }],
    }),
  },
  {
    kind: 'languageServer',
    id: 'hdlChecker',
    label: 'hdlChecker',
    configSection: 'hdlChecker',
    defaultExecutable: 'hdl_checker',
    versionArgs: ['--version'],
    serverArgs: ['--lsp'],
    serverDebugArgs: ['--lsp'],
    buildClientOptions: () => ({
      documentSelector: [
        { scheme: 'file', language: 'verilog' },
        { scheme: 'file', language: 'systemverilog' },
        { scheme: 'file', language: 'vhdl' },
      ],
    }),
  },
  {
    kind: 'languageServer',
    id: 'veribleVerilogLs',
    label: 'verible-verilog-ls',
    configSection: 'veribleVerilogLs',
    defaultExecutable: 'verible-verilog-ls',
    versionArgs: ['--version'],
    serverArgs: [],
    serverDebugArgs: [],
    buildClientOptions: () => ({
      connectionOptions: {
        messageStrategy: {
          handleMessage: (message, next) => {
            if (
              Message.isResponse(message) &&
              message.result &&
              typeof message.result === 'object' &&
              'capabilities' in message.result
            ) {
              const result = message.result as Record<string, Record<string, unknown>>;
              delete result['capabilities']['diagnosticProvider'];
              delete result['capabilities']['documentFormattingProvider'];
              delete result['capabilities']['documentRangeFormattingProvider'];
            }
            next(message);
          },
        },
      },
      documentSelector: [
        { scheme: 'file', language: 'verilog' },
        { scheme: 'file', language: 'systemverilog' },
      ],
    }),
  },
  {
    kind: 'languageServer',
    id: 'tclsp',
    label: 'tclsp',
    configSection: 'tclsp',
    defaultExecutable: 'tclsp',
    versionArgs: ['--version'],
    serverArgs: [],
    serverDebugArgs: [],
    buildClientOptions: () => ({
      initializationOptions: buildTclspInitializationOptions(),
      documentSelector: [
        { scheme: 'file', language: 'tcl' },
        { scheme: 'file', language: 'sdc' },
        { scheme: 'file', language: 'xdc' },
        { scheme: 'file', language: 'upf' },
      ],
    }),
  },
  {
    kind: 'languageServer',
    id: 'rustHdl',
    label: 'vhdl_ls',
    configSection: 'rustHdl',
    defaultExecutable: 'vhdl_ls',
    versionArgs: ['--version'],
    serverArgs: [],
    serverDebugArgs: [],
    buildClientOptions: () => ({
      documentSelector: [{ scheme: 'file', language: 'vhdl' }],
    }),
  },
];

export function getLinterSpec(id: string): LinterExecutionSpec | undefined {
  return linterSpecs.find((spec) => spec.id === id);
}

export function getFormatterSpec(id: string): FormatterSpec | undefined {
  return formatterSpecs.find((spec) => spec.id === id);
}

export function getLanguageServerSpec(id: string): LanguageServerSpec | undefined {
  return languageServerSpecs.find((spec) => spec.id === id);
}
