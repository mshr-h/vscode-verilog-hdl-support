'use strict';
import * as vscode from 'vscode';
import { SemVer } from 'semver';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

import LintManager from './linter/LintManager';
import { CtagsManager } from './ctags';
import * as DocumentSymbolProvider from './providers/DocumentSymbolProvider';
import * as HoverProvider from './providers/HoverProvider';
import * as DefinitionProvider from './providers/DefinitionProvider';
import * as CompletionItemProvider from './providers/CompletionItemProvider';
import { BsvInfoProviderManger } from './BsvProvider';
import * as ModuleInstantiation from './commands/ModuleInstantiation';
import * as FormatProvider from './providers/FormatPrivider';

export var logger: vscode.LogOutputChannel; // Global logger
export var ctagsManager: CtagsManager;
export let extensionID: string = 'mshr-h.veriloghdl';

let lintManager: LintManager;
let languageClients = new Map<string, LanguageClient>();

export function activate(context: vscode.ExtensionContext) {
  logger = vscode.window.createOutputChannel('Verilog', { log: true });
  logger.info(extensionID + ' activation started.');

  BsvInfoProviderManger.getInstance().onWorkspace();
  vscode.workspace.onDidChangeWorkspaceFolders((_e) => {
    BsvInfoProviderManger.getInstance().onWorkspace();
  });

  // document selector
  let systemVerilogSelector: vscode.DocumentSelector = {
    scheme: 'file',
    language: 'systemverilog',
  };
  let verilogSelector: vscode.DocumentSelector = {
    scheme: 'file',
    language: 'verilog',
  };
  let bsvSelector: vscode.DocumentSelector = {
    scheme: 'file',
    language: 'bsv',
  };

  // If the extension was update, ask to show changelog
  askShowChangelogIfUpdated(context);

  // Configure ctags
  ctagsManager = new CtagsManager(logger);
  ctagsManager.configure();

  // Configure lint manager
  lintManager = new LintManager(logger);

  // Configure Document Symbol Provider
  let verilogDocumentSymbolProvider = new DocumentSymbolProvider.VerilogDocumentSymbolProvider(
    logger
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      systemVerilogSelector,
      verilogDocumentSymbolProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(verilogSelector, verilogDocumentSymbolProvider)
  );
  let bsvDocumentSymbolProvider = new DocumentSymbolProvider.BsvDocumentSymbolProvider(logger);
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(bsvSelector, bsvDocumentSymbolProvider)
  );

  // Configure Completion Item Provider
  // Trigger on ".", "(", "="
  let verilogCompletionItemProvider = new CompletionItemProvider.VerilogCompletionItemProvider(
    logger
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      verilogSelector,
      verilogCompletionItemProvider,
      '.',
      '(',
      '='
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      systemVerilogSelector,
      verilogCompletionItemProvider,
      '.',
      '(',
      '='
    )
  );
  let bsvCompletionItemProvider = new CompletionItemProvider.BsvCompletionItemProvider(logger);
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      bsvSelector,
      bsvCompletionItemProvider,
      '.',
      '(',
      '='
    )
  );

  // Configure Hover Providers
  let verilogHoverProvider = new HoverProvider.VerilogHoverProvider(logger);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(systemVerilogSelector, verilogHoverProvider)
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(verilogSelector, verilogHoverProvider)
  );
  let bsvHoverProvider = new HoverProvider.BsvHoverProvider(logger);
  context.subscriptions.push(vscode.languages.registerHoverProvider(bsvSelector, bsvHoverProvider));

  // Configure Definition Providers
  let verilogDefinitionProvider = new DefinitionProvider.VerilogDefinitionProvider(logger);
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(systemVerilogSelector, verilogDefinitionProvider)
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(verilogSelector, verilogDefinitionProvider)
  );
  let bsvDefinitionProvider = new DefinitionProvider.BsvDefinitionProvider();
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(bsvSelector, bsvDefinitionProvider)
  );

  // Configure Format Provider
  let verilogFormatProvider = new FormatProvider.VerilogFormatProvider(logger);
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(verilogSelector, verilogFormatProvider)
  );
  let systemVerilogFormatProvider = new FormatProvider.SystemVerilogFormatProvider(logger);
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      systemVerilogSelector,
      systemVerilogFormatProvider
    )
  );

  // Configure command to instantiate a module
  vscode.commands.registerCommand(
    'verilog.instantiateModule',
    ModuleInstantiation.instantiateModuleInteract,
    logger
  );

  // Register command for manual linting
  vscode.commands.registerCommand('verilog.lint', lintManager.runLintTool, lintManager);

  // Configure language server
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration('verilog.languageServer')) {
      return;
    }
    stopAllLanguageClients().finally(() => {
      initAllLanguageClients();
    });
  });
  initAllLanguageClients();

  logger.info(extensionID + ' activation finished.');
}

function setupLanguageClient(
  name: string,
  defaultPath: string,
  serverArgs: string[],
  serverDebugArgs: string[],
  clientOptions: LanguageClientOptions
) {
  let settings = vscode.workspace.getConfiguration('verilog.languageServer.' + name);
  let enabled: boolean = <boolean>settings.get('enabled', false);

  let binPath = <string>settings.get('path', defaultPath);

  let serverOptions: ServerOptions = {
    run: { command: binPath, args: serverArgs },
    debug: { command: binPath, args: serverDebugArgs },
  };

  languageClients.set(
    name,
    new LanguageClient(name, name + ' language server', serverOptions, clientOptions)
  );
  if (!enabled) {
    return;
  }
  languageClients.get(name).start();
  logger.info('"' + name + '" language server started.');
}

function initAllLanguageClients() {
  // init svls
  setupLanguageClient('svls', 'svls', [], ['--debug'], {
    documentSelector: [{ scheme: 'file', language: 'systemverilog' }],
  });

  // init veridian
  setupLanguageClient('veridian', 'veridian', [], [], {
    documentSelector: [{ scheme: 'file', language: 'systemverilog' }],
  });

  // init hdlChecker
  setupLanguageClient('hdlChecker', 'hdl_checker', ['--lsp'], ['--lsp'], {
    documentSelector: [
      { scheme: 'file', language: 'verilog' },
      { scheme: 'file', language: 'systemverilog' },
      { scheme: 'file', language: 'vhdl' },
    ],
  });
}

function stopAllLanguageClients(): Promise<any> {
  var p = [];
  for (const [name, client] of languageClients) {
    if (client.isRunning()) {
      p.push(client.stop());
      logger.info('"' + name + '" language server stopped.');
    }
  }
  return Promise.all(p);
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
          vscode.extensions.getExtension(extensionID).extensionPath + '/CHANGELOG.md';
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
  logger.info('Deactivated');
  return stopAllLanguageClients();
}
