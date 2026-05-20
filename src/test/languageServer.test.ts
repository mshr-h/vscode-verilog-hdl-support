// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';

import {
  buildSvlsEnv,
  createLanguageServerDefinitions,
  type LanguageServerDefinition,
} from '../languageServer/definitions';
import { initAllLanguageClients, stopAllLanguageClients } from '../languageServer';
import {
  buildLanguageServerArgs,
  buildLanguageServerOptions,
  LanguageServerManager,
} from '../languageServer/manager';

const testDefinition: LanguageServerDefinition = {
  name: 'disabledTestServer',
  defaultPath: 'disabled-test-server',
  serverArgs: ['--stdio'],
  serverDebugArgs: ['--debug'],
  buildClientOptions: () => ({
    documentSelector: [{ scheme: 'file', language: 'systemverilog' }],
  }),
};

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

  test('does not create clients for disabled language servers', () => {
    const manager = new LanguageServerManager([testDefinition]);

    manager.initAll();

    assert.strictEqual((manager as any).languageClients.size, 0);
  });

  test('splits custom language server arguments', () => {
    assert.deepStrictEqual(buildLanguageServerArgs(['--stdio'], '--foo "bar baz"'), [
      '--stdio',
      '--foo',
      'bar baz',
    ]);
  });

  test('builds per-server environment without mutating process env', async () => {
    const config = vscode.workspace.getConfiguration('verilog.languageServer.svls');
    const previousPath = config.get('svlintTomlPath');
    const previousEnv = process.env.SVLINT_CONFIG;

    try {
      process.env.SVLINT_CONFIG = 'host-value';
      await config.update('svlintTomlPath', '', vscode.ConfigurationTarget.Global);
      assert.strictEqual(buildSvlsEnv(), undefined);
      assert.strictEqual(process.env.SVLINT_CONFIG, 'host-value');

      await config.update('svlintTomlPath', '/tmp/custom.svlint.toml', vscode.ConfigurationTarget.Global);
      assert.deepStrictEqual(buildSvlsEnv(), { SVLINT_CONFIG: '/tmp/custom.svlint.toml' });
      assert.strictEqual(process.env.SVLINT_CONFIG, 'host-value');
    } finally {
      await config.update('svlintTomlPath', previousPath, vscode.ConfigurationTarget.Global);
      if (previousEnv === undefined) {
        delete process.env.SVLINT_CONFIG;
      } else {
        process.env.SVLINT_CONFIG = previousEnv;
      }
    }
  });

  test('merges server environment into run and debug process options', () => {
    const options = buildLanguageServerOptions(
      testDefinition,
      'test-language-server',
      '--foo "bar baz"',
      { SVLINT_CONFIG: '/tmp/custom.svlint.toml' }
    ) as any;

    assert.deepStrictEqual(options.run.args, ['--stdio', '--foo', 'bar baz']);
    assert.deepStrictEqual(options.debug.args, ['--debug', '--foo', 'bar baz']);
    assert.strictEqual(options.run.options.env.SVLINT_CONFIG, '/tmp/custom.svlint.toml');
    assert.strictEqual(options.debug.options.env.SVLINT_CONFIG, '/tmp/custom.svlint.toml');
    assert.ok(Object.keys(process.env).every((key) => key in options.run.options.env));
  });
});
