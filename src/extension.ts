// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

import LintManager from './linter/LintManager';
import { CtagsManager } from './ctags';
import * as DocumentSymbolProvider from './providers/DocumentSymbolProvider';
import * as HoverProvider from './providers/HoverProvider';
import * as DefinitionProvider from './providers/DefinitionProvider';
import * as CompletionItemProvider from './providers/CompletionItemProvider';
import * as ModuleInstantiation from './commands/ModuleInstantiation';
import * as FormatProvider from './providers/FormatProvider';
import { ExtensionManager } from './extensionManager';
import { initAllLanguageClients, stopAllLanguageClients } from './languageServer';
import { createLogger, Logger } from './logger';
import { FliplotPanel } from './fliplot/FliplotPanel';
import { FliplotCustomEditor } from './fliplot/FliplotCustomEditor';

export let logger: Logger; // Global logger
const ctagsManager = new CtagsManager();
const extensionID: string = 'mshr-h.veriloghdl';

let lintManager: LintManager;

export function activate(context: vscode.ExtensionContext) {
  logger = createLogger('Verilog');
  logger.info(`${extensionID  } is now active.`);

  const extMgr = new ExtensionManager(context, extensionID, logger.getChild('ExtensionManager'));
  if (extMgr.isVersionUpdated()) {
    extMgr.showChangelogNotification();
  }

  // Configure ctags
  ctagsManager.configure(logger);

  // Configure Document Symbol Provider
  const verilogDocumentSymbolProvider = new DocumentSymbolProvider.VerilogDocumentSymbolProvider(
    logger.getChild('VerilogDocumentSymbolProvider'),
    ctagsManager,
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

  // Configure Completion Item Provider
  // Trigger on ".", "(", "="
  const verilogCompletionItemProvider = new CompletionItemProvider.VerilogCompletionItemProvider(
    logger.getChild('VerilogCompletionItemProvider'),
    ctagsManager,
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

  // Configure Hover Providers
  const verilogHoverProvider = new HoverProvider.VerilogHoverProvider(
    logger.getChild('VerilogHoverProvider'),
    ctagsManager,
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

  // Configure Definition Providers
  const verilogDefinitionProvider = new DefinitionProvider.VerilogDefinitionProvider(
    logger.getChild('VerilogDefinitionProvider'),
    ctagsManager
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

  // Configure Format Provider
  const verilogFormatProvider = new FormatProvider.VerilogFormatProvider(
    logger.getChild('VerilogFormatProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'verilog' },
      verilogFormatProvider
    )
  );
  const systemVerilogFormatProvider = new FormatProvider.SystemVerilogFormatProvider(
    logger.getChild('SystemVerilogFormatProvider')
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'systemverilog' },
      systemVerilogFormatProvider
    )
  );

  // Configure command to instantiate a module
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'verilog.instantiateModule',
      ModuleInstantiation.instantiateModuleInteract
    )
  );

  // Register command for manual linting
  lintManager = new LintManager(logger.getChild('LintManager'));
  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.lint', lintManager.runLintTool, lintManager)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.openFliplot', () => {
      FliplotPanel.show(context, logger.getChild('Fliplot'));
    })
  );

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      FliplotCustomEditor.viewType,
      new FliplotCustomEditor(context, logger.getChild('Fliplot')),
      {
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  );

  // Configure language server
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration('verilog.languageServer')) {
      return;
    }
    stopAllLanguageClients().finally(() => {
      initAllLanguageClients(logger);
    });
  });
  initAllLanguageClients(logger);

  logger.info(`${extensionID  } activation finished.`);
}

export async function deactivate(): Promise<void> {
  logger.info('Deactivated');
  await stopAllLanguageClients();
}
