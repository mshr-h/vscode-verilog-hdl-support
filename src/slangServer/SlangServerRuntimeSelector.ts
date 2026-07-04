// SPDX-License-Identifier: MIT
import type { SlangServerConfig } from './SlangServerConfig';
import type { SlangServerResolvedRuntime } from './SlangServerRuntime';

export interface RuntimeSelection {
  kind: SlangServerResolvedRuntime;
  reason: string;
}

export function selectSlangServerRuntime(config: SlangServerConfig): RuntimeSelection {
  if (config.runtime === 'native') {
    return { kind: 'native', reason: 'runtime setting is native' };
  }
  if (config.runtime === 'bundled-wasm') {
    return { kind: 'bundled-wasm', reason: 'runtime setting is bundled-wasm' };
  }
  if (config.path.length > 0) {
    return { kind: 'native', reason: 'auto selected native because verilog.slangServer.path is configured' };
  }
  return { kind: 'bundled-wasm', reason: 'auto selected bundled WASM because no native path is configured' };
}
