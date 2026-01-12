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
import { bootstrapLogging, disposeLogging, getExtensionLogger } from './logging';
import { FliplotPanel } from './fliplot/FliplotPanel';
import { FliplotCustomEditor } from './fliplot/FliplotCustomEditor';

let ctagsManager: CtagsManager | undefined;
const extensionID: string = 'mshr-h.veriloghdl';

let lintManager: LintManager;

export async function activate(context: vscode.ExtensionContext) {
  await bootstrapLogging();

  const logger = getExtensionLogger();
  logger.info("Extension activating", { extensionId: extensionID });

  const extMgr = new ExtensionManager(context, extensionID);
  if (extMgr.isVersionUpdated()) {
    extMgr.showChangelogNotification();
  }

  ctagsManager = new CtagsManager();
  ctagsManager.configure();

  // Configure Document Symbol Provider
  const verilogDocumentSymbolProvider = new DocumentSymbolProvider.VerilogDocumentSymbolProvider(
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
  const verilogFormatProvider = new FormatProvider.VerilogFormatProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'verilog' },
      verilogFormatProvider
    )
  );
  const systemVerilogFormatProvider = new FormatProvider.SystemVerilogFormatProvider();
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
  lintManager = new LintManager();
  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.lint', lintManager.runLintTool, lintManager)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.openFliplot', () => {
      FliplotPanel.show(context);
    })
  );

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      FliplotCustomEditor.viewType,
      new FliplotCustomEditor(context),
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
      initAllLanguageClients();
    });
  });
  initAllLanguageClients();

  logger.info("Extension activated", { extensionId: extensionID });
}

export async function deactivate(): Promise<void> {
  const logger = getExtensionLogger();
  logger.info("Extension deactivating");
  await stopAllLanguageClients();
  await disposeLogging();
}
