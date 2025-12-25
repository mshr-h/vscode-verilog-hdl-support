// SPDX-License-Identifier: MIT
import { Logger } from '../logger';
import { createLanguageServerDefinitions } from './definitions';
import { LanguageServerManager } from './manager';

let manager: LanguageServerManager | undefined;

export function initAllLanguageClients(logger: Logger) {
  if (!manager) {
    manager = new LanguageServerManager(logger, createLanguageServerDefinitions());
  }
  manager.initAll();
}

export function stopAllLanguageClients(): Promise<any> {
  if (!manager) {
    return Promise.resolve();
  }
  return manager.stopAll();
}
