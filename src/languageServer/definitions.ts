// SPDX-License-Identifier: MIT
import { type LanguageClientOptions } from 'vscode-languageclient/node';
import {
  buildSvlsEnv,
  languageServerSpecs,
  type LanguageServerSpec,
} from '../tools/metadata';

export type LanguageServerDefinition = {
  name: string;
  defaultPath: string;
  serverArgs: string[];
  serverDebugArgs: string[];
  buildClientOptions: () => LanguageClientOptions;
  buildEnv?: () => NodeJS.ProcessEnv | undefined;
};

function toLanguageServerDefinition(spec: LanguageServerSpec): LanguageServerDefinition {
  return {
    name: spec.id,
    defaultPath: spec.defaultExecutable,
    serverArgs: spec.serverArgs,
    serverDebugArgs: spec.serverDebugArgs,
    buildClientOptions: spec.buildClientOptions,
    buildEnv: spec.buildEnvironment,
  };
}

export function createLanguageServerDefinitions(): LanguageServerDefinition[] {
  return languageServerSpecs.map(toLanguageServerDefinition);
}

export { buildSvlsEnv };
