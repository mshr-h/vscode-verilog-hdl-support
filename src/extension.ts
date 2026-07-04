// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

import LintManager from './linter/LintManager';
import { registerDoctorCommand } from './commands/Doctor';
import * as FormatProvider from './providers/FormatProvider';
import { ExtensionManager } from './extensionManager';
import { initAllLanguageClients, stopAllLanguageClients } from './languageServer';
import { bootstrapLogging, disposeLogging, getExtensionLogger } from './logging';
import { FliplotPanel } from './fliplot/FliplotPanel';
import { FliplotCustomEditor } from './fliplot/FliplotCustomEditor';
import { openWaveform } from './waveform/OpenWaveform';
import { InactivePreprocessorDecorationProvider } from './providers/InactivePreprocessorDecorationProvider';
import { SlangConfigService } from './slangServer/SlangConfigService';
import { SlangFirstRunHelper } from './slangServer/SlangFirstRunHelper';
import { registerSlangModuleInstantiationCommands, SlangModuleInstantiationService } from './slangServer/SlangModuleInstantiationService';
import { SlangServerApi } from './slangServer/SlangServerApi';
import { registerSlangServerCommands } from './slangServer/SlangServerCommands';
import { SlangServerManager } from './slangServer/SlangServerManager';
import { registerSlangServerQuickActions, SlangServerStatusBar } from './slangServer/SlangServerStatusBar';
import { HdlExplorerProvider, registerHdlExplorerCommands } from './views/HdlExplorerProvider';

const extensionID = 'mshr-h.veriloghdl';

let lintManager: LintManager;

export async function activate(context: vscode.ExtensionContext) {
  await bootstrapLogging();

  const logger = getExtensionLogger();
  logger.info("Extension activating", { extensionId: extensionID });

  const extMgr = new ExtensionManager(context, extensionID);
  if (extMgr.isVersionUpdated()) {
    extMgr.showChangelogNotification();
  }

  const slangServerManager = new SlangServerManager(context);
  const slangConfigService = new SlangConfigService();
  const slangServerApi = new SlangServerApi(slangServerManager);
  const slangInstantiationService = new SlangModuleInstantiationService(slangServerApi, slangServerManager);
  const hdlExplorerProvider = new HdlExplorerProvider(slangServerApi, slangServerManager, slangConfigService);

  context.subscriptions.push(
    slangServerManager,
    new SlangServerStatusBar(slangServerManager),
    new SlangFirstRunHelper(context, slangConfigService),
    hdlExplorerProvider,
    ...registerSlangServerCommands(slangServerManager, slangConfigService),
    ...registerSlangModuleInstantiationCommands(slangInstantiationService),
    registerSlangServerQuickActions(slangServerManager),
    ...registerHdlExplorerCommands(slangServerApi, slangConfigService, hdlExplorerProvider, slangInstantiationService),
    vscode.window.createTreeView('verilog.hdlExplorer', {
      treeDataProvider: hdlExplorerProvider,
      showCollapseAll: true,
    })
  );
  void slangServerManager.start();

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

  context.subscriptions.push(new InactivePreprocessorDecorationProvider());

  lintManager = new LintManager();
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
  context.subscriptions.push(registerDoctorCommand(context, slangServerManager, slangConfigService));

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      FliplotCustomEditor.viewType,
      new FliplotCustomEditor(context),
      {
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  );

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
