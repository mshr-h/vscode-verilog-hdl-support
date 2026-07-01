// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { splitCommandLineArgs } from '../utils/commandLine';

export type SlangServerRuntimeKind = 'native' | 'bundled-wasm' | 'auto';
export type ResolvedSlangServerRuntimeKind = 'native' | 'bundled-wasm';

export interface SlangServerConfig {
  enabled: boolean;
  runtime: SlangServerRuntimeKind;
  resolvedRuntime: ResolvedSlangServerRuntimeKind;
  path: string;
  args: string[];
  rawArgs: string;
  traceServer: 'off' | 'messages' | 'verbose';
  wasm: SlangServerWasmConfig;
}

export interface SlangServerWasmConfig {
  allowUserConfig: boolean;
  logStderr: boolean;
  memoryLimitMb: number;
}

export function readSlangServerConfig(): SlangServerConfig {
  const config = vscode.workspace.getConfiguration('verilog.slangServer');
  const runtime = config.get<SlangServerRuntimeKind>('runtime', 'auto');
  const nativePath = config.get<string>('path', '').trim();
  return {
    enabled: config.get<boolean>('enabled', true),
    runtime,
    resolvedRuntime: runtime === 'native' || (runtime === 'auto' && nativePath.length > 0) ? 'native' : 'bundled-wasm',
    path: nativePath,
    rawArgs: config.get<string>('args', ''),
    args: splitCommandLineArgs(config.get<string>('args', '')),
    traceServer: config.get<'off' | 'messages' | 'verbose'>('trace.server', 'off'),
    wasm: {
      allowUserConfig: config.get<boolean>('wasm.allowUserConfig', false),
      logStderr: config.get<boolean>('wasm.logStderr', true),
      memoryLimitMb: config.get<number>('wasm.memoryLimitMb', 2048),
    },
  };
}
