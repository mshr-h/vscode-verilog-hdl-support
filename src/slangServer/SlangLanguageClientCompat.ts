// SPDX-License-Identifier: MIT
import {
  LanguageClient,
  type InitializeParams,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';

const UNSUPPORTED_SLANG_CODE_ACTION_KIND = 'refactor.move';

export function removeUnsupportedSlangCodeActionKinds(params: InitializeParams): void {
  const codeActionKind =
    params.capabilities.textDocument?.codeAction
      ?.codeActionLiteralSupport?.codeActionKind;

  if (!codeActionKind || !Array.isArray(codeActionKind.valueSet)) {
    return;
  }

  codeActionKind.valueSet = codeActionKind.valueSet.filter(
    (kind) => kind !== UNSUPPORTED_SLANG_CODE_ACTION_KIND
  );
}

export class SlangLanguageClient extends LanguageClient {
  constructor(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: LanguageClientOptions,
    forceDebug?: boolean
  ) {
    super(id, name, serverOptions, clientOptions, forceDebug);
  }

  protected override fillInitializeParams(params: InitializeParams): void {
    super.fillInitializeParams(params);
    removeUnsupportedSlangCodeActionKinds(params);
  }
}
