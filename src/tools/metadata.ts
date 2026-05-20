// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import { Message, type LanguageClientOptions } from 'vscode-languageclient/node';
import { buildTclspInitializationOptions } from '../languageServer/tclspOptions';

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

export const linterSpecs: readonly LinterSpec[] = [
  {
    kind: 'linter',
    id: 'iverilog',
    label: 'iverilog',
    description: 'Icarus Verilog',
    configSection: 'iverilog',
    supportedLanguages: ['verilog', 'systemverilog'],
    versionArgs: ['-V'],
    buildCommand: (ctx) => ({ command: joinConfiguredPath(ctx, 'iverilog'), leadingArgs: [] }),
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

export function getLinterSpec(id: string): LinterSpec | undefined {
  return linterSpecs.find((spec) => spec.id === id);
}

export function getFormatterSpec(id: string): FormatterSpec | undefined {
  return formatterSpecs.find((spec) => spec.id === id);
}

export function getLanguageServerSpec(id: string): LanguageServerSpec | undefined {
  return languageServerSpecs.find((spec) => spec.id === id);
}
