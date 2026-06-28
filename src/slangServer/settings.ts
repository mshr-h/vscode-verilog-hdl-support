// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export type SlangServerRuntimeSetting = 'auto' | 'bundled-wasm' | 'native';
export type ResolvedSlangServerRuntimeKind = 'wasm' | 'native';

export interface SlangServerSettings {
  runtime: SlangServerRuntimeSetting;
  path: string;
  args: string[];
  wasmMemoryLimitMb: number;
  wasmAllowUserConfig: boolean;
  configPath: string;
}

export interface RuntimeSelection {
  configured: SlangServerRuntimeSetting;
  kind: ResolvedSlangServerRuntimeKind;
  reason: string;
}

export function getSlangServerSettings(): SlangServerSettings {
  const config = vscode.workspace.getConfiguration('verilog.slangServer');
  const wasmConfig = vscode.workspace.getConfiguration('verilog.slangServer.wasm');
  return {
    runtime: config.get<SlangServerRuntimeSetting>('runtime', 'auto'),
    path: config.get<string>('path', '').trim(),
    args: config.get<string[]>('args', []),
    wasmMemoryLimitMb: wasmConfig.get<number>('memoryLimitMb', 2048),
    wasmAllowUserConfig: wasmConfig.get<boolean>('allowUserConfig', false),
    configPath: config.get<string>('configPath', '.slang/server.json'),
  };
}

export function selectSlangServerRuntime(settings: SlangServerSettings): RuntimeSelection {
  if (settings.runtime === 'native') {
    return {
      configured: settings.runtime,
      kind: 'native',
      reason: 'native runtime explicitly selected',
    };
  }
  if (settings.runtime === 'bundled-wasm') {
    return {
      configured: settings.runtime,
      kind: 'wasm',
      reason: 'bundled WASM runtime explicitly selected',
    };
  }
  if (settings.path.length > 0) {
    return {
      configured: settings.runtime,
      kind: 'native',
      reason: 'auto selected native because verilog.slangServer.path is set',
    };
  }
  return {
    configured: settings.runtime,
    kind: 'wasm',
    reason: 'auto selected bundled WASM because no native path is configured',
  };
}
