// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import type { SlangConfigService } from '../slangServer/SlangConfigService';
import { SlangServerApi } from '../slangServer/SlangServerApi';
import type { SlangServerManager } from '../slangServer/SlangServerManager';
import { HdlExplorerProvider } from '../views/HdlExplorerProvider';

suite('Slang-backed HDL Explorer', () => {
  test('renders server status section', async () => {
    const provider = createProvider();
    const roots = await provider.getChildren();
    const server = roots.find((item) => item.label === 'slang-server');

    assert.ok(server);
    const children = await provider.getChildren(server);
    assert.ok(children.some((item) => item.label === 'State' && item.description === 'running'));
    assert.ok(children.some((item) => item.label === 'Runtime' && item.description === 'native'));
  });

  test('renders modules returned by slang-server', async () => {
    const provider = createProvider({
      modules: [
        {
          name: 'top',
          location: {
            path: '/tmp/top.sv',
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
          },
        },
      ],
    });
    const modules = (await provider.getChildren()).find((item) => item.label === 'Modules');
    assert.ok(modules);

    const children = await provider.getChildren(modules);

    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0].label, 'top');
    assert.strictEqual(children[0].command?.command, 'verilog.openModuleFromExplorer');
  });

  test('renders graceful module empty state', async () => {
    const provider = createProvider({ modules: [] });
    const modules = (await provider.getChildren()).find((item) => item.label === 'Modules');
    assert.ok(modules);

    const children = await provider.getChildren(modules);

    assert.strictEqual(children[0].label, 'No modules available');
  });

  test('renders hierarchy children from getScope', async () => {
    const provider = createProvider({
      scope: {
        name: 'top',
        instances: [{ name: 'u_child', moduleName: 'child', instPath: 'top.u_child' }],
      },
    });
    const hierarchy = (await provider.getChildren()).find((item) => item.label === 'Hierarchy');
    assert.ok(hierarchy);

    const children = await provider.getChildren(hierarchy);

    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0].label, 'u_child : child');
  });
});

function createProvider(input: {
  modules?: Awaited<ReturnType<SlangServerApi['getScopesByModule']>>;
  scope?: Awaited<ReturnType<SlangServerApi['getScope']>>;
} = {}): HdlExplorerProvider {
  const manager = {
    getStatus: () => ({
      enabled: true,
      configuredRuntime: 'native',
      resolvedRuntime: 'native',
      state: 'running',
      path: '/usr/bin/slang-server',
      args: [],
    }),
    executeCommand: async <T,>(command: string): Promise<T> => {
      if (command === 'slang.getScopesByModule') {
        return (input.modules ?? []) as T;
      }
      if (command === 'slang.getScope') {
        return input.scope as T;
      }
      return undefined as T;
    },
  } as unknown as SlangServerManager;
  const api = new SlangServerApi(manager);
  const configService = {
    getStatus: async () => ({
      ok: true,
      workspaceConfig: vscode.Uri.file('/tmp/.slang/server.json'),
    }),
  } as unknown as SlangConfigService;
  return new HdlExplorerProvider(api, manager, configService);
}
