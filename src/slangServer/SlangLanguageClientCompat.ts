// SPDX-License-Identifier: MIT
import {
  LanguageClient,
  type InitializeParams,
  type LanguageClientOptions,
  type Range as ProtocolRange,
  type ServerOptions,
} from 'vscode-languageclient/node';
import type { SlangInactiveRegions } from './SlangServerRuntime';

const UNSUPPORTED_SLANG_CODE_ACTION_KIND = 'refactor.move';
const INACTIVE_REGIONS_NOTIFICATION = 'textDocument/inactiveRegions';

interface InactiveRegionsParams {
  uri: string;
  regions: ProtocolRange[];
}

export function enableSlangInactiveRegions(params: InitializeParams): void {
  const experimental = (params.capabilities.experimental ?? {}) as Record<string, unknown>;
  experimental.inactiveRegions = { inactiveRegions: true };
  params.capabilities.experimental = experimental;
}

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
    onInactiveRegions?: (regions: SlangInactiveRegions) => void,
    forceDebug?: boolean
  ) {
    super(id, name, serverOptions, clientOptions, forceDebug);
    if (onInactiveRegions) {
      this.onNotification(INACTIVE_REGIONS_NOTIFICATION, (params: InactiveRegionsParams) => {
        onInactiveRegions({
          uri: this.protocol2CodeConverter.asUri(params.uri),
          ranges: params.regions.map((range) => this.protocol2CodeConverter.asRange(range)),
        });
      });
    }
  }

  protected override fillInitializeParams(params: InitializeParams): void {
    super.fillInitializeParams(params);
    removeUnsupportedSlangCodeActionKinds(params);
    enableSlangInactiveRegions(params);
  }
}
