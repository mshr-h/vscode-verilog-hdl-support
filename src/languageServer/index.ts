// SPDX-License-Identifier: MIT
import { createLanguageServerDefinitions } from './definitions';
import { LanguageServerManager } from './manager';

let manager: LanguageServerManager | undefined;

export function initAllLanguageClients() {
  if (!manager) {
    manager = new LanguageServerManager(createLanguageServerDefinitions());
  }
  manager.initAll();
}

export function stopAllLanguageClients(): Promise<void[]> {
  if (!manager) {
    return Promise.resolve([]);
  }
  return manager.stopAll();
}
