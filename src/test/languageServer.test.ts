// SPDX-License-Identifier: MIT
import * as assert from 'assert';

import { createLanguageServerDefinitions } from '../languageServer/definitions';
import { initAllLanguageClients, stopAllLanguageClients } from '../languageServer';
import { buildServerOptions } from '../languageServer/manager';

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
    initAllLanguageClients();
    await stopAllLanguageClients();
  });

  test('omits empty custom server arguments', () => {
    const definition = createLanguageServerDefinitions().find((server) => server.name === 'svls');
    assert.ok(definition);

    const options = buildServerOptions({
      definition,
      command: 'svls',
      customArgs: '',
    });

    assert.deepStrictEqual(options.run.args, []);
    assert.deepStrictEqual(options.debug.args, ['--debug']);
  });

  test('splits custom server arguments', () => {
    const definition = createLanguageServerDefinitions().find((server) => server.name === 'svls');
    assert.ok(definition);

    const options = buildServerOptions({
      definition,
      command: 'svls',
      customArgs: '--foo bar',
    });

    assert.deepStrictEqual(options.run.args, ['--foo', 'bar']);
    assert.deepStrictEqual(options.debug.args, ['--debug', '--foo', 'bar']);
  });

  test('preserves quoted custom server argument values', () => {
    const definition = createLanguageServerDefinitions().find(
      (server) => server.name === 'hdlChecker'
    );
    assert.ok(definition);

    const options = buildServerOptions({
      definition,
      command: 'hdl_checker',
      customArgs: '--define "A=B C"',
    });

    assert.deepStrictEqual(options.run.args, ['--lsp', '--define', 'A=B C']);
    assert.deepStrictEqual(options.debug.args, ['--lsp', '--define', 'A=B C']);
  });
});
