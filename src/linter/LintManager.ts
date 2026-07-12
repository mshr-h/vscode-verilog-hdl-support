// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';
import BaseLinter from './BaseLinter';
import IcarusLinter from './IcarusLinter';
import ModelsimLinter from './ModelsimLinter';
import VerilatorLinter from './VerilatorLinter';
import SlangLinter from './SlangLinter';
import XvlogLinter from './XvlogLinter';
import VeribleVerilogLintLinter from './VeribleVerilogLintLinter';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager from './LintRunManager';

export default class LintManager {
  private subscriptions: vscode.Disposable[];

  private linter: BaseLinter | null;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private diagnosticManager: LinterDiagnosticManager;
  private runManager: LintRunManager;
  private readonly logger = getExtensionLogger('Linter', 'Manager');

  constructor() {
    this.subscriptions = [];
    this.linter = null;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('verilog-lint');
    this.diagnosticManager = new LinterDiagnosticManager(this.diagnosticCollection);
    this.runManager = new LintRunManager();
    vscode.workspace.onDidOpenTextDocument(this.lint, this, this.subscriptions);
    vscode.workspace.onDidSaveTextDocument(this.lint, this, this.subscriptions);
    vscode.workspace.onDidCloseTextDocument(this.removeFileDiagnostics, this, this.subscriptions);
    vscode.workspace.onDidChangeConfiguration(this.configLinter, this, this.subscriptions);
    this.configLinter();

    // Run linting for open documents on launch
    vscode.window.visibleTextEditors.forEach((editor) => {
      this.lint(editor.document);
    });
  }

  getLinterFromString(name: string): BaseLinter | null {
    switch (name) {
      case 'iverilog':
        return new IcarusLinter(this.diagnosticManager, this.runManager);
      case 'xvlog':
        return new XvlogLinter(this.diagnosticManager, this.runManager);
      case 'modelsim':
        return new ModelsimLinter(this.diagnosticManager, this.runManager);
      case 'verilator':
        return new VerilatorLinter(this.diagnosticManager, this.runManager);
      case 'slang':
        return new SlangLinter(this.diagnosticManager, this.runManager);
      case 'verible-verilog-lint':
        return new VeribleVerilogLintLinter(this.diagnosticManager, this.runManager);
      default:
        return null;
    }
  }

  configLinter() {
    const linterName = vscode.workspace.getConfiguration('verilog.linting').get<string>('linter');
    const previousLinter = this.linter;

    if (previousLinter !== null) {
      if (previousLinter.name === linterName) {
        return;
      }
    }

    if (linterName === undefined) {
      this.disposePreviousLinter(previousLinter);
      this.linter = null;
      this.logger.warn("Linter name is undefined");
      return;
    }

    if (linterName === 'none') {
      this.disposePreviousLinter(previousLinter);
      this.linter = null;
      this.logger.info("Linter disabled");
      return;
    }

    this.linter = this.getLinterFromString(linterName);
    if (this.linter === null) {
      this.disposePreviousLinter(previousLinter);
      this.logger.warn("Invalid linter name", { linter: linterName });
      return;
    }

    this.disposePreviousLinter(previousLinter);
    this.logger.info("Linter configured", { linter: this.linter.name });
  }

  private disposePreviousLinter(previousLinter: BaseLinter | null): void {
    if (previousLinter === null) {
      return;
    }
    this.runManager.cancelSource(previousLinter.name);
    this.diagnosticManager.clearSource(previousLinter.name);
    previousLinter.dispose();
  }

  lint(doc: vscode.TextDocument) {
    if (this.linter === null) {
      return;
    }
    switch (doc.languageId) {
      case 'verilog':
      case 'systemverilog':
        void this.linter.startLint(doc);
        break;
      default:
        break;
    }
  }

  removeFileDiagnostics(doc: vscode.TextDocument) {
    this.runManager.cancelOwner(doc.uri);
    this.diagnosticManager.clearTargetUri(doc.uri);
  }

  dispose(): void {
    this.runManager.cancelAll();
    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
    this.subscriptions.length = 0;
    if (this.linter !== null) {
      this.linter.dispose();
      this.linter = null;
    }
    this.diagnosticManager.dispose();
  }

  async runLintTool() {
    // Check for language id
    this.logger.info("Manual lint tool execution started");
    const editor = vscode.window.activeTextEditor;
    if (
      !editor ||
      (editor.document.languageId !== 'verilog' &&
        editor.document.languageId !== 'systemverilog')
    ) {
      vscode.window.showErrorMessage('Verilog-HDL/SystemVerilog: No document opened');
      return;
    }

    const linterStr: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(
      [
        {
          label: 'iverilog',
          description: 'Icarus Verilog',
        },
        {
          label: 'xvlog',
          description: 'Vivado Logical Simulator',
        },
        {
          label: 'modelsim',
          description: 'Modelsim',
        },
        {
          label: 'verilator',
          description: 'Verilator',
        },
        {
          label: 'slang',
          description: 'Slang',
        },
        {
          label: 'verible-verilog-lint',
          description: 'Verible Verilog Lint',
        },
      ],
      {
        matchOnDescription: true,
        placeHolder: 'Choose a linter to run',
      }
    );
    if (linterStr === undefined) {
      this.logger.error("Linter selection cancelled");
      return;
    }
    // Create and run the linter with progress bar
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Verilog-HDL/SystemVerilog: Running lint tool...',
      },
      async (_progress, _token) => {
        const linter: BaseLinter | null = this.getLinterFromString(linterStr.label);
        if (linter === null) {
          this.logger.error("Linter not found", { linter: linterStr.label });
          return;
        }
        this.logger.info("Running linter", { linter: linter.name });

        try {
          linter.removeFileDiagnostics(editor.document);
          await linter.startLint(editor.document);
        } finally {
          linter.dispose();
        }
      }
    );
  }
}
