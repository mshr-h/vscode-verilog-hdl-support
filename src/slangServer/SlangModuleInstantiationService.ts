// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';
import type { SlangServerApi, SlangModule } from './SlangServerApi';
import type { SlangServerManager } from './SlangServerManager';

const COMPLETION_REQUEST = 'textDocument/completion';
const COMPLETION_RESOLVE_REQUEST = 'completionItem/resolve';
const INSERT_TEXT_FORMAT_SNIPPET = 2;

interface LspTextDocumentIdentifier {
  uri: string;
}

interface LspPosition {
  line: number;
  character: number;
}

interface LspCompletionParams {
  textDocument: LspTextDocumentIdentifier;
  position: LspPosition;
  context: {
    triggerKind: number;
  };
}

interface LspCompletionItem {
  label: string;
  insertText?: string;
  insertTextFormat?: number;
  textEdit?: {
    newText?: string;
  };
  [key: string]: unknown;
}

interface LspCompletionList {
  items?: LspCompletionItem[];
}

interface ModuleQuickPickItem extends vscode.QuickPickItem {
  module: SlangModule;
}

export class SlangModuleInstantiationService {
  private readonly logger = getExtensionLogger('SlangServer', 'ModuleInstantiation');

  constructor(
    private readonly api: SlangServerApi,
    private readonly manager: SlangServerManager
  ) {}

  async instantiateModuleInteract(): Promise<boolean> {
    const modules = await this.api.getScopesByModule();
    if (modules.length === 0) {
      vscode.window.showWarningMessage('No modules are available from slang-server.');
      return false;
    }

    const selected = await vscode.window.showQuickPick(
      modules.map((module): ModuleQuickPickItem => ({
        label: module.name,
        description: module.instCount !== undefined ? `${module.instCount} instance(s)` : undefined,
        detail: module.declaration?.path ?? module.declaration?.uri,
        module,
      })),
      { placeHolder: 'Choose a module to instantiate' }
    );
    return selected ? this.instantiateModule(selected.module.name) : false;
  }

  async instantiateModule(moduleName: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isHdlDocument(editor.document)) {
      vscode.window.showWarningMessage('Open a Verilog/SystemVerilog editor before instantiating a module.');
      return false;
    }

    const snippet = await this.buildInstantiationSnippet(moduleName, editor.document, editor.selection.active);
    if (!snippet) {
      vscode.window.showWarningMessage(`slang-server did not provide an instantiation snippet for ${moduleName}.`);
      return false;
    }
    return editor.insertSnippet(snippet);
  }

  async buildInstantiationSnippet(
    moduleName: string,
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.SnippetString | undefined> {
    const items = await this.getCompletionItems(document, position);
    const item = items.find((candidate) => candidate.label === moduleName);
    if (!item) {
      this.logger.warn('No module completion returned by slang-server', {
        moduleName,
        uri: document.uri.toString(),
      });
      return undefined;
    }

    const resolved = await this.resolveCompletionItem(item);
    const text = resolved.textEdit?.newText ?? resolved.insertText ?? resolved.label;
    if (!text) {
      return undefined;
    }
    return resolved.insertTextFormat === INSERT_TEXT_FORMAT_SNIPPET
      ? new vscode.SnippetString(text)
      : new vscode.SnippetString().appendText(text);
  }

  private async getCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<LspCompletionItem[]> {
    const params: LspCompletionParams = {
      textDocument: { uri: document.uri.toString() },
      position: { line: position.line, character: position.character },
      context: { triggerKind: 1 },
    };
    const response = await this.manager.sendRequest<LspCompletionItem[] | LspCompletionList | undefined>(
      COMPLETION_REQUEST,
      params
    );
    if (Array.isArray(response)) {
      return response;
    }
    return Array.isArray(response?.items) ? response.items : [];
  }

  private async resolveCompletionItem(item: LspCompletionItem): Promise<LspCompletionItem> {
    try {
      return await this.manager.sendRequest<LspCompletionItem>(COMPLETION_RESOLVE_REQUEST, item);
    } catch (err) {
      this.logger.warn('slang-server completionItem/resolve failed; using unresolved item', {
        error: err instanceof Error ? err.message : String(err),
        label: item.label,
      });
      return item;
    }
  }
}

export function registerSlangModuleInstantiationCommands(
  service: SlangModuleInstantiationService
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('verilog.instantiateModule', () => service.instantiateModuleInteract()),
  ];
}

function isHdlDocument(document: vscode.TextDocument): boolean {
  return document.languageId === 'verilog' || document.languageId === 'systemverilog';
}
