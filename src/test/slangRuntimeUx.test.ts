// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { selectSlangServerRuntime } from '../slangServer/SlangServerRuntimeSelector';
import { formatSlangServerStatusBarText } from '../slangServer/SlangServerStatusBar';
import { readSlangServerConfig, type SlangServerConfig } from '../slangServer/SlangServerConfig';
import { toLanguageClientTrace } from '../slangServer/SlangServerTrace';
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

  test('WASM runtime reports missing artifact or unsupported workspace without throwing', async () => {
    const runtime = new WasmSlangServerRuntime(config({ runtime: 'bundled-wasm', path: '' }), {
      context: {
        asAbsolutePath: (relativePath: string) => path.join(getRepositoryRoot(), relativePath),
        globalStorageUri: vscode.Uri.file(path.join(os.tmpdir(), 'slang-runtime-ux-test')),
      } as vscode.ExtensionContext,
      outputChannel: vscode.window.createOutputChannel('slang-runtime-ux-test', { log: true }),
    });

    await runtime.start();
    const status = runtime.getStatus();
    runtime.dispose();

    assert.strictEqual(status.state, 'error');
    assert.strictEqual(status.runtimeProvider, 'node-wasi-helper');
    assert.ok(status.error);
    assert.ok(status.actionableError);
  });

  test('VS Code WASM runtime reports unsupported startup without throwing', async () => {
    const runtime = new VsCodeWasmSlangServerRuntime(config({ runtime: 'bundled-wasm', path: '' }), {
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

  test('VS Code WASM runtime memory descriptor reflects configured limit', () => {
    assert.deepStrictEqual(createWasmMemoryDescriptor(1), { initial: 16, maximum: 16, shared: true });
    assert.deepStrictEqual(createWasmMemoryDescriptor(512), { initial: 4096, maximum: 8192, shared: true });
    assert.deepStrictEqual(createWasmMemoryDescriptor(2048), { initial: 4096, maximum: 32768, shared: true });
  });

  test('slang-server trace setting maps to language client trace level', () => {
    assert.strictEqual(toLanguageClientTrace('off'), Trace.Off);
    assert.strictEqual(toLanguageClientTrace('messages'), Trace.Messages);
    assert.strictEqual(toLanguageClientTrace('verbose'), Trace.Verbose);
  });

  test('VS Code WASM runtime only enables server trace env when configured', () => {
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

  test('WASM auto-index file limit is read from configuration', async () => {
    const settings = vscode.workspace.getConfiguration('verilog.slangServer');
    const previous = settings.inspect<number>('wasm.maxAutoIndexedFiles')?.globalValue;
    try {
      await settings.update('wasm.maxAutoIndexedFiles', 1234, vscode.ConfigurationTarget.Global);
      assert.strictEqual(readSlangServerConfig().wasm.maxAutoIndexedFiles, 1234);
    } finally {
      await settings.update('wasm.maxAutoIndexedFiles', previous, vscode.ConfigurationTarget.Global);
    }
  });

  test('WASM startup policy bounds file discovery and skips only above the limit', async () => {
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

  test('WASM startup policy safely skips automatic indexing when file discovery fails', async () => {
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

  test('VS Code WASM URI converters map workspace diagnostics back to host files', () => {
    const workspaceRoot = vscode.Uri.file(path.join(getRepositoryRoot(), 'tmp', 'wasm-uri-workspace'));
    const tmpRoot = vscode.Uri.file(path.join(getRepositoryRoot(), 'tmp', 'wasm-uri-tmp'));
    const mapper = new WasiFileSystemMapper({ workspaceRoot, tmpRoot });
    const converters = createSlangWasmUriConverters(mapper);

    assert.strictEqual(
      converters.code2Protocol(workspaceRoot),
      'file:///workspace'
    );
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

  test('VS Code WASM runtime smoke test initializes when prerequisites are present', async function () {
    const repoRoot = getRepositoryRoot();
    if (!vscode.workspace.workspaceFolders?.[0]) {
      this.skip();
    }
    if (!vscode.extensions.getExtension('ms-vscode.wasm-wasi-core')) {
      this.skip();
    }
    if (!await fileExists(path.join(repoRoot, 'resources', 'wasm', 'slang-server.wasm'))) {
      this.skip();
    }

    const runtime = new VsCodeWasmSlangServerRuntime(config({ runtime: 'bundled-wasm', path: '' }), {
      context: {
        asAbsolutePath: (relativePath: string) => path.join(repoRoot, relativePath),
        globalStorageUri: vscode.Uri.file(path.join(os.tmpdir(), 'slang-vscode-wasm-smoke-test')),
      } as vscode.ExtensionContext,
      outputChannel: vscode.window.createOutputChannel('slang-vscode-wasm-smoke-test', { log: true }),
    });

    await runtime.start();
    const status = runtime.getStatus();
    await runtime.stop();

    assert.strictEqual(status.state, 'running', status.error);
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

function workspaceFolderFixture(): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(path.join(os.tmpdir(), 'slang-startup-policy-workspace')),
    name: 'slang-startup-policy-workspace',
    index: 0,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
    return true;
  } catch {
    return false;
  }
}
