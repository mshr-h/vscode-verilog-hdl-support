// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { LanguageClient, type Executable, type ServerOptions } from 'vscode-languageclient/node';
import { getExtensionLogger } from '../logging';
import { splitCommandLineArgs } from '../utils/commandLine';
import { LanguageServerDefinition } from './definitions';

export function buildLanguageServerArgs(defaultArgs: string[], customArgs?: string): string[] {
  return defaultArgs.concat(splitCommandLineArgs(customArgs ?? ''));
}

function buildExecutable(command: string, args: string[], serverEnv?: NodeJS.ProcessEnv): Executable {
  if (serverEnv && Object.keys(serverEnv).length > 0) {
    return {
      command,
      args,
      options: { env: { ...process.env, ...serverEnv } },
    };
  }
  return { command, args };
}

export function buildLanguageServerOptions(
  definition: LanguageServerDefinition,
  command: string,
  customArgs?: string,
  serverEnv?: NodeJS.ProcessEnv
): ServerOptions {
  return {
    run: buildExecutable(
      command,
      buildLanguageServerArgs(definition.serverArgs, customArgs),
      serverEnv
    ),
    debug: buildExecutable(
      command,
      buildLanguageServerArgs(definition.serverDebugArgs, customArgs),
      serverEnv
    ),
  };
}

export class LanguageServerManager {
  private languageClients = new Map<string, LanguageClient>();
  private readonly logger = getExtensionLogger('LanguageServer', 'Manager');

  constructor(private readonly definitions: LanguageServerDefinition[]) {}

  initAll() {
    this.languageClients.clear();
    for (const definition of this.definitions) {
      this.setupLanguageClient(definition);
    }
  }

  stopAll(): Promise<void[]> {
    const stops: Promise<void>[] = [];
    for (const [name, client] of this.languageClients) {
      if (client.isRunning()) {
        stops.push(client.stop());
        this.logger.info`"${name}" language server stopped.`;
      }
    }
    return Promise.all(stops);
  }

  private setupLanguageClient(definition: LanguageServerDefinition) {
    const settings = vscode.workspace.getConfiguration(
      `verilog.languageServer.${  definition.name}`
    );
    const enabled = settings.get('enabled', false) as boolean;
    if (!enabled) {
      return;
    }

    const binPath = settings.get('path', definition.defaultPath) as string;
    const customArgs = settings.get('arguments') as string | undefined;
    const serverOptions = buildLanguageServerOptions(
      definition,
      binPath,
      customArgs,
      definition.buildEnv?.()
    );

    const client = new LanguageClient(
      definition.name,
      `${definition.name  } language server`,
      serverOptions,
      definition.buildClientOptions()
    );
    this.languageClients.set(definition.name, client);

    client.start();
    this.logger.info`"${definition.name}" language server started.`;
  }
}
