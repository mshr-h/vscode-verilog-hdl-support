// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as os from 'os';
import { WASI } from 'node:wasi';

declare const WebAssembly: {
  compile(bytes: Buffer): Promise<unknown>;
  Module: {
    imports(module: unknown): Array<{ module: string; name: string; kind: string }>;
  };
  instantiate(module: unknown, imports: Record<string, unknown>): Promise<unknown>;
};

interface WasiHostArgs {
  wasmPath: string;
  workspaceRoot: string;
  tmpRoot: string;
  allowUserConfig: boolean;
  serverArgs: string[];
}

function parseArgs(argv: string[]): WasiHostArgs {
  const raw = argv[2];
  if (!raw) {
    throw new Error('Missing WASI host configuration argument.');
  }
  return JSON.parse(raw) as WasiHostArgs;
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  const preopens: Record<string, string> = {
    '/workspace': config.workspaceRoot,
    '/tmp': config.tmpRoot,
  };
  if (config.allowUserConfig) {
    preopens['/home'] = os.homedir();
  }

  const wasi = new WASI({
    version: 'preview1',
    args: ['slang-server', ...config.serverArgs],
    env: process.env,
    preopens,
  });
  const wasm = await WebAssembly.compile(fs.readFileSync(config.wasmPath));
  const unsupportedImports = getUnsupportedImports(wasm);
  if (unsupportedImports.length > 0) {
    throw new Error(`Unsupported WASM imports for node:wasi helper: ${unsupportedImports.join(', ')}`);
  }
  const instance = await WebAssembly.instantiate(wasm, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  wasi.start(instance as object);
}

function getUnsupportedImports(module: unknown): string[] {
  return WebAssembly.Module.imports(module)
    .filter((item) => item.module !== 'wasi_snapshot_preview1')
    .map((item) => `${item.module}.${item.name}:${item.kind}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  process.stderr.write(`slang-server WASI host failed: ${message}\n`);
  process.exitCode = 1;
});
