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
import * as ModuleInstantiation from './commands/ModuleInstantiation';
import { HdlExplorerProvider, registerHdlExplorerCommands } from './views/HdlExplorerProvider';
import { SlangCommandClient } from './slangServer/SlangCommandClient';
import { SlangConfigService } from './slangServer/SlangConfigService';
import { SlangServerManager } from './slangServer/SlangServerManager';

const extensionID = 'mshr-h.veriloghdl';

let lintManager: LintManager;
let slangServerManager: SlangServerManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
  await bootstrapLogging();

  const logger = getExtensionLogger();
  logger.info('Extension activating', { extensionId: extensionID });

  const extMgr = new ExtensionManager(context, extensionID);
  if (extMgr.isVersionUpdated()) {
    extMgr.showChangelogNotification();
  }

  const slangCommands = new SlangCommandClient();
  const slangConfigService = new SlangConfigService();
  slangServerManager = new SlangServerManager(context, slangConfigService);
  context.subscriptions.push(slangServerManager);
  await slangServerManager.start();

  const hdlExplorerProvider = new HdlExplorerProvider(slangCommands, slangConfigService);
  context.subscriptions.push(hdlExplorerProvider);
  context.subscriptions.push(...registerHdlExplorerCommands(slangCommands, slangServerManager, hdlExplorerProvider));
  context.subscriptions.push(
    vscode.window.createTreeView('verilog.hdlExplorer', {
      treeDataProvider: hdlExplorerProvider,
      showCollapseAll: true,
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.configureSlangProject', () =>
      slangServerManager?.configureProject()
    ),
    vscode.commands.registerCommand('verilog.restartSlangServer', () =>
      slangServerManager?.restart()
    )
  );

  // Keep formatter providers: slang-server owns semantic language features, while
  // existing external formatter integrations remain explicit VS Code commands.
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'verilog' },
      new FormatProvider.VerilogFormatProvider()
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'systemverilog' },
      new FormatProvider.SystemVerilogFormatProvider()
    )
  );

  context.subscriptions.push(new InactivePreprocessorDecorationProvider());

  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.instantiateModule', () =>
      ModuleInstantiation.instantiateModuleInteract(slangCommands)
    )
  );

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
  context.subscriptions.push(registerDoctorCommand(context, slangServerManager));

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      FliplotCustomEditor.viewType,
      new FliplotCustomEditor(context),
      {
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  );

  // Keep non-HDL language servers, such as Tcl and VHDL. HDL semantic servers are
  // intentionally not registered here to avoid conflicts with slang-server.
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

  logger.info('Extension activated', { extensionId: extensionID });
}

export async function deactivate(): Promise<void> {
  const logger = getExtensionLogger();
  logger.info('Extension deactivating');
  await slangServerManager?.stop();
  await stopAllLanguageClients();
  await disposeLogging();
}
