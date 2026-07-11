// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import type { InitializeParams } from 'vscode-languageclient/node';
import {
  enableSlangInactiveRegions,
  removeUnsupportedSlangCodeActionKinds,
} from '../../slangServer/SlangLanguageClientCompat';
import { getRepositoryRoot } from '../support/pathTestUtils';

suite('SlangLanguageClient compatibility', () => {
  test('advertises inactive region notification support', () => {
    const params = { capabilities: {} } as InitializeParams;

    enableSlangInactiveRegions(params);

    assert.deepStrictEqual(params.capabilities.experimental, {
      inactiveRegions: { inactiveRegions: true },
    });
  });

  test('preserves other experimental capabilities', () => {
    const params = {
      capabilities: { experimental: { existing: true } },
    } as unknown as InitializeParams;

    enableSlangInactiveRegions(params);

    assert.deepStrictEqual(params.capabilities.experimental, {
      existing: true,
      inactiveRegions: { inactiveRegions: true },
    });
  });

  test('removes only refactor.move from initialize code action kind values', () => {
    const valueSet = [
      '',
      'quickfix',
      'refactor',
      'refactor.extract',
      'refactor.inline',
      'refactor.move',
      'refactor.rewrite',
      'source',
      'source.organizeImports',
      'source.fixAll',
      'notebook',
    ];
    const params = createInitializeParams(valueSet);

    removeUnsupportedSlangCodeActionKinds(params);

    assert.deepStrictEqual(
      params.capabilities.textDocument?.codeAction
        ?.codeActionLiteralSupport?.codeActionKind.valueSet,
      [
        '',
        'quickfix',
        'refactor',
        'refactor.extract',
        'refactor.inline',
        'refactor.rewrite',
        'source',
        'source.organizeImports',
        'source.fixAll',
        'notebook',
      ]
    );
  });

  test('does not mutate initialize params when code action capability is absent', () => {
    const params = { capabilities: {} } as InitializeParams;

    removeUnsupportedSlangCodeActionKinds(params);

    assert.deepStrictEqual(params, { capabilities: {} });
  });

  test('does not mutate initialize params when valueSet is absent', () => {
    const codeActionKind = {};
    const params = {
      capabilities: {
        textDocument: {
          codeAction: {
            codeActionLiteralSupport: {
              codeActionKind,
            },
          },
        },
      },
    } as unknown as InitializeParams;

    removeUnsupportedSlangCodeActionKinds(params);

    assert.deepStrictEqual(codeActionKind, {});
  });

  test('does not mutate initialize params when valueSet is not an array', () => {
    const codeActionKind = { valueSet: 'refactor.move' };
    const params = {
      capabilities: {
        textDocument: {
          codeAction: {
            codeActionLiteralSupport: {
              codeActionKind,
            },
          },
        },
      },
    } as unknown as InitializeParams;

    removeUnsupportedSlangCodeActionKinds(params);

    assert.deepStrictEqual(codeActionKind, { valueSet: 'refactor.move' });
  });

  test('slang runtimes construct the compatibility language client', () => {
    for (const relativePath of [
      path.join('src', 'slangServer', 'NativeSlangServerRuntime.ts'),
      path.join('src', 'slangServer', 'VsCodeWasmSlangServerRuntime.ts'),
      path.join('src', 'slangServer', 'WasmSlangServerRuntime.ts'),
    ]) {
      const source = fs.readFileSync(path.join(getRepositoryRoot(), relativePath), 'utf8');

      assert.ok(
        source.includes('new SlangLanguageClient('),
        `${relativePath} should construct SlangLanguageClient`
      );
      assert.ok(
        !source.includes('new LanguageClient('),
        `${relativePath} should not construct raw LanguageClient`
      );
    }
  });
});

function createInitializeParams(valueSet: string[]): InitializeParams {
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
  } as InitializeParams;
}
