import * as fs from 'fs';
import * as path from 'path';
import { Ctags, Symbol } from '../ctags';
import { window, QuickPickItem, workspace, SnippetString, Uri } from 'vscode';
import { Logger } from '../Logger';

export function instantiateModuleInteract() {
    let activeEditorPath = window.activeTextEditor.document.uri.path;
    let activeWorkspace = workspace.workspaceFolders?.find(
        (wsFolder) => {
            const relative = path.relative(wsFolder.uri.fsPath, activeEditorPath);
            return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
        }
    );
    selectFile(activeWorkspace.uri.fsPath).then((srcpath) => {
        instantiateModule(srcpath).then((inst) => {
            window.activeTextEditor.insertSnippet(inst);
        });
    });
}

function instantiateModule(srcpath: string): Thenable<SnippetString> {
    return new Promise<SnippetString>((resolve, reject) => {
        // Using Ctags to get all the modules in the file
        let moduleName: string = '';
        let portsName: string[] = [];
        let parametersName: string[] = [];
        let logger: Logger = new Logger();
        let ctags: moduleTags = new moduleTags(logger);
        console.log('Executing ctags for module instantiation');
        ctags
            .execCtags(srcpath)
            .then((output) => {
                ctags.buildSymbolsList(output);
            })
            .then(async () => {
                let module: Symbol;
                let modules: Symbol[] = ctags.symbols.filter(
                    (tag) => tag.type === 'module'
                );
                // No modules found
                if (modules.length <= 0) {
                    window.showErrorMessage(
                        'Verilog-HDL/SystemVerilog: No modules found in ' + srcpath
                    );
                    return;
                }
                // Only one module found
                else if (modules.length == 1) module = modules[0];
                // many modules found
                else if (modules.length > 1) {
                    moduleName = await window.showQuickPick(
                        ctags.symbols
                            .filter((tag) => tag.type === 'module')
                            .map((tag) => tag.name),
                        {
                            placeHolder: 'Choose a module to instantiate',
                        }
                    );
                    if (moduleName === undefined) return;
                    module = modules.filter(
                        (tag) => tag.name === moduleName
                    )[0];
                }
                let scope =
                    module.parentScope != ''
                        ? module.parentScope + '.' + module.name
                        : module.name;
                let ports: Symbol[] = ctags.symbols.filter(
                    (tag) =>
                        tag.type === 'port' &&
                        tag.parentType === 'module' &&
                        tag.parentScope === scope
                );
                portsName = ports.map((tag) => tag.name);
                let params: Symbol[] = ctags.symbols.filter(
                    (tag) =>
                        tag.type === 'constant' &&
                        tag.parentType === 'module' &&
                        tag.parentScope === scope
                );
                parametersName = params.map((tag) => tag.name);
                console.log(module);
                let paramString = ``;
                if (parametersName.length > 0) {
                    paramString = `\n#(\n${instantiatePort(parametersName)})\n`;
                }
                console.log(portsName);
                resolve(
                    new SnippetString()
                        .appendText(module.name + ' ')
                        .appendText(paramString)
                        .appendPlaceholder('u_')
                        .appendPlaceholder(`${module.name}(\n`)
                        .appendText(instantiatePort(portsName))
                        .appendText(');\n')
                );
            });
    });
}

function instantiatePort(ports: string[]): string {
    let port = '';
    let max_len = 0;
    for (let i = 0; i < ports.length; i++) {
        if (ports[i].length > max_len) max_len = ports[i].length;
    }
    // .NAME(NAME)
    for (let i = 0; i < ports.length; i++) {
        let element = ports[i];
        let padding = max_len - element.length + 1;
        element = element + ' '.repeat(padding);
        port += `\t.${element}(${element})`;
        if (i !== ports.length - 1) {
            port += ',';
        }
        port += '\n';
    }
    return port;
}

function selectFile(workspacePath: string): Thenable<string> {
    // available quick pick items
    let items: QuickPickItem[] = [];

    // retrieve files and directories
    let paths = fs.readdirSync(workspacePath);

    // directories
    paths.filter((file) => fs.statSync(path.join(workspacePath, file)).isDirectory())
    .forEach((filename) => {
            items.push({
                label: filename,
                description: "directory",
            });
    });

    // Verilog and SystemVerilog files
    paths.filter((file) => file.endsWith(".v") || file.endsWith(".sv"))
    .forEach((filename) => {
            items.push({
                label: filename,
            });
    });

    return window
        .showQuickPick(items, {
            placeHolder: 'Choose the module file',
        })
        .then((selected) => {
            if (!selected) {
                return;
            }

            // if is a directory
            let location = path.join(workspacePath, selected.label);
            if (fs.statSync(location).isDirectory()) {
                return selectFile(location);
            }

            // return file path
            return location;
        });
}

class moduleTags extends Ctags {
    buildSymbolsList(tags: string): Thenable<void> {
        console.log('building symbols');
        if (tags === '') {
            console.log('No output from ctags');
            return;
        }
        // Parse ctags output
        let lines: string[] = tags.split(/\r?\n/);
        lines.forEach((line) => {
            if (line !== '') {
                let tag: Symbol = this.parseTagLine(line);
                // add only modules and ports
                if (
                    tag.type === 'module' ||
                    tag.type === 'port' ||
                    tag.type === 'constant'
                )
                    this.symbols.push(tag);
            }
        });
        // skip finding end tags
        console.log(this.symbols);
    }
}
