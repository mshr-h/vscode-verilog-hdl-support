// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import type { InitializeParams } from 'vscode-languageclient/node';

import { createLanguageServerDefinitions } from '../languageServer/definitions';
import { initAllLanguageClients, stopAllLanguageClients } from '../languageServer';
import { buildServerOptions } from '../languageServer/manager';
import { sanitizeSlangServerInitializeParams } from '../languageServer/slangServerCompatibility';

suite('Language Server smoke', () => {
  test('defines expected servers', () => {
    const names = createLanguageServerDefinitions().map((definition) => definition.name).sort();
    const expected = [
      'hdlChecker',
      'rustHdl',
      'slangServer',
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

  test('slang-server handles SystemVerilog documents', () => {
    const definition = createLanguageServerDefinitions().find(
      (server) => server.name === 'slangServer'
    );
    assert.ok(definition);

    const selector = definition.buildClientOptions().documentSelector;

    assert.deepStrictEqual(selector, [{ scheme: 'file', language: 'systemverilog' }]);
  });

  test('only slang-server has an initialize params sanitizer', () => {
    const definitions = createLanguageServerDefinitions();
    const slangServer = definitions.find((server) => server.name === 'slangServer');

    assert.strictEqual(typeof slangServer?.sanitizeInitializeParams, 'function');
    assert.ok(
      definitions
        .filter((server) => server.name !== 'slangServer')
        .every((server) => server.sanitizeInitializeParams === undefined)
    );
  });

  test('slang-server sanitizer removes unsupported refactor.move code action kind', () => {
    const params = initializeParamsWithCodeActionKinds([
      '',
      'quickfix',
      'refactor.move',
      'refactor.extract',
      'source',
    ]);

    sanitizeSlangServerInitializeParams(params);

    assert.deepStrictEqual(getCodeActionKindValueSet(params), [
      '',
      'quickfix',
      'refactor.extract',
      'source',
    ]);
  });

  test('slang-server sanitizer tolerates missing or malformed code action capabilities', () => {
    const malformedParams = [
      { capabilities: {} },
      { capabilities: { textDocument: {} } },
      { capabilities: { textDocument: { codeAction: 'unsupported-shape' } } },
      {
        capabilities: {
          textDocument: {
            codeAction: {
              codeActionLiteralSupport: {
                codeActionKind: {
                  valueSet: 'unsupported-shape',
                },
              },
            },
          },
        },
      },
    ] as unknown as InitializeParams[];

    for (const params of malformedParams) {
      assert.doesNotThrow(() => sanitizeSlangServerInitializeParams(params));
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

function initializeParamsWithCodeActionKinds(valueSet: string[]): InitializeParams {
  return {
    capabilities: {
      textDocument: {
        codeAction: {
          codeActionLiteralSupport: {
            codeActionKind: {
              valueSet,
            },
          },
        },
      },
    },
  } as unknown as InitializeParams;
}

function getCodeActionKindValueSet(params: InitializeParams): unknown {
  const capabilities = params.capabilities as unknown as {
    textDocument?: {
      codeAction?: {
        codeActionLiteralSupport?: {
          codeActionKind?: {
            valueSet?: unknown;
          };
        };
      };
    };
  };
  return capabilities.textDocument?.codeAction?.codeActionLiteralSupport?.codeActionKind?.valueSet;
}
