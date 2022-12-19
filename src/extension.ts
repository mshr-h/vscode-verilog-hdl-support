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
import * as semver from 'semver';

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
var languageClients = new Map<string, LanguageClient>();

export function activate(context: ExtensionContext) {
    logger.log(extensionID + ' is now active!');

    BsvInfoProviderManger.getInstance().onWorkspace();
    workspace.onDidChangeWorkspaceFolders((_e) => {
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
        lintManager.runLintTool,
        lintManager
    );

    // Configure language server
    workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration("verilog.languageServer")) {
            return;
        }
        stopAllLanguageClients().finally(() => {
            initAllLanguageClients();
        });
    });
    initAllLanguageClients();

    logger.log('Activation complete');
}

function setupLanguageClient(name: string, defaultPath: string, serverArgs: string[], serverDebugArgs: string[], clientOptions: LanguageClientOptions) {
    let lsConfig = workspace.getConfiguration('verilog.languageServer.' + name);
    let enabled: boolean = <boolean>(lsConfig.get('enabled', false));

    let binPath = <string>(lsConfig.get('path', defaultPath));

    let serverOptions = {
        'run': { command: binPath, args: serverArgs },
        'debug': { command: binPath, args: serverDebugArgs },
    };

    languageClients.set(name, new LanguageClient(
        name,
        name + ' language server',
        serverOptions,
        clientOptions
    ));
    if (!enabled) { return; }
    languageClients.get(name).start();
    logger.log('"' + name + '" language server started.');
}

function stopAllLanguageClients(): Promise<any> {
    var p = [];
    for (const [name, client] of languageClients) {
        if (client.isRunning()) {
            p.push(client.stop());
            logger.log('"' + name + '" language server stopped.');
        }
    }
    return Promise.all(p);
}

function initAllLanguageClients() {
    // init svls
    setupLanguageClient("svls", "svls", [], ["--debug"], {
        documentSelector: [{ scheme: 'file', language: 'systemverilog' },],
    });

    // init veridian
    setupLanguageClient("veridian", "veridian", [], [], {
        documentSelector: [{ scheme: 'file', language: 'systemverilog' },],
    });

    // init hdlChecker
    setupLanguageClient("hdlChecker", "hdl_checker", ["--lsp"], ["--lsp"],
        {
            documentSelector: [
                { scheme: 'file', language: 'verilog' },
                { scheme: 'file', language: 'systemverilog' },
                { scheme: "file", language: "vhdl" },
            ],
        });
}

function checkIfUpdated(context: ExtensionContext) {
    let previousVersion = new semver.SemVer(context.globalState.get('version', '0.0.0'));
    let currentVersion = new semver.SemVer(extensions.getExtension(extensionID).packageJSON.version);
    if (previousVersion < currentVersion) {
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
    }

    // update version value
    context.globalState.update('version', currentVersion.version);
}

export function deactivate(): Thenable<void> {
    logger.log('Deactivated');
    return stopAllLanguageClients();
}
