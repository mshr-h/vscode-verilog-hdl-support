'use strict';
import * as vscode from 'vscode';
import { SemVer } from 'semver';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from 'vscode-languageclient/node';

import LintManager from './linter/LintManager';
import { CtagsManager } from './ctags';
import * as DocumentSymbolProvider from './providers/DocumentSymbolProvider';
import * as HoverProvider from './providers/HoverProvider';
import * as DefinitionProvider from './providers/DefinitionProvider';
import * as CompletionItemProvider from './providers/CompletionItemProvider';
import { BsvInfoProviderManger } from './BsvProvider';
import * as ModuleInstantiation from './commands/ModuleInstantiation';
import { Logger } from './logger';

let lintManager: LintManager;
export let logger: Logger; // Global logger
export let ctagsManager: CtagsManager;
export var extensionID: string = 'mshr-h.veriloghdl';
let languageClients = new Map<string, LanguageClient>();

export function activate(context: vscode.ExtensionContext) {
    logger = new Logger();
    logger.log(extensionID + ' is now active!');

    BsvInfoProviderManger.getInstance().onWorkspace();
    vscode.workspace.onDidChangeWorkspaceFolders((_e) => {
        BsvInfoProviderManger.getInstance().onWorkspace();
    });

    // document selector
    let systemverilogSelector: vscode.DocumentSelector = {
        scheme: 'file',
        language: 'systemverilog',
    };
    let verilogSelector: vscode.DocumentSelector = {
        scheme: 'file',
        language: 'verilog',
    };
    let bsvSelector: vscode.DocumentSelector = { scheme: 'file', language: 'bsv' };

    // If the extension was update, ask to show changelog
    askShowChangelogIfUpdated(context);

    // Configure ctags
    ctagsManager = new CtagsManager(logger);
    ctagsManager.configure();

    // Configure lint manager
    lintManager = new LintManager(logger);

    // Configure Document Symbol Provider
    let docProvider = new DocumentSymbolProvider.VerilogDocumentSymbolProvider(logger);
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            systemverilogSelector,
            docProvider
        )
    );
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(verilogSelector, docProvider)
    );
    let bsvdocProvider = new DocumentSymbolProvider.BsvDocumentSymbolProvider(logger);
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(bsvSelector, bsvdocProvider)
    );

    // Configure Completion Item Provider
    // Trigger on ".", "(", "="
    let compItemProvider = new CompletionItemProvider.VerilogCompletionItemProvider(logger);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            verilogSelector,
            compItemProvider,
            '.',
            '(',
            '='
        )
    );
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            systemverilogSelector,
            compItemProvider,
            '.',
            '(',
            '='
        )
    );
    let bsvcompItemProvider = new CompletionItemProvider.BsvCompletionItemProvider(logger);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            bsvSelector,
            bsvcompItemProvider,
            '.',
            '(',
            '='
        )
    );

    // Configure Hover Providers
    let veriloghoverProvider = new HoverProvider.VerilogHoverProvider(logger);
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(systemverilogSelector, veriloghoverProvider)
    );
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(verilogSelector, veriloghoverProvider)
    );
    let bsvhoverProvider = new HoverProvider.BsvHoverProvider(logger);
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(bsvSelector, bsvhoverProvider)
    );

    // Configure Definition Providers
    let defProvider = new DefinitionProvider.VerilogDefinitionProvider(logger);
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(systemverilogSelector, defProvider)
    );
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(verilogSelector, defProvider)
    );
    let bsvdefProvider = new DefinitionProvider.BsvDefinitionProvider();
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(bsvSelector, bsvdefProvider)
    );

    // Configure command to instantiate a module
    vscode.commands.registerCommand(
        'verilog.instantiateModule',
        ModuleInstantiation.instantiateModuleInteract
    );
    // Register command for manual linting
    vscode.commands.registerCommand(
        'verilog.lint',
        lintManager.runLintTool,
        lintManager
    );

    // Configure language server
    vscode.workspace.onDidChangeConfiguration((event) => {
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
    let settings = vscode.workspace.getConfiguration('verilog.languageServer.' + name);
    let enabled: boolean = <boolean>(settings.get('enabled', false));

    let binPath = <string>(settings.get('path', defaultPath));

    let serverOptions: ServerOptions = {
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

function askShowChangelogIfUpdated(context: vscode.ExtensionContext) {
    let previousVersion = new SemVer(context.globalState.get('version', '0.0.0'));
    let currentVersion = new SemVer(vscode.extensions.getExtension(extensionID).packageJSON.version);
    if (previousVersion < currentVersion) {
        vscode.window
            .showInformationMessage(
                'Verilog-HDL/SystemVerilog extension has been updated',
                'Open Changelog'
            )
            .then(function (_: string) {
                // get path of CHANGELOG.md
                let changelogPath: string =
                    vscode.extensions.getExtension(extensionID).extensionPath +
                    '/CHANGELOG.md';
                let changelogUri = vscode.Uri.file(changelogPath);
                // open
                vscode.workspace.openTextDocument(changelogUri).then((doc) => {
                    vscode.window.showTextDocument(doc);
                });
            });
    }

    // update version value
    context.globalState.update('version', currentVersion.version);
}

export function deactivate(): Thenable<void> {
    logger.log('Deactivated');
    return stopAllLanguageClients();
}
