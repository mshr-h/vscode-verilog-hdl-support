// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import {
  LanguageClient,
  type InitializeParams,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';
import { getExtensionLogger } from '../logging';
import { splitCommandLineArgs } from '../utils/commandLine';
import { LanguageServerDefinition } from './definitions';

export interface BuildServerOptionsInput {
  definition: Pick<LanguageServerDefinition, 'serverArgs' | 'serverDebugArgs'>;
  command: string;
  customArgs?: string;
}

export interface BuiltServerOptions {
  run: { command: string; args: string[] };
  debug: { command: string; args: string[] };
}

export function buildServerOptions(input: BuildServerOptionsInput): BuiltServerOptions {
  const customArgs = input.customArgs ? splitCommandLineArgs(input.customArgs) : [];
  return {
    run: { command: input.command, args: input.definition.serverArgs.concat(customArgs) },
    debug: { command: input.command, args: input.definition.serverDebugArgs.concat(customArgs) },
  };
}

class SanitizingLanguageClient extends LanguageClient {
  constructor(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: LanguageClientOptions,
    private readonly sanitizeInitializeParams: (params: InitializeParams) => void
  ) {
    super(id, name, serverOptions, clientOptions);
  }

  protected fillInitializeParams(params: InitializeParams): void {
    super.fillInitializeParams(params);
    this.sanitizeInitializeParams(params);
  }
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
    const binPath = settings.get('path', definition.defaultPath) as string;
    const customArgs = settings.get('arguments') as string | undefined;

    const serverOptions = buildServerOptions({ definition, command: binPath, customArgs });

    const client = createLanguageClient(definition, serverOptions);
    this.languageClients.set(definition.name, client);

    if (!enabled) {
      return;
    }

    if (definition.applyProcessEnv) {
      definition.applyProcessEnv();
    }

    client.start();
    this.logger.info`"${definition.name}" language server started.`;
  }
}

function createLanguageClient(
  definition: LanguageServerDefinition,
  serverOptions: ServerOptions
): LanguageClient {
  const name = `${definition.name  } language server`;
  const clientOptions = definition.buildClientOptions();
  if (definition.sanitizeInitializeParams) {
    return new SanitizingLanguageClient(
      definition.name,
      name,
      serverOptions,
      clientOptions,
      definition.sanitizeInitializeParams
    );
  }
  return new LanguageClient(definition.name, name, serverOptions, clientOptions);
}
