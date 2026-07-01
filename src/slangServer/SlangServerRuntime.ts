// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export type SlangServerState = 'stopped' | 'starting' | 'running' | 'error';
export type SlangServerResolvedRuntime = 'native' | 'bundled-wasm';

export interface SlangServerWasmMetadata {
  slangServerCommit?: string;
  slangCommit?: string;
  wasiSdkVersion?: string;
  buildType?: string;
  wasmSha256?: string;
  wasmSizeBytes?: number;
  smokeTest?: string;
  [key: string]: unknown;
}

export interface SlangServerStatus {
  enabled: boolean;
  configuredRuntime: string;
  resolvedRuntime: SlangServerResolvedRuntime;
  runtimeProvider?: 'node-wasi-helper' | 'vscode-wasm-wasi';
  state: SlangServerState;
  path?: string;
  args?: string[];
  version?: string;
  error?: string;
  actionableError?: string;
  wasmPath?: string;
  wasmMetadata?: SlangServerWasmMetadata;
  workspaceMount?: string;
  tmpMount?: string;
  allowUserConfig?: boolean;
  memoryLimitMb?: number;
  startupTimeMs?: number;
  lastCrashReason?: string;
  lastCrashAt?: string;
}

export interface SlangServerRuntime extends vscode.Disposable {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getStatus(): SlangServerStatus;
  showOutput(): void;
  probeVersion(): Promise<string | undefined>;
  executeCommand<T>(command: string, args?: unknown[]): Promise<T>;
  sendRequest<T>(method: string, params?: unknown): Promise<T>;
}
