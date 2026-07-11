// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { readSlangServerConfig, type SlangServerConfig } from '../slangServer/SlangServerConfig';
import {
  createWasmServerEnv,
  resolveSlangWasmStartupPolicy,
} from '../slangServer/SlangWasmStartupPolicy';
import {
  createSlangWasmUriConverters,
  createWasmMemoryDescriptor,
  VsCodeWasmSlangServerRuntime,
} from '../slangServer/VsCodeWasmSlangServerRuntime';
import { WasmSlangServerRuntime } from '../slangServer/WasmSlangServerRuntime';
import { WasiFileSystemMapper } from '../slangServer/WasiFileSystemMapper';
import { getRepositoryRoot } from './pathTestUtils';

suite('bundled WASM slang-server runtime', () => {
  test('legacy Node runtime reports unsupported startup without throwing', async () => {
    const runtime = new WasmSlangServerRuntime(config(), {
      context: {
        asAbsolutePath: (relativePath: string) => path.join(getRepositoryRoot(), relativePath),
        globalStorageUri: vscode.Uri.file(path.join(os.tmpdir(), 'slang-wasm-node-runtime-test')),
      } as vscode.ExtensionContext,
      outputChannel: vscode.window.createOutputChannel('slang-wasm-node-runtime-test', { log: true }),
    });

    await runtime.start();
    const status = runtime.getStatus();
    runtime.dispose();

    assert.strictEqual(status.state, 'error');
    assert.strictEqual(status.runtimeProvider, 'node-wasi-helper');
    assert.ok(status.error);
    assert.ok(status.actionableError);
  });

  test('VS Code runtime reports unsupported startup without throwing', async () => {
    const runtime = new VsCodeWasmSlangServerRuntime(config(), {
      context: {
        asAbsolutePath: (relativePath: string) => path.join(os.tmpdir(), 'missing-vscode-wasm-runtime-test', relativePath),
        globalStorageUri: vscode.Uri.file(path.join(os.tmpdir(), 'slang-vscode-wasm-runtime-test')),
      } as vscode.ExtensionContext,
      outputChannel: vscode.window.createOutputChannel('slang-vscode-wasm-runtime-test', { log: true }),
    });

    await runtime.start();
    const status = runtime.getStatus();
    runtime.dispose();

    assert.strictEqual(status.state, 'error');
    assert.strictEqual(status.runtimeProvider, 'vscode-wasm-wasi');
    assert.ok(status.error);
    assert.ok(status.actionableError);
  });

  test('memory descriptor reflects configured limit', () => {
    assert.deepStrictEqual(createWasmMemoryDescriptor(1), { initial: 16, maximum: 16, shared: true });
    assert.deepStrictEqual(createWasmMemoryDescriptor(512), { initial: 4096, maximum: 8192, shared: true });
    assert.deepStrictEqual(createWasmMemoryDescriptor(2048), { initial: 4096, maximum: 32768, shared: true });
  });

  test('server trace environment is enabled only when configured', () => {
    assert.deepStrictEqual(createWasmServerEnv('off', false), {
      SLANG_SERVER_WASI_DEFER_CONFIG_LOAD: '1',
    });
    assert.deepStrictEqual(createWasmServerEnv('messages', false), {
      SLANG_SERVER_WASI_DEFER_CONFIG_LOAD: '1',
      SLANG_SERVER_TESTS: '1',
    });
    assert.deepStrictEqual(createWasmServerEnv('verbose', true), {
      SLANG_SERVER_WASI_DEFER_CONFIG_LOAD: '1',
      SLANG_SERVER_WASI_SKIP_AUTO_INDEXING: '1',
      SLANG_SERVER_TESTS: '1',
    });
  });

  test('auto-index file limit is read from configuration', async () => {
    const settings = vscode.workspace.getConfiguration('verilog.slangServer');
    const previous = settings.inspect<number>('wasm.maxAutoIndexedFiles')?.globalValue;
    try {
      await settings.update('wasm.maxAutoIndexedFiles', 1234, vscode.ConfigurationTarget.Global);
      assert.strictEqual(readSlangServerConfig().wasm.maxAutoIndexedFiles, 1234);
    } finally {
      await settings.update('wasm.maxAutoIndexedFiles', previous, vscode.ConfigurationTarget.Global);
    }
  });

  test('startup policy bounds file discovery and skips only above the limit', async () => {
    const folder = workspaceFolderFixture();
    const warnings: string[] = [];
    let requestedMaxResults: number | undefined;
    let requestedPattern: string | undefined;
    let requestedExclude: vscode.GlobPattern | null | undefined;
    const findFiles = (async (
      include: vscode.GlobPattern,
      exclude?: vscode.GlobPattern | null,
      maxResults?: number
    ) => {
      requestedMaxResults = maxResults;
      requestedPattern = include instanceof vscode.RelativePattern ? include.pattern : String(include);
      requestedExclude = exclude;
      return Array.from({ length: 6 }, (_, index) => vscode.Uri.file(path.join(folder.uri.fsPath, `${index}.sv`)));
    }) as typeof vscode.workspace.findFiles;

    const policy = await resolveSlangWasmStartupPolicy({
      workspaceFolder: folder,
      maxAutoIndexedFiles: 5,
      traceServer: 'off',
      outputChannel: { warn: (message) => warnings.push(message) },
      findFiles,
    });

    assert.strictEqual(requestedPattern, '**/*.{v,vh,sv,svh}');
    assert.strictEqual(requestedExclude, null);
    assert.strictEqual(requestedMaxResults, 6);
    assert.strictEqual(policy.skipAutoIndexing, true);
    assert.strictEqual(policy.env.SLANG_SERVER_WASI_SKIP_AUTO_INDEXING, '1');
    assert.match(warnings[0], /more than 5 HDL files/);

    const allowed = await resolveSlangWasmStartupPolicy({
      workspaceFolder: folder,
      maxAutoIndexedFiles: 6,
      traceServer: 'off',
      outputChannel: { warn: (message) => warnings.push(message) },
      findFiles,
    });
    assert.strictEqual(allowed.skipAutoIndexing, false);
    assert.ok(!('SLANG_SERVER_WASI_SKIP_AUTO_INDEXING' in allowed.env));
  });

  test('startup policy safely skips automatic indexing when file discovery fails', async () => {
    const warnings: string[] = [];
    const policy = await resolveSlangWasmStartupPolicy({
      workspaceFolder: workspaceFolderFixture(),
      maxAutoIndexedFiles: 5000,
      traceServer: 'off',
      outputChannel: { warn: (message) => warnings.push(message) },
      findFiles: (async () => { throw new Error('search failed'); }) as typeof vscode.workspace.findFiles,
    });

    assert.strictEqual(policy.skipAutoIndexing, true);
    assert.strictEqual(policy.env.SLANG_SERVER_WASI_SKIP_AUTO_INDEXING, '1');
    assert.match(warnings[0], /search failed/);
  });

  test('URI converters map workspace diagnostics back to host files', () => {
    const workspaceRoot = vscode.Uri.file(path.join(getRepositoryRoot(), 'tmp', 'wasm-uri-workspace'));
    const tmpRoot = vscode.Uri.file(path.join(getRepositoryRoot(), 'tmp', 'wasm-uri-tmp'));
    const mapper = new WasiFileSystemMapper({ workspaceRoot, tmpRoot });
    const converters = createSlangWasmUriConverters(mapper);

    assert.strictEqual(converters.code2Protocol(workspaceRoot), 'file:///workspace');
    assert.strictEqual(
      converters.code2Protocol(vscode.Uri.file(path.join(workspaceRoot.fsPath, 'rtl', 'soc_top.sv'))),
      'file:///rtl/soc_top.sv'
    );
    assert.strictEqual(
      converters.protocol2Code('file:///workspace/rtl/soc_top.sv').fsPath,
      path.join(workspaceRoot.fsPath, 'rtl', 'soc_top.sv')
    );
    assert.strictEqual(
      converters.protocol2Code('file:///rtl/soc_top.sv').fsPath,
      path.join(workspaceRoot.fsPath, 'rtl', 'soc_top.sv')
    );
  });
});

function config(): SlangServerConfig {
  return {
    enabled: true,
    runtime: 'bundled-wasm',
    resolvedRuntime: 'bundled-wasm',
    path: '',
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

function workspaceFolderFixture(): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(path.join(os.tmpdir(), 'slang-startup-policy-workspace')),
    name: 'slang-startup-policy-workspace',
    index: 0,
  };
}
