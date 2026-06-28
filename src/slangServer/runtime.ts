// SPDX-License-Identifier: MIT
import type { MessageReader, MessageWriter } from 'vscode-languageclient/node';

export interface SlangServerConnection {
  reader: MessageReader;
  writer: MessageWriter;
  dispose(): void;
}

export interface SlangServerRuntime {
  kind: 'wasm' | 'native';
  start(): Promise<SlangServerConnection>;
  stop(): Promise<void>;
  getVersion?(): Promise<string | undefined>;
}
