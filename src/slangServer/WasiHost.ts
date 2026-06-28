// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import { WASI } from 'node:wasi';

declare const WebAssembly: {
  instantiate(
    bytes: Buffer,
    imports: Record<string, unknown>
  ): Promise<{ instance: unknown }>;
};

interface WasiHostOptions {
  wasmPath: string;
  args: string[];
  env: Record<string, string>;
  preopens: Record<string, string>;
}

async function main(): Promise<void> {
  const options = readOptions();
  const wasm = await fs.promises.readFile(options.wasmPath);
  const wasi = new WASI({
    version: 'preview1',
    args: options.args,
    env: options.env,
    preopens: options.preopens,
  });
  const imports = {
    wasi_snapshot_preview1: wasi.wasiImport,
  };
  const { instance } = await WebAssembly.instantiate(wasm, imports);
  wasi.start(instance as Parameters<WASI['start']>[0]);
}

function readOptions(): WasiHostOptions {
  const raw = process.argv[2];
  if (!raw) {
    throw new Error('Missing WASI host options.');
  }
  const parsed = JSON.parse(raw) as Partial<WasiHostOptions>;
  if (!parsed.wasmPath) {
    throw new Error('Missing wasmPath.');
  }
  return {
    wasmPath: parsed.wasmPath,
    args: parsed.args ?? ['slang-server'],
    env: parsed.env ?? {},
    preopens: parsed.preopens ?? {},
  };
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
