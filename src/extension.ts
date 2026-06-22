// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

import LintManager from './linter/LintManager';
import { CtagsManager } from './ctags';
import * as DocumentSymbolProvider from './providers/DocumentSymbolProvider';
import * as HoverProvider from './providers/HoverProvider';
import * as DefinitionProvider from './providers/DefinitionProvider';
import * as ReferenceProvider from './providers/ReferenceProvider';
import * as RenameProvider from './providers/RenameProvider';
import * as CompletionItemProvider from './providers/CompletionItemProvider';
import * as CodeActionProvider from './providers/CodeActionProvider';
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
import { ModuleInstanceCodeActionService } from './hdl/ModuleInstanceCodeActionService';
import { HoverService } from './hdl/HoverService';
import { ReferenceService } from './hdl/ReferenceService';
import { RenameService } from './hdl/RenameService';
import { HierarchyService } from './hierarchy/HierarchyService';
import { ProjectDiagnosticManager } from './project/ProjectDiagnosticManager';
import { ProjectService } from './project/ProjectService';
import { ProjectWatcher } from './project/ProjectWatcher';
import { registerProjectCommands } from './project/ProjectCommands';
import { IndexService } from './semantic/IndexService';
import { SemanticDiagnosticService } from './semantic/SemanticDiagnosticService';
import { VerilogWorkspaceSymbolProvider } from './providers/WorkspaceSymbolProvider';
import { HdlExplorerProvider, registerHdlExplorerCommands } from './views/HdlExplorerProvider';

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
  const projectDiagnosticManager = new ProjectDiagnosticManager(projectService);
  const indexService = new IndexService(projectService);
  const definitionService = new DefinitionService(projectService, indexService, ctagsManager);
  const instantiationService = new InstantiationService(indexService);
  const completionService = new CompletionService(projectService, indexService, ctagsManager);
  const codeActionService = new ModuleInstanceCodeActionService(projectService, indexService);
  const hoverService = new HoverService(projectService, indexService, ctagsManager);
  const referenceService = new ReferenceService(projectService, indexService, ctagsManager);
  const renameService = new RenameService(projectService, indexService, referenceService);
  const hierarchyService = new HierarchyService(projectService, indexService);
  const semanticDiagnosticService = new SemanticDiagnosticService(projectService, indexService);
  const hdlExplorerProvider = new HdlExplorerProvider(projectService, indexService, hierarchyService);
  context.subscriptions.push(
    projectService,
    projectDiagnosticManager,
    indexService,
    hierarchyService,
    semanticDiagnosticService,
    hdlExplorerProvider,
    new ProjectWatcher(projectService)
  );
  context.subscriptions.push(...registerProjectCommands(projectService, indexService));
  context.subscriptions.push(
    ...registerHdlExplorerCommands(
      projectService,
      hierarchyService,
      instantiationService,
      referenceService,
      hdlExplorerProvider
    )
  );
  context.subscriptions.push(
    vscode.window.createTreeView('verilog.hdlExplorer', {
      treeDataProvider: hdlExplorerProvider,
      showCollapseAll: true,
    })
  );
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
    hoverService,
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

  const verilogReferenceProvider = new ReferenceProvider.VerilogReferenceProvider(
    referenceService
  );
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      { scheme: 'file', language: 'verilog' },
      verilogReferenceProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      { scheme: 'file', language: 'systemverilog' },
      verilogReferenceProvider
    )
  );

  const verilogRenameProvider = new RenameProvider.VerilogRenameProvider(
    renameService
  );
  context.subscriptions.push(
    vscode.languages.registerRenameProvider(
      { scheme: 'file', language: 'verilog' },
      verilogRenameProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerRenameProvider(
      { scheme: 'file', language: 'systemverilog' },
      verilogRenameProvider
    )
  );

  const verilogCodeActionProvider = new CodeActionProvider.VerilogCodeActionProvider(
    codeActionService
  );
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'verilog' },
      verilogCodeActionProvider,
      { providedCodeActionKinds: CodeActionProvider.VerilogCodeActionProvider.providedCodeActionKinds }
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'systemverilog' },
      verilogCodeActionProvider,
      { providedCodeActionKinds: CodeActionProvider.VerilogCodeActionProvider.providedCodeActionKinds }
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
  context.subscriptions.push(registerDoctorCommand(context, projectService, indexService));

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
