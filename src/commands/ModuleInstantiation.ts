// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import type { SlangCommandClient } from '../slangServer/SlangCommandClient';

interface ModuleQuickPickItem extends vscode.QuickPickItem {
  moduleName: string;
  uri: vscode.Uri;
}

export async function instantiateModuleInteract(
  slangCommands: SlangCommandClient
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isHdlDocument(editor.document)) {
    vscode.window.showWarningMessage('Open a Verilog/SystemVerilog editor before instantiating a module.');
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri)
    ?? vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Open a workspace before instantiating a module.');
    return;
  }

  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, '**/*.{v,sv}'),
    new vscode.RelativePattern(workspaceFolder, '**/{.git,node_modules,build,sim,out,dist}/**'),
    500
  );
  const moduleItems: ModuleQuickPickItem[] = [];
  for (const uri of files) {
    const modules = await safeGetModulesInFile(slangCommands, uri.fsPath);
    for (const moduleName of modules) {
      moduleItems.push({
        label: moduleName,
        description: path.relative(workspaceFolder.uri.fsPath, uri.fsPath).split(path.sep).join('/'),
        moduleName,
        uri,
      });
    }
  }

  if (moduleItems.length === 0) {
    vscode.window.showInformationMessage(
      'No modules were returned by slang-server. Use completion/code actions after slang-server finishes indexing.'
    );
    return;
  }

  const selected = await vscode.window.showQuickPick(moduleItems, {
    placeHolder: 'Choose a module to instantiate',
    matchOnDescription: true,
  });
  if (!selected) {
    return;
  }

  await editor.insertSnippet(buildMinimalInstantiationSnippet(selected.moduleName));
  vscode.window.showInformationMessage(
    'Inserted a minimal instance. Use slang-server completion/code actions to expand ports and parameters.'
  );
}

export function buildMinimalInstantiationSnippet(moduleName: string): vscode.SnippetString {
  return new vscode.SnippetString()
    .appendText(`${moduleName} `)
    .appendPlaceholder(`u_${moduleName}`)
    .appendText(' (\n')
    .appendPlaceholder('// ports')
    .appendText('\n);\n');
}

export async function instantiateModule(_srcpath: string): Promise<vscode.SnippetString | undefined> {
  return undefined;
}

export function shouldShowParentDirectory(currentDir: string, workspaceRoot?: string): boolean {
  if (!workspaceRoot) {
    return false;
  }
  const relative = path.relative(path.resolve(workspaceRoot), path.resolve(currentDir));
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function safeGetModulesInFile(
  slangCommands: SlangCommandClient,
  fsPath: string
): Promise<string[]> {
  try {
    return await slangCommands.getModulesInFile(fsPath);
  } catch {
    return [];
  }
}

function isHdlDocument(document: vscode.TextDocument): boolean {
  return document.languageId === 'verilog' || document.languageId === 'systemverilog';
}
