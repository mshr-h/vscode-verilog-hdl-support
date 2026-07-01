// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import type { SlangServerApi } from '../slangServer/SlangServerApi';
import { SlangModuleInstantiationService } from '../slangServer/SlangModuleInstantiationService';
import type { SlangServerManager } from '../slangServer/SlangServerManager';

suite('SlangModuleInstantiationService', () => {
  test('builds an instantiation snippet from slang-server completion resolve', async () => {
    const calls: RequestCall[] = [];
    const service = createService(calls, {
      'textDocument/completion': {
        items: [
          { label: 'other' },
          { label: 'child' },
        ],
      },
      'completionItem/resolve': {
        label: 'child',
        insertText: 'child ${1:u_child} (\n\t.clk(${2:clk})\n);',
        insertTextFormat: 2,
      },
    });
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '',
    });

    const snippet = await service.buildInstantiationSnippet('child', document, new vscode.Position(0, 0));

    assert.ok(snippet);
    assert.strictEqual(snippet.value, 'child ${1:u_child} (\n\t.clk(${2:clk})\n);');
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[0].method, 'textDocument/completion');
    assert.deepStrictEqual(calls[0].params, {
      textDocument: { uri: document.uri.toString() },
      position: { line: 0, character: 0 },
      context: { triggerKind: 1 },
    });
    assert.deepStrictEqual(calls[1], {
      method: 'completionItem/resolve',
      params: { label: 'child' },
    });
  });

  test('returns undefined when slang-server does not return the selected module completion', async () => {
    const calls: RequestCall[] = [];
    const service = createService(calls, {
      'textDocument/completion': { items: [{ label: 'other' }] },
    });
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '',
    });

    const snippet = await service.buildInstantiationSnippet('missing', document, new vscode.Position(0, 0));

    assert.strictEqual(snippet, undefined);
    assert.deepStrictEqual(calls.map((call) => call.method), ['textDocument/completion']);
  });

  test('uses plain text insertion when resolved completion is not a snippet', async () => {
    const calls: RequestCall[] = [];
    const service = createService(calls, {
      'textDocument/completion': [{ label: 'plain_module' }],
      'completionItem/resolve': {
        label: 'plain_module',
        insertText: 'plain_module u_plain ();',
        insertTextFormat: 1,
      },
    });
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '',
    });

    const snippet = await service.buildInstantiationSnippet('plain_module', document, new vscode.Position(1, 2));

    assert.ok(snippet);
    assert.strictEqual(snippet.value, 'plain_module u_plain ();');
  });
});

interface RequestCall {
  method: string;
  params: unknown;
}

function createService(
  calls: RequestCall[],
  responses: Record<string, unknown>
): SlangModuleInstantiationService {
  const manager = {
    sendRequest: async <T,>(method: string, params?: unknown): Promise<T> => {
      calls.push({ method, params });
      return responses[method] as T;
    },
  } as SlangServerManager;
  const api = {
    getScopesByModule: async () => [],
  } as unknown as SlangServerApi;
  return new SlangModuleInstantiationService(api, manager);
}
