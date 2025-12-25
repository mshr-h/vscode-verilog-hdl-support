// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { LanguageClientOptions, Message } from 'vscode-languageclient/node';

import { buildTclspInitializationOptions } from './tclspOptions';

export type LanguageServerDefinition = {
  name: string;
  defaultPath: string;
  serverArgs: string[];
  serverDebugArgs: string[];
  buildClientOptions: () => LanguageClientOptions;
  applyProcessEnv?: () => void;
};

export function createLanguageServerDefinitions(): LanguageServerDefinition[] {
  return [
    {
      name: 'svls',
      defaultPath: 'svls',
      serverArgs: [],
      serverDebugArgs: ['--debug'],
      buildClientOptions: () => ({
        documentSelector: [{ scheme: 'file', language: 'systemverilog' }],
      }),
      applyProcessEnv: () => {
        // TODO: move to svls extension setting
        let svlint_toml: string | undefined = vscode.workspace
          .getConfiguration('verilog.languageServer.svls')
          .get('svlintTomlPath');
        if (typeof svlint_toml !== undefined) {
          process.env.SVLINT_CONFIG = svlint_toml;
        }
      },
    },
    {
      name: 'veridian',
      defaultPath: 'veridian',
      serverArgs: [],
      serverDebugArgs: [],
      buildClientOptions: () => ({
        documentSelector: [{ scheme: 'file', language: 'systemverilog' }],
      }),
    },
    {
      name: 'hdlChecker',
      defaultPath: 'hdl_checker',
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
      name: 'veribleVerilogLs',
      defaultPath: 'verible-verilog-ls',
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
                const result = message.result as any;
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
      name: 'tclsp',
      defaultPath: 'tclsp',
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
      name: 'rustHdl',
      defaultPath: 'vhdl_ls',
      serverArgs: [],
      serverDebugArgs: [],
      buildClientOptions: () => ({
        documentSelector: [{ scheme: 'file', language: 'vhdl' }],
      }),
    },
  ];
}
