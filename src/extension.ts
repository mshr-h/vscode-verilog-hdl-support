// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
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
import { ExtensionManager } from './extensionManager';
import { createLogger, Logger } from './logger';

export var logger: Logger; // Global logger
var ctagsManager: CtagsManager;
let extensionID: string = 'mshr-h.veriloghdl';

let lintManager: LintManager;
let languageClients = new Map<string, LanguageClient>();

export function activate(context: vscode.ExtensionContext) {
  logger = createLogger('Verilog');
  logger.info(extensionID + ' is now active.');

  let extMgr = new ExtensionManager(context, extensionID, logger.getChild('ExtensionManager'));
  if (extMgr.isVersionUpdated()) {
    extMgr.showChangelogNotification();
  }

  BsvInfoProviderManger.getInstance().onWorkspace(logger);
  vscode.workspace.onDidChangeWorkspaceFolders((_e) => {
    BsvInfoProviderManger.getInstance().onWorkspace(logger);
  });

  // Configure ctags
  ctagsManager = new CtagsManager(logger.getChild('CtagsManager'));
  ctagsManager.configure();

  // Configure Document Symbol Provider
  let verilogDocumentSymbolProvider = new DocumentSymbolProvider.VerilogDocumentSymbolProvider(
    logger.getChild('VerilogDocumentSymbolProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: 'file', language: 'verilog' },
      verilogDocumentSymbolProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: 'file', language: 'systemverilog' },
      verilogDocumentSymbolProvider
    )
  );
  let bsvDocumentSymbolProvider = new DocumentSymbolProvider.BsvDocumentSymbolProvider(
    logger.getChild('BsvDocumentSymbolProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: 'file', language: 'bsv' },
      bsvDocumentSymbolProvider
    )
  );

  // Configure Completion Item Provider
  // Trigger on ".", "(", "="
  let verilogCompletionItemProvider = new CompletionItemProvider.VerilogCompletionItemProvider(
    logger.getChild('VerilogCompletionItemProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'verilog' },
      verilogCompletionItemProvider,
      '.',
      '(',
      '='
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'systemverilog' },
      verilogCompletionItemProvider,
      '.',
      '(',
      '='
    )
  );
  let bsvCompletionItemProvider = new CompletionItemProvider.BsvCompletionItemProvider(
    logger.getChild('BsvCompletionItemProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'bsv' },
      bsvCompletionItemProvider,
      '.',
      '(',
      '='
    )
  );

  // Configure Hover Providers
  let verilogHoverProvider = new HoverProvider.VerilogHoverProvider(
    logger.getChild('VerilogHoverProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { scheme: 'file', language: 'verilog' },
      verilogHoverProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { scheme: 'file', language: 'systemverilog' },
      verilogHoverProvider
    )
  );
  let bsvHoverProvider = new HoverProvider.BsvHoverProvider(logger.getChild('BsvHoverProvider'));
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ scheme: 'file', language: 'bsv' }, bsvHoverProvider)
  );

  // Configure Definition Providers
  let verilogDefinitionProvider = new DefinitionProvider.VerilogDefinitionProvider(
    logger.getChild('VerilogDefinitionProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { scheme: 'file', language: 'verilog' },
      verilogDefinitionProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { scheme: 'file', language: 'systemverilog' },
      verilogDefinitionProvider
    )
  );
  let bsvDefinitionProvider = new DefinitionProvider.BsvDefinitionProvider();
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { scheme: 'file', language: 'bsv' },
      bsvDefinitionProvider
    )
  );

  // Configure Format Provider
  let verilogFormatProvider = new FormatProvider.VerilogFormatProvider(
    logger.getChild('VerilogFormatProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'verilog' },
      verilogFormatProvider
    )
  );
  let systemVerilogFormatProvider = new FormatProvider.SystemVerilogFormatProvider(
    logger.getChild('SystemVerilogFormatProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'systemverilog' },
      systemVerilogFormatProvider
    )
  );

  // Configure command to instantiate a module
  vscode.commands.registerCommand(
    'verilog.instantiateModule',
    ModuleInstantiation.instantiateModuleInteract
  );

  // Register command for manual linting
  lintManager = new LintManager(logger.getChild('LintManager'));
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

  // init verible-verilog-ls
  setupLanguageClient('veribleVerilogLs', 'verible-verilog-ls', [], [], {
    documentSelector: [{ scheme: 'file', language: 'systemverilog' }],
  });

  // init rustHdl
  setupLanguageClient('rustHdl', 'vhdl_ls', [], [], {
    documentSelector: [{ scheme: 'file', language: 'vhdl' }],
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

export function deactivate(): Promise<void> {
  logger.info('Deactivated');
  return stopAllLanguageClients();
}
