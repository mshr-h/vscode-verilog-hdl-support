// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { SlangServerApi } from '../slangServer/SlangServerApi';
import type { SlangServerStatus } from '../slangServer/SlangServerRuntime';

suite('SlangServerApi', () => {
  test('maps build file host paths to WASI workspace paths for bundled WASM', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const calls: ExecuteCall[] = [];
    const api = createApi('bundled-wasm', workspaceRoot, calls);

    await api.setBuildFile(path.join(workspaceRoot, 'filelists', 'sim.f'));

    assert.deepStrictEqual(calls, [
      { command: 'slang.setBuildFile', args: ['/workspace/filelists/sim.f'] },
    ]);
  });

  test('passes build file host paths through for native runtime', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const buildFile = path.join(workspaceRoot, 'filelists', 'sim.f');
    const calls: ExecuteCall[] = [];
    const api = createApi('native', workspaceRoot, calls);

    await api.setBuildFile(buildFile);

    assert.deepStrictEqual(calls, [
      { command: 'slang.setBuildFile', args: [buildFile] },
    ]);
  });

  test('maps WASM workspace-relative file URIs to WASI workspace paths', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const calls: ExecuteCall[] = [];
    const api = createApi('bundled-wasm', workspaceRoot, calls);

    await api.setTopLevel('file:///rtl/top.sv');

    assert.deepStrictEqual(calls, [
      { command: 'slang.setTopLevel', args: ['/workspace/rtl/top.sv'] },
    ]);
  });

  test('maps WASM workspace-relative path strings to WASI workspace paths', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const calls: ExecuteCall[] = [];
    const api = createApi('bundled-wasm', workspaceRoot, calls);

    await api.setTopLevel('/rtl/top.sv');
    await api.setTopLevel('rtl/top.sv');

    assert.deepStrictEqual(calls, [
      { command: 'slang.setTopLevel', args: ['/workspace/rtl/top.sv'] },
      { command: 'slang.setTopLevel', args: ['/workspace/rtl/top.sv'] },
    ]);
  });

  test('rejects bundled WASM command paths outside the mounted workspace', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const api = createApi('bundled-wasm', workspaceRoot, []);

    await assert.rejects(
      () => api.setBuildFile(path.join('/tmp', 'outside', 'sim.f')),
      /outside the WASI workspace/
    );
  });

  test('maps WASI locations back to host file URIs', () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const api = createApi('bundled-wasm', workspaceRoot, []);

    const location = api.toLocation({
      path: '/workspace/rtl/top.sv',
      range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
    });

    assert.ok(location);
    assert.strictEqual(location.uri.fsPath, path.join(workspaceRoot, 'rtl', 'top.sv'));
    assert.strictEqual(location.range.start.line, 1);
    assert.strictEqual(location.range.end.character, 4);
  });

  test('maps WASM workspace-relative file URI locations back to host file URIs', () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const api = createApi('bundled-wasm', workspaceRoot, []);

    const location = api.toLocation({
      uri: 'file:///rtl/top.sv',
      range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
    });

    assert.ok(location);
    assert.strictEqual(location.uri.fsPath, path.join(workspaceRoot, 'rtl', 'top.sv'));
  });

  test('does not treat host absolute paths under tmp as workspace-relative WASI paths', async () => {
    const workspaceRoot = path.join(os.tmpdir(), 'slang-api-workspace');
    const calls: ExecuteCall[] = [];
    const api = createApi('bundled-wasm', workspaceRoot, calls);

    await api.setBuildFile(path.join(workspaceRoot, 'rtl', 'top.sv'));

    assert.deepStrictEqual(calls, [
      { command: 'slang.setBuildFile', args: ['/workspace/rtl/top.sv'] },
    ]);
  });

  test('maps files containing a module from WASM paths back to host paths', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const api = createApi('bundled-wasm', workspaceRoot, [], {
      'slang.getFilesContainingModule': ['/workspace/rtl/top.sv', 'file:///rtl/child.sv'],
    });

    const files = await api.getFilesContainingModule('top');

    assert.deepStrictEqual(files, [
      path.join(workspaceRoot, 'rtl', 'top.sv'),
      path.join(workspaceRoot, 'rtl', 'child.sv'),
    ]);
  });

  test('adapts upstream module sets to explorer modules', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const api = createApi('native', workspaceRoot, [], {
      'slang.getScopesByModule': [
        {
          declName: 'child',
          declLoc: {
            uri: vscode.Uri.file(path.join(workspaceRoot, 'rtl', 'child.sv')).toString(),
            range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
          },
          instCount: 3,
          inst: {
            instPath: 'top.u_child',
            instLoc: {
              uri: vscode.Uri.file(path.join(workspaceRoot, 'rtl', 'top.sv')).toString(),
              range: { start: { line: 8, character: 2 }, end: { line: 8, character: 9 } },
            },
          },
        },
      ],
    });

    const modules = await api.getScopesByModule();

    assert.strictEqual(modules.length, 1);
    assert.strictEqual(modules[0].name, 'child');
    assert.strictEqual(modules[0].instCount, 3);
    assert.strictEqual(modules[0].firstInstance?.instPath, 'top.u_child');
    assert.strictEqual(api.toLocation(modules[0].declaration)?.range.start.line, 2);
  });

  test('adapts upstream module names returned for a file', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const calls: ExecuteCall[] = [];
    const api = createApi('native', workspaceRoot, calls, {
      'slang.getModulesInFile': ['top', 'child'],
    });

    const modules = await api.getModulesInFile(path.join(workspaceRoot, 'rtl', 'top.sv'));

    assert.deepStrictEqual(modules.map((module) => module.name), ['top', 'child']);
    assert.deepStrictEqual(calls, [
      { command: 'slang.getModulesInFile', args: [path.join(workspaceRoot, 'rtl', 'top.sv')] },
    ]);
  });

  test('adapts upstream hierarchy item arrays to scope children', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const api = createApi('native', workspaceRoot, [], {
      'slang.getScope': [
        {
          kind: 'Instance',
          instName: 'top',
          declName: 'top',
          instLoc: {
            uri: vscode.Uri.file(path.join(workspaceRoot, 'rtl', 'top.sv')).toString(),
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
          },
        },
        {
          kind: 'Scope',
          instName: 'genblk',
          instLoc: {
            uri: vscode.Uri.file(path.join(workspaceRoot, 'rtl', 'top.sv')).toString(),
            range: { start: { line: 4, character: 0 }, end: { line: 4, character: 6 } },
          },
          children: [
            {
              kind: 'Instance',
              instName: 'u_child',
              declName: 'child',
              instLoc: {
                uri: vscode.Uri.file(path.join(workspaceRoot, 'rtl', 'top.sv')).toString(),
                range: { start: { line: 5, character: 2 }, end: { line: 5, character: 9 } },
              },
            },
          ],
        },
      ],
    });

    const scope = await api.getScope('');

    assert.ok(scope);
    assert.strictEqual(scope.instances?.[0].name, 'top');
    assert.strictEqual(scope.instances?.[0].instPath, 'top');
    assert.strictEqual(scope.children?.[0].name, 'genblk');
    assert.strictEqual(scope.children?.[0].instPath, 'genblk');
    assert.strictEqual(scope.children?.[0].instances?.[0].moduleName, 'child');
    assert.strictEqual(scope.children?.[0].instances?.[0].instPath, 'genblk.u_child');
  });

  test('passes expand macro paths as the upstream command object', async () => {
    const workspaceRoot = path.join(process.cwd(), 'tmp', 'slang-api-workspace');
    const calls: ExecuteCall[] = [];
    const api = createApi('bundled-wasm', workspaceRoot, calls);

    await api.expandMacros(
      path.join(workspaceRoot, 'rtl', 'top.sv'),
      path.join(workspaceRoot, 'expanded', 'top.sv')
    );

    assert.deepStrictEqual(calls, [
      {
        command: 'slang.expandMacros',
        args: [{ src: '/workspace/rtl/top.sv', dst: '/workspace/expanded/top.sv' }],
      },
    ]);
  });
});

type RuntimeKind = SlangServerStatus['resolvedRuntime'];

interface ExecuteCall {
  command: string;
  args: unknown[];
}

function createApi(
  runtime: RuntimeKind,
  workspaceRoot: string,
  calls: ExecuteCall[],
  responses: Record<string, unknown> = {}
): SlangServerApi {
  const manager = {
    getStatus: (): SlangServerStatus => ({
      enabled: true,
      configuredRuntime: runtime,
      resolvedRuntime: runtime,
      state: 'running',
    }),
    executeCommand: async <T,>(command: string, args: unknown[] = []): Promise<T> => {
      calls.push({ command, args });
      return responses[command] as T;
    },
  };
  const workspaceFolder = {
    uri: vscode.Uri.file(workspaceRoot),
    name: 'workspace',
    index: 0,
  };
  return new SlangServerApi(manager as never, () => workspaceFolder);
}
