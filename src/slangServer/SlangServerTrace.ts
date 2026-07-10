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
