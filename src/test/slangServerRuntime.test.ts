// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { NativeSlangServerRuntime, resolveNativeExecutable } from '../slangServer/NativeSlangServerRuntime';
import { PathMapper } from '../slangServer/PathMapper';
import { SlangConfigService } from '../slangServer/SlangConfigService';
import { selectSlangServerRuntime, type SlangServerSettings } from '../slangServer/settings';
import { getWasmArtifactStatus, isWasmBinary, readBundledMetadata, WasmSlangServerRuntime } from '../slangServer/WasmSlangServerRuntime';

suite('Slang server runtime', () => {
  test('selects bundled wasm by default in auto mode', () => {
    const selection = selectSlangServerRuntime(makeSettings({ runtime: 'auto', path: '' }));

    assert.strictEqual(selection.kind, 'wasm');
  });

  test('selects native in auto mode when a path is configured', () => {
    const selection = selectSlangServerRuntime(makeSettings({ runtime: 'auto', path: 'slang-server' }));

    assert.strictEqual(selection.kind, 'native');
  });

  test('resolves native executable and probes version', async () => {
    assert.strictEqual(await resolveNativeExecutable(path.join(os.tmpdir(), `missing-${process.pid}`)), undefined);

    const runtime = new NativeSlangServerRuntime(process.execPath, [], makeOutputChannel());
    const version = await runtime.getVersion();

    assert.match(version ?? '', /^v?\d+\.\d+\.\d+/);
  });

  test('maps workspace paths through /workspace', () => {
    const workspaceRoot = vscode.Uri.file(path.join(os.tmpdir(), 'slang-workspace'));
    const mapper = new PathMapper({ uri: workspaceRoot, name: 'test', index: 0 });
    const sourcePath = vscode.Uri.file(path.join(workspaceRoot.fsPath, 'rtl', 'top.sv'));

    assert.strictEqual(mapper.toWasiPath(sourcePath), '/workspace/rtl/top.sv');
    assert.strictEqual(mapper.toVscodeUri('/workspace/rtl/top.sv').fsPath, sourcePath.fsPath);
  });

  test('detects command-backed builds as wasm-unsupported', () => {
    const service = new SlangConfigService();

    assert.strictEqual(service.hasWasmUnsupportedCommandBuild({ builds: [{ command: 'make dotf' }] }), true);
    assert.strictEqual(service.hasWasmUnsupportedCommandBuild({ builds: [{ glob: '**/*.f' }] }), false);
  });

  test('reads bundled wasm metadata', () => {
    const metadata = readBundledMetadata(vscode.Uri.file(process.cwd()));

    assert.ok(metadata);
    assert.strictEqual(metadata.target, 'wasm32-wasi');
    assert.strictEqual(metadata.features.threads, false);
  });

  test('rejects non-wasm placeholder artifacts', () => {
    const tempFile = path.join(os.tmpdir(), `slang-server-placeholder-${process.pid}.wasm`);
    fs.writeFileSync(tempFile, 'placeholder');
    try {
      assert.strictEqual(isWasmBinary(tempFile), false);
    } finally {
      fs.rmSync(tempFile, { force: true });
    }
  });

  test('wasm runtime exposes bundled artifact and host paths', () => {
    const runtime = new WasmSlangServerRuntime(
      {
        extensionUri: vscode.Uri.file(process.cwd()),
        globalStorageUri: vscode.Uri.file(os.tmpdir()),
        memoryLimitMb: 2048,
      },
      makeOutputChannel()
    );

    assert.strictEqual(
      runtime.getWasmPath(),
      path.join(process.cwd(), 'resources', 'slang-server', 'slang-server.wasm')
    );
    assert.strictEqual(
      runtime.getHostPath(),
      path.join(process.cwd(), 'dist', 'slangServerWasiHost.js')
    );
  });

  test('checked-in bundled artifact is a wasm binary', () => {
    const runtime = new WasmSlangServerRuntime(
      {
        extensionUri: vscode.Uri.file(process.cwd()),
        globalStorageUri: vscode.Uri.file(os.tmpdir()),
        memoryLimitMb: 2048,
      },
      makeOutputChannel()
    );

    assert.strictEqual(isWasmBinary(runtime.getWasmPath()), true);
  });

  test('reports bundled wasm artifact status', () => {
    const status = getWasmArtifactStatus(vscode.Uri.file(process.cwd()));

    assert.strictEqual(status.path, path.join(process.cwd(), 'resources', 'slang-server', 'slang-server.wasm'));
    assert.strictEqual(status.exists, true);
    assert.strictEqual(status.isWasm, true);
  });

  test('bundled wasm server handles LSP initialize, symbols, hover, and shutdown', async function (this: Mocha.Context) {
    this.timeout(15000);

    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'slang-wasm-lsp-'));
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'slang-wasm-tmp-'));
    const sourcePath = path.join(workspaceRoot, 'top.sv');
    fs.writeFileSync(sourcePath, 'module top;\n  logic value;\nendmodule\n');
    fs.mkdirSync(path.join(workspaceRoot, '.slang'), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceRoot, '.slang', 'server.json'),
      `${JSON.stringify({ index: [{ dirs: ['.'], excludeDirs: ['.slang'] }], indexingThreads: 1 }, null, 2)}\n`
    );

    const hostPath = path.join(process.cwd(), 'dist', 'slangServerWasiHost.js');
    const wasmPath = path.join(process.cwd(), 'resources', 'slang-server', 'slang-server.wasm');
    assert.strictEqual(fs.existsSync(hostPath), true);
    assert.strictEqual(isWasmBinary(wasmPath), true);

    const preopens: Record<string, string> = {
      '/workspace': workspaceRoot,
      '/tmp': tmpRoot,
    };
    if (workspaceRoot.startsWith('/')) {
      preopens[workspaceRoot] = workspaceRoot;
    }
    const child = cp.spawn(process.execPath, [
      hostPath,
      JSON.stringify({
        wasmPath,
        args: ['slang-server'],
        env: {},
        preopens,
      }),
    ], {
      cwd: workspaceRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const rpc = new JsonRpcPeer(child);

    try {
      const rootUri = vscode.Uri.file(workspaceRoot).toString();
      const sourceUri = vscode.Uri.file(sourcePath).toString();
      const initialize = await rpc.request('initialize', {
        processId: process.pid,
        clientInfo: { name: 'veriloghdl-tests' },
        rootUri,
        workspaceFolders: [{ uri: rootUri, name: 'test' }],
        capabilities: {},
      });
      assert.strictEqual(initialize.capabilities.hoverProvider, true);
      assert.strictEqual(initialize.capabilities.documentSymbolProvider, true);

      rpc.notify('initialized', {});
      rpc.notify('textDocument/didOpen', {
        textDocument: {
          uri: sourceUri,
          languageId: 'systemverilog',
          version: 1,
          text: fs.readFileSync(sourcePath, 'utf8'),
        },
      });

      const symbols = await rpc.request('textDocument/documentSymbol', {
        textDocument: { uri: sourceUri },
      });
      assert.ok(Array.isArray(symbols));

      await rpc.request('textDocument/hover', {
        textDocument: { uri: sourceUri },
        position: { line: 0, character: 7 },
      });

      await rpc.request('shutdown', null);
      rpc.notify('exit', {});
      await rpc.waitForExit();
    } finally {
      child.kill();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

function makeSettings(overrides: Partial<SlangServerSettings>): SlangServerSettings {
  return {
    runtime: 'auto',
    path: '',
    args: [],
    wasmMemoryLimitMb: 2048,
    wasmAllowUserConfig: false,
    configPath: '.slang/server.json',
    ...overrides,
  };
}

function makeOutputChannel(): vscode.OutputChannel {
  return {
    name: 'test',
    append: () => undefined,
    appendLine: () => undefined,
    clear: () => undefined,
    replace: () => undefined,
    show: () => undefined,
    hide: () => undefined,
    dispose: () => undefined,
  };
}

class JsonRpcPeer {
  private nextId = 1;
  private buffer = Buffer.alloc(0);
  private readonly exitPromise: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  private readonly pending = new Map<number, {
    resolve: (value: any) => void;
    reject: (reason?: unknown) => void;
    timer: NodeJS.Timeout;
  }>();
  private stderr = '';

  constructor(private readonly child: cp.ChildProcessWithoutNullStreams) {
    this.exitPromise = new Promise((resolve) => {
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    child.stdout.on('data', (chunk: Buffer) => this.onData(chunk));
    child.stderr.on('data', (chunk: Buffer) => {
      this.stderr += chunk.toString();
    });
    child.on('exit', (code, signal) => {
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer);
        pending.reject(new Error(`slang-server exited before response ${id}: code=${code ?? 'null'} signal=${signal ?? 'null'} stderr=${this.stderr}`));
      }
      this.pending.clear();
    });
  }

  request(method: string, params: unknown): Promise<any> {
    const id = this.nextId++;
    this.send({ jsonrpc: '2.0', id, method, params });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}. stderr=${this.stderr}`));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  notify(method: string, params: unknown): void {
    this.send({ jsonrpc: '2.0', method, params });
  }

  waitForExit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for slang-server exit. stderr=${this.stderr}`));
      }, 10000);
      this.exitPromise.then(({ code }) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`slang-server exited with code ${code}. stderr=${this.stderr}`));
        }
      });
    });
  }

  private send(message: unknown): void {
    const body = Buffer.from(JSON.stringify(message), 'utf8');
    this.child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    this.child.stdin.write(body);
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) {
        return;
      }
      const header = this.buffer.subarray(0, headerEnd).toString('ascii');
      const match = /^Content-Length: (\d+)$/im.exec(header);
      if (!match) {
        throw new Error(`Missing Content-Length header: ${header}`);
      }
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;
      if (this.buffer.length < bodyEnd) {
        return;
      }
      const message = JSON.parse(this.buffer.subarray(bodyStart, bodyEnd).toString('utf8')) as {
        id?: number;
        result?: unknown;
        error?: { message?: string };
      };
      this.buffer = this.buffer.subarray(bodyEnd);
      if (typeof message.id === 'number') {
        const pending = this.pending.get(message.id);
        if (pending) {
          this.pending.delete(message.id);
          clearTimeout(pending.timer);
          if (message.error) {
            pending.reject(new Error(message.error.message ?? 'JSON-RPC error'));
          } else {
            pending.resolve(message.result);
          }
        }
      }
    }
  }
}
