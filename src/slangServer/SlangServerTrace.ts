// SPDX-License-Identifier: MIT
import { Trace } from 'vscode-languageclient/node';
import type { SlangServerConfig } from './SlangServerConfig';

export function toLanguageClientTrace(traceServer: SlangServerConfig['traceServer']): Trace {
  switch (traceServer) {
    case 'messages':
      return Trace.Messages;
    case 'verbose':
      return Trace.Verbose;
    case 'off':
    default:
      return Trace.Off;
  }
}

export function createWasmServerEnv(traceServer: SlangServerConfig['traceServer']): Record<string, string> {
  const env: Record<string, string> = {
    SLANG_SERVER_WASI_SKIP_STARTUP_INDEXING: '1',
  };

  if (traceServer !== 'off') {
    env.SLANG_SERVER_TESTS = '1';
  }

  return env;
}
