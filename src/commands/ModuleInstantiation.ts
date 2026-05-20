// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import { Ctags, CtagsManager, Symbol } from '../ctags';
import { type IndexedSymbol } from '../ctagsWorkspaceIndex';
import { getExtensionLogger } from '../logging';
import { getWorkspaceFolderForUri } from '../utils/workspace';

const logger = () => getExtensionLogger('Command', 'ModuleInstantiation');

export interface ModuleQuickPickItem extends vscode.QuickPickItem {
  moduleSymbol: IndexedSymbol;
}

export function instantiateModuleInteract(ctagsManager?: CtagsManager) {
  void instantiateModuleFromWorkspace(ctagsManager).then((inst) => {
    if (inst && vscode.window.activeTextEditor) {
      void vscode.window.activeTextEditor.insertSnippet(inst);
    }
  });
}

export async function instantiateModuleFromWorkspace(
  ctagsManager?: CtagsManager
): Promise<vscode.SnippetString | undefined> {
  if (!isCtagsEnabled()) {
    vscode.window.showInformationMessage(
      'Verilog-HDL/SystemVerilog: Ctags integration is disabled (verilog.ctags.enabled).'
    );
    return undefined;
  }
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage('No active text editor found');
    return undefined;
  }
  const activeDoc = vscode.window.activeTextEditor.document;
  const workspaceFolder = getWorkspaceFolderForUri(activeDoc.uri);
  if (!workspaceFolder || !ctagsManager) {
    return instantiateModule(activeDoc.uri.fsPath);
  }

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Finding Verilog modules',
      cancellable: true,
    },
    async (_progress, token) => {
      const modules = await ctagsManager.findTopLevelModules(workspaceFolder, token);
      if (modules.length === 0) {
        vscode.window.showErrorMessage('Verilog-HDL/SystemVerilog: No modules found in the workspace');
        return undefined;
      }

      const selected = await vscode.window.showQuickPick(
        buildModuleQuickPickItems(modules, workspaceFolder),
        {
          matchOnDescription: true,
          placeHolder: 'Choose a module to instantiate',
        }
      );
      if (!selected) {
        return undefined;
      }

      const members = await ctagsManager.findModuleMembers(selected.moduleSymbol, token);
      return buildInstantiationSnippet(
        selected.moduleSymbol.symbol.name,
        members.ports.map((symbol) => symbol.name),
        members.parameters.map((symbol) => symbol.name),
        getIndentationString()
      );
    }
  );
}

export async function instantiateModule(srcpath: string): Promise<vscode.SnippetString | undefined> {
  if (!isCtagsEnabled()) {
    return undefined;
  }
  if (!vscode.window.activeTextEditor) {
    return undefined;
  }
  const log = logger();
  const ctags = new InstantiationCtags(log, vscode.window.activeTextEditor.document);
  log.info`Executing ctags for module instantiation fallback`;
  const output = await ctags.execCtags(srcpath);
  await ctags.buildSymbolsList(output);
  const modules = ctags.symbols.filter((tag) => tag.type === 'module');
  if (modules.length <= 0) {
    vscode.window.showErrorMessage('Verilog-HDL/SystemVerilog: No modules found in the file');
    return undefined;
  }

  let module = modules[0];
  if (modules.length > 1) {
    const selectedModuleName = await vscode.window.showQuickPick(
      modules.map((tag) => tag.name),
      {
        placeHolder: 'Choose a module to instantiate',
      }
    );
    if (selectedModuleName === undefined) {
      return undefined;
    }
    module = modules.find((tag) => tag.name === selectedModuleName) ?? module;
  }

  const members = findModuleMembersInSymbols(module, ctags.symbols);
  log.info`Module name: ${module.name}`;
  log.info`portsName: ${members.ports.map((symbol) => symbol.name).toString()}`;
  return buildInstantiationSnippet(
    module.name,
    members.ports.map((symbol) => symbol.name),
    members.parameters.map((symbol) => symbol.name),
    getIndentationString()
  );
}

export function buildModuleQuickPickItems(
  modules: readonly IndexedSymbol[],
  workspaceFolder: vscode.WorkspaceFolder
): ModuleQuickPickItem[] {
  return modules.map((moduleSymbol) => ({
    label: moduleSymbol.symbol.name,
    description: path.relative(workspaceFolder.uri.fsPath, moduleSymbol.uri.fsPath),
    moduleSymbol,
  }));
}

export function buildInstantiationSnippet(
  moduleName: string,
  ports: readonly string[],
  parameters: readonly string[],
  indentation = getIndentationString()
): vscode.SnippetString {
  const paramString =
    parameters.length > 0 ? `\n#(\n${instantiatePort(parameters, indentation)})\n` : '';
  return new vscode.SnippetString()
    .appendText(`${moduleName} `)
    .appendText(paramString)
    .appendPlaceholder('u_')
    .appendPlaceholder(`${moduleName}(\n`)
    .appendText(instantiatePort(ports, indentation))
    .appendText(');\n');
}

function isCtagsEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('verilog.ctags');
  return config.get<boolean>('enabled', false);
}

function getIndentationString(): string {
  const editorConfig = vscode.workspace.getConfiguration('editor');

  const useSpaces = editorConfig.get<boolean>('insertSpaces', true);
  const tabSize = editorConfig.get<number>('tabSize', 4);

  if (useSpaces) {
    return ' '.repeat(tabSize);
  }
  return '\t';
}

function instantiatePort(ports: readonly string[], indentation: string): string {
  let port = '';
  const maxLen = ports.reduce((max, current) => Math.max(max, current.length), 0);

  for (let i = 0; i < ports.length; i++) {
    let element = ports[i];
    const padding = maxLen - element.length + 1;
    element = element + ' '.repeat(padding);
    port += indentation;
    port += `.${element}(${element})`;
    if (i !== ports.length - 1) {
      port += ',';
    }
    port += '\n';
  }
  return port;
}

export function shouldShowParentDirectory(currentDir: string, workspaceRoot?: string): boolean {
  if (!workspaceRoot) {
    return false;
  }
  const relative = path.relative(path.resolve(workspaceRoot), path.resolve(currentDir));
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function findModuleMembersInSymbols(
  module: Symbol,
  symbols: readonly Symbol[]
): { ports: Symbol[]; parameters: Symbol[] } {
  const scope = module.parentScope !== '' ? `${module.parentScope}.${module.name}` : module.name;
  return {
    ports: symbols.filter(
      (tag) => tag.type === 'port' && tag.parentType === 'module' && tag.parentScope === scope
    ),
    parameters: symbols.filter(
      (tag) => tag.type === 'parameter' && tag.parentType === 'module' && tag.parentScope === scope
    ),
  };
}

class InstantiationCtags extends Ctags {
  buildSymbolsList(tags: string): Promise<void> {
    if (tags === '') {
      return Promise.resolve();
    }
    const lines: string[] = tags.split(/\r?\n/);
    lines.forEach((line) => {
      if (line !== '') {
        const tag: Symbol | undefined = this.parseTagLine(line);
        if (tag && (tag.type === 'module' || tag.type === 'port' || tag.type === 'parameter')) {
          this.symbols.push(tag);
        }
      }
    });
    return Promise.resolve();
  }
}
