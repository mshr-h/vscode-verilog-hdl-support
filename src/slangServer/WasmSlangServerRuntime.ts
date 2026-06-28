// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as vscode from 'vscode';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-languageclient/node';
import type { SlangServerConnection, SlangServerRuntime } from './runtime';

export interface WasmSlangServerRuntimeOptions {
  extensionUri: vscode.Uri;
  globalStorageUri: vscode.Uri;
  memoryLimitMb: number;
}

export class WasmSlangServerRuntime implements SlangServerRuntime {
  readonly kind = 'wasm' as const;
  private process: ChildProcessWithoutNullStreams | undefined;

  constructor(
    private readonly options: WasmSlangServerRuntimeOptions,
    private readonly outputChannel: vscode.OutputChannel
  ) {}

  async start(): Promise<SlangServerConnection> {
    const wasmPath = this.getWasmPath();
    if (!fs.existsSync(wasmPath) || fs.statSync(wasmPath).size === 0) {
      throw new Error(
        `Bundled slang-server WASM artifact is missing: ${wasmPath}. Build or install resources/slang-server/slang-server.wasm.`
      );
    }
    if (!isWasmBinary(wasmPath)) {
      throw new Error(
        `Bundled slang-server WASM artifact is not a valid WebAssembly module: ${wasmPath}. Rebuild or replace it with a wasm32-wasi slang-server build.`
      );
    }

    this.outputChannel.appendLine(
      `Starting bundled WASM slang-server (${this.options.memoryLimitMb} MiB memory limit): ${wasmPath}`
    );

    const hostPath = this.getHostPath();
    if (!fs.existsSync(hostPath)) {
      throw new Error(`Bundled WASI host is missing: ${hostPath}. Run the extension build before packaging.`);
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('Open a workspace folder before starting bundled WASM slang-server.');
    }

    const tmpPath = path.join(this.options.globalStorageUri.fsPath, 'slang-server-tmp');
    fs.mkdirSync(tmpPath, { recursive: true });
    const preopens: Record<string, string> = {
      '/workspace': workspaceFolder.uri.fsPath,
      '/tmp': tmpPath,
    };
    if (workspaceFolder.uri.fsPath.startsWith('/')) {
      preopens[workspaceFolder.uri.fsPath] = workspaceFolder.uri.fsPath;
    }
    const hostOptions = {
      wasmPath,
      args: ['slang-server'],
      env: {},
      preopens,
    };

    const child = spawn(process.execPath, [hostPath, JSON.stringify(hostOptions)], {
      stdio: 'pipe',
      cwd: workspaceFolder.uri.fsPath,
    });
    this.process = child;
    child.stderr.on('data', (chunk: Buffer) => {
      this.outputChannel.append(chunk.toString());
    });
    child.on('exit', (code, signal) => {
      this.outputChannel.appendLine(`WASM slang-server host exited: code=${code ?? 'null'} signal=${signal ?? 'null'}`);
      this.process = undefined;
    });
    child.on('error', (error) => {
      this.outputChannel.appendLine(`WASM slang-server host error: ${error.message}`);
    });

    return {
      reader: new StreamMessageReader(child.stdout),
      writer: new StreamMessageWriter(child.stdin),
      dispose: () => {
        child.kill();
      },
    };
  }

  async stop(): Promise<void> {
    this.process?.kill();
    this.process = undefined;
  }

  async getVersion(): Promise<string | undefined> {
    return readBundledMetadata(this.options.extensionUri)?.slangServerVersion;
  }

  getWasmPath(): string {
    return path.join(
      this.options.extensionUri.fsPath,
      'resources',
      'slang-server',
      'slang-server.wasm'
    );
  }

  getHostPath(): string {
    return path.join(this.options.extensionUri.fsPath, 'dist', 'slangServerWasiHost.js');
  }
}

export function isWasmBinary(wasmPath: string): boolean {
  if (!fs.existsSync(wasmPath) || fs.statSync(wasmPath).size < 4) {
    return false;
  }
  const magic = Buffer.alloc(4);
  const fd = fs.openSync(wasmPath, 'r');
  try {
    fs.readSync(fd, magic, 0, magic.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  return magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6d;
}

export interface WasmArtifactStatus {
  path: string;
  exists: boolean;
  size: number;
  isWasm: boolean;
}

export function getWasmArtifactStatus(extensionUri: vscode.Uri): WasmArtifactStatus {
  const wasmPath = path.join(
    extensionUri.fsPath,
    'resources',
    'slang-server',
    'slang-server.wasm'
  );
  const exists = fs.existsSync(wasmPath);
  const size = exists ? fs.statSync(wasmPath).size : 0;
  return {
    path: wasmPath,
    exists,
    size,
    isWasm: exists && isWasmBinary(wasmPath),
  };
}

export interface SlangServerWasmMetadata {
  slangServerVersion: string;
  slangServerCommit: string;
  slangCommit: string;
  target: string;
  buildDate: string;
  features: {
    threads: boolean;
    externalBuildCommands: boolean;
    wcp: boolean;
  };
}

export function readBundledMetadata(extensionUri: vscode.Uri): SlangServerWasmMetadata | undefined {
  const metadataPath = path.join(
    extensionUri.fsPath,
    'resources',
    'slang-server',
    'slang-server.meta.json'
  );
  if (!fs.existsSync(metadataPath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as SlangServerWasmMetadata;
}
