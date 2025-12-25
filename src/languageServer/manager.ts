// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { LanguageClient, ServerOptions } from 'vscode-languageclient/node';

import { Logger } from '../logger';
import { LanguageServerDefinition } from './definitions';

export class LanguageServerManager {
  private languageClients = new Map<string, LanguageClient>();

  constructor(
    private readonly logger: Logger,
    private readonly definitions: LanguageServerDefinition[]
  ) {}

  initAll() {
    this.languageClients.clear();
    for (const definition of this.definitions) {
      this.setupLanguageClient(definition);
    }
  }

  stopAll(): Promise<any> {
    const stops = [];
    for (const [name, client] of this.languageClients) {
      if (client.isRunning()) {
        stops.push(client.stop());
        this.logger.info('"' + name + '" language server stopped.');
      }
    }
    return Promise.all(stops);
  }

  private setupLanguageClient(definition: LanguageServerDefinition) {
    const settings = vscode.workspace.getConfiguration(
      'verilog.languageServer.' + definition.name
    );
    const enabled = settings.get('enabled', false) as boolean;
    const binPath = settings.get('path', definition.defaultPath) as string;
    const customArgs = settings.get('arguments') as string | undefined;

    const serverArgs = definition.serverArgs.slice();
    const serverDebugArgs = definition.serverDebugArgs.slice();
    if (customArgs) {
      serverArgs.push(customArgs);
      serverDebugArgs.push(customArgs);
    }

    const serverOptions: ServerOptions = {
      run: { command: binPath, args: serverArgs },
      debug: { command: binPath, args: serverDebugArgs },
    };

    const client = new LanguageClient(
      definition.name,
      definition.name + ' language server',
      serverOptions,
      definition.buildClientOptions()
    );
    this.languageClients.set(definition.name, client);

    if (!enabled) {
      return;
    }

    if (definition.applyProcessEnv) {
      definition.applyProcessEnv();
    }

    client.start();
    this.logger.info('"' + definition.name + '" language server started.');
  }
}
