// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Ctags, Symbol } from '../ctags';
import { logger } from '../extension';

export function instantiateModuleInteract() {
  if (!isCtagsEnabled()) {
    vscode.window.showInformationMessage(
      'Verilog-HDL/SystemVerilog: Ctags integration is disabled (verilog.ctags.enabled).'
    );
    return;
  }
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage('No active text editor found');
    return;
  }
  let filePath = path.dirname(vscode.window.activeTextEditor.document.fileName);
  selectFile(filePath).then((srcpath) => {
    if (srcpath === undefined) {
      return;
    }
    instantiateModule(srcpath).then((inst) => {
      if (inst && vscode.window.activeTextEditor) {
        vscode.window.activeTextEditor.insertSnippet(inst);
      }
    });
  });
}

export async function instantiateModule(srcpath: string): Promise<vscode.SnippetString | undefined> {
    if (!isCtagsEnabled()) {
      return undefined;
    }
    // Using Ctags to get all the modules in the file
    let moduleName: string = '';
    let portsName: string[] = [];
    let parametersName: string[] = [];
    if (!vscode.window.activeTextEditor) {
      return undefined;
    }
    let file: vscode.TextDocument = vscode.window.activeTextEditor.document;
    let ctags: ModuleTags = new ModuleTags(logger, file);
    logger.info('Executing ctags for module instantiation');
    let output = await ctags.execCtags(srcpath);
    await ctags.buildSymbolsList(output);
    let module: Symbol | undefined;
    let modules: Symbol[] = ctags.symbols.filter((tag) => tag.type === 'module');
    // No modules found
    if (modules.length <= 0) {
      vscode.window.showErrorMessage('Verilog-HDL/SystemVerilog: No modules found in the file');
      return undefined;
    }
    // Only one module found
    else if (modules.length === 1) {
      module = modules[0];
    }
    // many modules found
    else if (modules.length > 1) {
      const selectedModuleName = await vscode.window.showQuickPick(
        ctags.symbols.filter((tag) => tag.type === 'module').map((tag) => tag.name),
        {
          placeHolder: 'Choose a module to instantiate',
        }
      );
      if (selectedModuleName === undefined) {
        return undefined;
      }
      moduleName = selectedModuleName;
      module = modules.filter((tag) => tag.name === moduleName)[0];
    }
    if (!module) {
      return undefined;
    }
    let scope = module.parentScope !== '' ? module.parentScope + '.' + module.name : module.name;
    let ports: Symbol[] = ctags.symbols.filter(
      (tag) => tag.type === 'port' && tag.parentType === 'module' && tag.parentScope === scope
    );
    portsName = ports.map((tag) => tag.name);
    let params: Symbol[] = ctags.symbols.filter(
      (tag) =>
        tag.type === 'parameter' && tag.parentType === 'module' && tag.parentScope === scope
    );
    parametersName = params.map((tag) => tag.name);
    logger.info('Module name: ' + module.name);
    let paramString = ``;
    if (parametersName.length > 0) {
      paramString = `\n#(\n${instantiatePort(parametersName)})\n`;
    }
    logger.info('portsName: ' + portsName.toString());
    return new vscode.SnippetString()
        .appendText(module.name + ' ')
        .appendText(paramString)
        .appendPlaceholder('u_')
        .appendPlaceholder(`${module.name}(\n`)
        .appendText(instantiatePort(portsName))
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
  } else {
    return '\t';
  }
}

function instantiatePort(ports: string[]): string {
  let port = '';
  let maxLen = 0;
  let indent = getIndentationString();

  for (let i = 0; i < ports.length; i++) {
    if (ports[i].length > maxLen) {
      maxLen = ports[i].length;
    }
  }
  // .NAME(NAME)
  for (let i = 0; i < ports.length; i++) {
    let element = ports[i];
    let padding = maxLen - element.length + 1;
    element = element + ' '.repeat(padding);
    port += indent;
    port += `.${element}(${element})`;
    if (i !== ports.length - 1) {
      port += ',';
    }
    port += '\n';
  }
  return port;
}

async function selectFile(currentDir?: string): Promise<string | undefined> {
  currentDir = currentDir || vscode.workspace.rootPath;

  if (!currentDir) {
    return undefined;
  }

  let dirs = getDirectories(currentDir);
  // if is subdirectory, add '../'
  if (currentDir !== vscode.workspace.rootPath) {
    dirs.unshift('..');
  }
  // all files ends with '.sv'
  let files = getFiles(currentDir).filter((file) => file.endsWith('.v') || file.endsWith('.sv'));

  // available quick pick items
  // Indicate folders in the Quick pick
  let items: vscode.QuickPickItem[] = [];
  dirs.forEach((dir) => {
    items.push({
      label: dir,
      description: 'folder',
    });
  });
  files.forEach((file) => {
    items.push({
      label: file,
    });
  });

  let selected = await vscode.window
    .showQuickPick(items, {
      placeHolder: 'Choose the module file',
    });
  if (!selected) {
    return undefined;
  }

  // if is a directory
  let location = path.join(currentDir, selected.label);
  if (fs.statSync(location).isDirectory()) {
    return selectFile(location);
  }

  // return file path
  return location;
}

function getDirectories(srcpath: string): string[] {
  return fs
    .readdirSync(srcpath)
    .filter((file) => fs.statSync(path.join(srcpath, file)).isDirectory());
}

function getFiles(srcpath: string): string[] {
  return fs.readdirSync(srcpath).filter((file) => fs.statSync(path.join(srcpath, file)).isFile());
}

class ModuleTags extends Ctags {
  buildSymbolsList(tags: string): Promise<void> {
    if (tags === '') {
      return Promise.resolve();
    }
    // Parse ctags output
    let lines: string[] = tags.split(/\r?\n/);
    lines.forEach((line) => {
      if (line !== '') {
        let tag: Symbol | undefined = this.parseTagLine(line);
        // add only modules, ports and parameters
        // Use 'parameter' type instead of 'constant' after #102
        if (tag && (tag.type === 'module' || tag.type === 'port' || tag.type === 'parameter')) {
          this.symbols.push(tag);
        }
      }
    });
    // skip finding end tags
    return Promise.resolve();
  }
}
