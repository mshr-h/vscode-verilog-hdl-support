// SPDX-License-Identifier: MIT
import * as assert from 'assert';

import { createLanguageServerDefinitions } from '../languageServer/definitions';
import { initAllLanguageClients, stopAllLanguageClients } from '../languageServer';
import { buildServerOptions } from '../languageServer/manager';

suite('Language Server smoke', () => {
  test('defines expected servers', () => {
    const names = createLanguageServerDefinitions().map((definition) => definition.name).sort();
    const expected = [
      'rustHdl',
      'tclsp',
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
    initAllLanguageClients();
    await stopAllLanguageClients();
  });

  test('omits empty custom server arguments', () => {
    const definition = createLanguageServerDefinitions().find((server) => server.name === 'tclsp');
    assert.ok(definition);

    const options = buildServerOptions({
      definition,
      command: 'tclsp',
      customArgs: '',
    });

    assert.deepStrictEqual(options.run.args, []);
    assert.deepStrictEqual(options.debug.args, []);
  });

  test('splits custom server arguments', () => {
    const definition = createLanguageServerDefinitions().find((server) => server.name === 'tclsp');
    assert.ok(definition);

    const options = buildServerOptions({
      definition,
      command: 'tclsp',
      customArgs: '--foo bar',
    });

    assert.deepStrictEqual(options.run.args, ['--foo', 'bar']);
    assert.deepStrictEqual(options.debug.args, ['--foo', 'bar']);
  });

  test('preserves quoted custom server argument values', () => {
    const definition = createLanguageServerDefinitions().find(
      (server) => server.name === 'rustHdl'
    );
    assert.ok(definition);

    const options = buildServerOptions({
      definition,
      command: 'vhdl_ls',
      customArgs: '--define "A=B C"',
    });

    assert.deepStrictEqual(options.run.args, ['--define', 'A=B C']);
    assert.deepStrictEqual(options.debug.args, ['--define', 'A=B C']);
  });
});
