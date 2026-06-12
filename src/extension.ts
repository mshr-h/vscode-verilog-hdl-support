// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

import LintManager from './linter/LintManager';
import { CtagsManager } from './ctags';
import * as DocumentSymbolProvider from './providers/DocumentSymbolProvider';
import * as HoverProvider from './providers/HoverProvider';
import * as DefinitionProvider from './providers/DefinitionProvider';
import * as CompletionItemProvider from './providers/CompletionItemProvider';
import * as ModuleInstantiation from './commands/ModuleInstantiation';
import { registerDoctorCommand } from './commands/Doctor';
import * as FormatProvider from './providers/FormatProvider';
import { ExtensionManager } from './extensionManager';
import { initAllLanguageClients, stopAllLanguageClients } from './languageServer';
import { bootstrapLogging, disposeLogging, getExtensionLogger } from './logging';
import { FliplotPanel } from './fliplot/FliplotPanel';
import { FliplotCustomEditor } from './fliplot/FliplotCustomEditor';
import { openWaveform } from './waveform/OpenWaveform';
import { InactivePreprocessorDecorationProvider } from './providers/InactivePreprocessorDecorationProvider';
import { DefinitionService } from './hdl/DefinitionService';
import { InstantiationService } from './hdl/InstantiationService';
import { CompletionService } from './hdl/CompletionService';
import { ProjectService } from './project/ProjectService';
import { ProjectWatcher } from './project/ProjectWatcher';
import { registerProjectCommands } from './project/ProjectCommands';
import { IndexService } from './semantic/IndexService';
import { VerilogWorkspaceSymbolProvider } from './providers/WorkspaceSymbolProvider';

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
  context.subscriptions.push(ctagsManager);

  const projectService = new ProjectService();
  const indexService = new IndexService(projectService);
  const definitionService = new DefinitionService(projectService, indexService, ctagsManager);
  const instantiationService = new InstantiationService(indexService);
  const completionService = new CompletionService(projectService, indexService, ctagsManager);
  context.subscriptions.push(projectService, indexService, new ProjectWatcher(projectService));
  context.subscriptions.push(...registerProjectCommands(projectService, indexService));
  void projectService.reload('activation');

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
    completionService,
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'verilog' },
      verilogCompletionItemProvider,
      '.',
      '(',
      '=',
      '`',
      '"'
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'systemverilog' },
      verilogCompletionItemProvider,
      '.',
      '(',
      '=',
      '`',
      '"'
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
    definitionService
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
  context.subscriptions.push(
    vscode.languages.registerWorkspaceSymbolProvider(
      new VerilogWorkspaceSymbolProvider(indexService)
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

  context.subscriptions.push(new InactivePreprocessorDecorationProvider(projectService));

  // Configure command to instantiate a module
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'verilog.instantiateModule',
      () => ModuleInstantiation.instantiateModuleInteractWithProjectIndex(instantiationService)
    )
  );

  // Register command for manual linting
  lintManager = new LintManager(projectService);
  context.subscriptions.push(lintManager);
  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.lint', lintManager.runLintTool, lintManager)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.openFliplot', () => {
      FliplotPanel.show(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.openWaveform', (arg?: unknown) =>
      openWaveform(context, arg)
    )
  );
  context.subscriptions.push(registerDoctorCommand(context, projectService));

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
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('verilog.languageServer')) {
        return;
      }
      stopAllLanguageClients().finally(() => {
        initAllLanguageClients();
      });
    })
  );
  initAllLanguageClients();

  logger.info("Extension activated", { extensionId: extensionID });
}

export async function deactivate(): Promise<void> {
  const logger = getExtensionLogger();
  logger.info("Extension deactivating");
  await stopAllLanguageClients();
  await disposeLogging();
}
