// SPDX-License-Identifier: MIT
import { LanguageClientOptions } from 'vscode-languageclient/node';

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
