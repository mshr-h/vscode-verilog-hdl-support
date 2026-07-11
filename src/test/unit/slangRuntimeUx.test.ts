// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { selectSlangServerRuntime } from '../../slangServer/SlangServerRuntimeSelector';
import { formatSlangServerStatusBarText } from '../../slangServer/SlangServerStatusBar';
import type { SlangServerConfig } from '../../slangServer/SlangServerConfig';
import { toLanguageClientTrace } from '../../slangServer/SlangServerTrace';
import { Trace } from 'vscode-languageclient/node';

suite('slang-server runtime UX', () => {
  test('runtime selector follows native, bundled-wasm, and auto rules', () => {
    assert.strictEqual(selectSlangServerRuntime(config({ runtime: 'native', path: '' })).kind, 'native');
    assert.strictEqual(selectSlangServerRuntime(config({ runtime: 'bundled-wasm', path: '/bin/slang-server' })).kind, 'bundled-wasm');
    assert.strictEqual(selectSlangServerRuntime(config({ runtime: 'auto', path: '/bin/slang-server' })).kind, 'native');
    assert.strictEqual(selectSlangServerRuntime(config({ runtime: 'auto', path: '' })).kind, 'bundled-wasm');
  });

  test('status bar labels expose runtime and error state', () => {
    assert.strictEqual(formatSlangServerStatusBarText({ state: 'running', resolvedRuntime: 'bundled-wasm' }), 'slang-server: WASM');
    assert.strictEqual(formatSlangServerStatusBarText({ state: 'running', resolvedRuntime: 'native' }), 'slang-server: native');
    assert.strictEqual(formatSlangServerStatusBarText({ state: 'stopped', resolvedRuntime: 'native' }), 'slang-server: stopped');
    assert.strictEqual(formatSlangServerStatusBarText({ state: 'error', resolvedRuntime: 'bundled-wasm' }), 'slang-server: error');
  });

  test('slang-server trace setting maps to language client trace level', () => {
    assert.strictEqual(toLanguageClientTrace('off'), Trace.Off);
    assert.strictEqual(toLanguageClientTrace('messages'), Trace.Messages);
    assert.strictEqual(toLanguageClientTrace('verbose'), Trace.Verbose);
  });

});

function config(input: { runtime: SlangServerConfig['runtime']; path: string }): SlangServerConfig {
  return {
    enabled: true,
    runtime: input.runtime,
    resolvedRuntime: input.runtime === 'native' || (input.runtime === 'auto' && input.path.length > 0)
      ? 'native'
      : 'bundled-wasm',
    path: input.path,
    args: [],
    rawArgs: '',
    traceServer: 'off',
    wasm: {
      allowUserConfig: false,
      logStderr: true,
      maxAutoIndexedFiles: 5000,
      memoryLimitMb: 2048,
    },
  };
}
