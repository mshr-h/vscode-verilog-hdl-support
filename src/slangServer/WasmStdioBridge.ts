// SPDX-License-Identifier: MIT
import { PassThrough } from 'stream';
import {
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-languageclient/node';
import type { SlangServerConnection } from './runtime';

export class WasmStdioBridge implements SlangServerConnection {
  private readonly clientToWasm = new PassThrough();
  private readonly wasmToClient = new PassThrough();

  readonly reader = new StreamMessageReader(this.wasmToClient);
  readonly writer = new StreamMessageWriter(this.clientToWasm);

  get stdin(): NodeJS.ReadableStream {
    return this.clientToWasm;
  }

  get stdout(): NodeJS.WritableStream {
    return this.wasmToClient;
  }

  dispose(): void {
    this.clientToWasm.destroy();
    this.wasmToClient.destroy();
  }
}
