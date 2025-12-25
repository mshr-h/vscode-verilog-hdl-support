// SPDX-License-Identifier: MIT
import * as assert from 'assert';

import { createLogger } from '../logger';
import { createLanguageServerDefinitions } from '../languageServer/definitions';
import { initAllLanguageClients, stopAllLanguageClients } from '../languageServer';

suite('Language Server smoke', () => {
  test('defines expected servers', () => {
    const names = createLanguageServerDefinitions().map((definition) => definition.name).sort();
    const expected = [
      'hdlChecker',
      'rustHdl',
      'svls',
      'tclsp',
      'veribleVerilogLs',
      'veridian',
    ].sort();
    assert.deepStrictEqual(names, expected);
  });

  test('builds client options for all servers', () => {
    const definitions = createLanguageServerDefinitions();
    for (const definition of definitions) {
      const options = definition.buildClientOptions();
      assert.ok(options, `Expected client options for ${definition.name}`);
      assert.ok(
        Array.isArray(options.documentSelector),
        `Expected documentSelector for ${definition.name}`
      );
    }
  });

  test('initializes and stops without enabled servers', async () => {
    const logger = createLogger('Verilog-LS-Test');
    initAllLanguageClients(logger);
    await stopAllLanguageClients();
  });
});
