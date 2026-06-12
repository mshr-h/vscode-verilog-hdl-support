// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { IndexService } from '../semantic/IndexService';
import type { ModuleRecord } from '../semantic/SymbolRecords';

export type InstantiationFallback = () => void | Promise<void>;

interface ModuleQuickPickItem extends vscode.QuickPickItem {
  module: ModuleRecord;
}

export class InstantiationService {
  constructor(private readonly indexService: IndexService) {}

  async instantiateModuleInteract(fallback: InstantiationFallback): Promise<void> {
    if (!useProjectIndex()) {
      await fallback();
      return;
    }

    const modules = this.indexService.getIndex().getAllModules();
    if (modules.length === 0) {
      await fallback();
      return;
    }

    const selected = await vscode.window.showQuickPick(
      modules.map((moduleRecord): ModuleQuickPickItem => ({
        label: moduleRecord.name,
        description: moduleRecord.compileUnitId,
        detail: moduleRecord.uri.fsPath,
        module: moduleRecord,
      })),
      { placeHolder: 'Choose a module to instantiate' }
    );
    if (!selected) {
      await fallback();
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active text editor found');
      return;
    }
    await editor.insertSnippet(buildModuleInstantiationSnippet(selected.module));
  }
}

export function buildModuleInstantiationSnippet(moduleRecord: ModuleRecord): vscode.SnippetString {
  const parameterNames = moduleRecord.parameters.map((parameter) => parameter.name);
  const portNames = moduleRecord.ports.map((port) => port.name);
  let paramString = '';
  if (parameterNames.length > 0) {
    paramString = `\n#(\n${instantiatePortNames(parameterNames)})\n`;
  }
  return new vscode.SnippetString()
    .appendText(`${moduleRecord.name} `)
    .appendText(paramString)
    .appendPlaceholder('u_')
    .appendPlaceholder(`${moduleRecord.name}(\n`)
    .appendText(instantiatePortNames(portNames))
    .appendText(');\n');
}

export function instantiatePortNames(names: string[]): string {
  let port = '';
  let maxLen = 0;
  const indent = getIndentationString();

  for (const name of names) {
    if (name.length > maxLen) {
      maxLen = name.length;
    }
  }

  for (let i = 0; i < names.length; i += 1) {
    const name = names[i] ?? '';
    const element = `${name}${' '.repeat(maxLen - name.length + 1)}`;
    port += indent;
    port += `.${element}(${element})`;
    if (i !== names.length - 1) {
      port += ',';
    }
    port += '\n';
  }
  return port;
}

function useProjectIndex(): boolean {
  return vscode.workspace
    .getConfiguration('verilog.instantiate')
    .get<boolean>('useProjectIndex', true);
}

function getIndentationString(): string {
  const editorConfig = vscode.workspace.getConfiguration('editor');
  const useSpaces = editorConfig.get<boolean>('insertSpaces', true);
  const tabSize = editorConfig.get<number>('tabSize', 4);
  return useSpaces ? ' '.repeat(tabSize) : '\t';
}
