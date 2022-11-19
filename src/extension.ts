'use strict';

import {
    workspace,
    window,
    DocumentSelector,
    ExtensionContext,
    extensions,
    Uri,
    languages,
    commands,
} from 'vscode';

// Linters
import LintManager from './linter/LintManager';

// ctags
import { CtagsManager } from './ctags';

// Providers
import {
    VerilogDocumentSymbolProvider,
    BsvDocumentSymbolProvider,
} from './providers/DocumentSymbolProvider';
import {
    VerilogHoverProvider,
    BsvHoverProvider,
} from './providers/HoverProvider';
import {
    VerilogDefinitionProvider,
    BsvDefinitionProvider,
} from './providers/DefinitionProvider';
import {
    VerilogCompletionItemProvider,
    BsvCompletionItemProvider,
} from './providers/CompletionItemProvider';

import { BsvInfoProviderManger } from './BsvProvider';

// Commands
import * as ModuleInstantiation from './commands/ModuleInstantiation';

// Language Server
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from 'vscode-languageclient/node';

// Logger
import { Logger } from './Logger';
import { Server } from 'http';
import { start } from 'repl';

let lintManager: LintManager;
let logger: Logger = new Logger();
export let ctagsManager: CtagsManager = new CtagsManager(logger);
export var extensionID: string = 'mshr-h.veriloghdl';
let client: LanguageClient;

export function activate(context: ExtensionContext) {
    console.log(extensionID + ' is now active!');

    BsvInfoProviderManger.getInstance().onWorkspace();
    workspace.onDidChangeWorkspaceFolders((e) => {
        BsvInfoProviderManger.getInstance().onWorkspace();
    });

    // document selector
    let systemverilogSelector: DocumentSelector = {
        scheme: 'file',
        language: 'systemverilog',
    };
    let verilogSelector: DocumentSelector = {
        scheme: 'file',
        language: 'verilog',
    };
    let bsvSelector: DocumentSelector = { scheme: 'file', language: 'bsv' };

    // Check if the Extension was updated recently
    checkIfUpdated(context);

    // Configure ctags
    ctagsManager.configure();

    // Configure lint manager
    lintManager = new LintManager(logger);

    // Configure Document Symbol Provider
    let docProvider = new VerilogDocumentSymbolProvider(logger);
    context.subscriptions.push(
        languages.registerDocumentSymbolProvider(
            systemverilogSelector,
            docProvider
        )
    );
    context.subscriptions.push(
        languages.registerDocumentSymbolProvider(verilogSelector, docProvider)
    );
    let bsvdocProvider = new BsvDocumentSymbolProvider(logger);
    context.subscriptions.push(
        languages.registerDocumentSymbolProvider(bsvSelector, bsvdocProvider)
    );

    // Configure Completion Item Provider
    // Trigger on ".", "(", "="
    let compItemProvider = new VerilogCompletionItemProvider(logger);
    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            verilogSelector,
            compItemProvider,
            '.',
            '(',
            '='
        )
    );
    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            systemverilogSelector,
            compItemProvider,
            '.',
            '(',
            '='
        )
    );
    let bsvcompItemProvider = new BsvCompletionItemProvider(logger);
    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            bsvSelector,
            bsvcompItemProvider,
            '.',
            '(',
            '='
        )
    );

    // Configure Hover Providers
    let hoverProvider = new VerilogHoverProvider(logger);
    context.subscriptions.push(
        languages.registerHoverProvider(systemverilogSelector, hoverProvider)
    );
    context.subscriptions.push(
        languages.registerHoverProvider(verilogSelector, hoverProvider)
    );
    let bsvhoverProvider = new BsvHoverProvider(logger);
    context.subscriptions.push(
        languages.registerHoverProvider(bsvSelector, bsvhoverProvider)
    );

    // Configure Definition Providers
    let defProvider = new VerilogDefinitionProvider(logger);
    context.subscriptions.push(
        languages.registerDefinitionProvider(systemverilogSelector, defProvider)
    );
    context.subscriptions.push(
        languages.registerDefinitionProvider(verilogSelector, defProvider)
    );
    let bsvdefProvider = new BsvDefinitionProvider();
    context.subscriptions.push(
        languages.registerDefinitionProvider(bsvSelector, bsvdefProvider)
    );

    // Configure command to instantiate a module
    commands.registerCommand(
        'verilog.instantiateModule',
        ModuleInstantiation.instantiateModuleInteract
    );
    // Register command for manual linting
    commands.registerCommand(
        'verilog.lint',
        lintManager.RunLintTool,
        lintManager
    );

    // Configure svls language server
    configLanguageServer();

    logger.log('Activation complete');
}

function configLanguageServer() {
    let verilogconfig = workspace.getConfiguration('verilog');
    let enabled: boolean = <boolean>(
        verilogconfig.get('languageServer.enabled', false)
    );

    if (!enabled) {
        console.log('Language server is disabled by the config');
        return;
    }

    let name: string = <string>verilogconfig.get('languageServer.name', 'none');
    var bin_path: string;

    var serverOptions: ServerOptions;
    var clientOptions: LanguageClientOptions;

    switch (name) {
        case 'svls':
            bin_path = <string>(
                verilogconfig.get('languageServer.pathSvls', 'svls')
            );
            serverOptions = {
                'run': { command: bin_path },
                'debug': { command: bin_path, args: ['--debug'] },
            };
            clientOptions = {
                documentSelector: [
                    { scheme: 'file', language: 'systemverilog' },
                ],
            };
            break;
        case 'veridian':
            bin_path = <string>(
                verilogconfig.get('languageServer.pathVeridian', 'veridian')
            );
            serverOptions = {
                'run': { command: bin_path },
                'debug': { command: bin_path },
            };
            clientOptions = {
                documentSelector: [
                    { scheme: 'file', language: 'systemverilog' },
                ],
            };
            break;
        case 'hdl_checker':
            bin_path = <string>(
                verilogconfig.get('languageServer.pathHdlChecker', 'hdl_checker')
            );
            serverOptions = {
                'run': { command: bin_path },
                'debug': { command: bin_path },
            };
            clientOptions = {
                documentSelector: [
                    { scheme: 'file', language: 'verilog' },
                    { scheme: 'file', language: 'systemverilog' },
                    { scheme: "file", language: "vhdl" },
                ],
            };
            break;
        default:
            console.log('Invalid language server name: ' + name);
            client = null;
            return;
    }

    client = new LanguageClient(
        name,
        name + ' language server',
        serverOptions,
        clientOptions
    );
    client.start();
    console.log('Language server "' + bin_path + '" started.');
}

function checkIfUpdated(context: ExtensionContext) {
    // Get previous version
    let prevVersion: string = context.globalState.get('version', '0.0.0');
    let pv = prevVersion.split('.').map(Number);
    // Get current version
    let currVersion: string =
        extensions.getExtension(extensionID).packageJSON.version;
    logger.log(extensionID + ' v' + currVersion);
    let cv = currVersion.split('.').map(Number);
    // check if current version > previous version
    for (let i = 0; i < pv.length; i++) {
        if (pv[i] < cv[i]) {
            showUpdatedNotif();
            break;
        }
    }
    // update the value
    context.globalState.update('version', currVersion);
}

function showUpdatedNotif() {
    logger.log('Recently Updated');
    window
        .showInformationMessage(
            'Verilog-HDL/SystemVerilog extension has been updated',
            'Open Changelog'
        )
        .then(function (str: string) {
            if (str === 'Open Changelog') {
                // get path of CHANGELOG.md
                let changelogPath: string =
                    extensions.getExtension(extensionID).extensionPath +
                    '/CHANGELOG.md';
                let path = Uri.file(changelogPath);
                // open
                workspace.openTextDocument(path).then((doc) => {
                    window.showTextDocument(doc);
                });
            }
        });
    logger.log('Update notification shown');
}

export function deactivate() {
    if (client) {
        return client.stop();
    }
    logger.log('Deactivated');
}
