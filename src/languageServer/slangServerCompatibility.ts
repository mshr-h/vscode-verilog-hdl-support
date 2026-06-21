// SPDX-License-Identifier: MIT
import type { InitializeParams } from 'vscode-languageclient/node';

const UNSUPPORTED_SLANG_SERVER_CODE_ACTION_KIND = 'refactor.move';

export function sanitizeSlangServerInitializeParams(params: InitializeParams): void {
  const capabilities = asRecord(params.capabilities);
  const textDocument = asRecord(capabilities?.textDocument);
  const codeAction = asRecord(textDocument?.codeAction);
  const literalSupport = asRecord(codeAction?.codeActionLiteralSupport);
  const codeActionKind = asRecord(literalSupport?.codeActionKind);
  if (!codeActionKind || !Array.isArray(codeActionKind.valueSet)) {
    return;
  }

  codeActionKind.valueSet = codeActionKind.valueSet.filter(
    (value) => value !== UNSUPPORTED_SLANG_SERVER_CODE_ACTION_KIND
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}
