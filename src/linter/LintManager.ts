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

export default class LintManager {
  private subscriptions: vscode.Disposable[];

  private linter: BaseLinter | null;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private readonly logger = getExtensionLogger('Linter', 'Manager');

  constructor() {
    this.subscriptions = [];
    this.linter = null;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection();
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
        return new IcarusLinter(this.diagnosticCollection);
      case 'xvlog':
        return new XvlogLinter(this.diagnosticCollection);
      case 'modelsim':
        return new ModelsimLinter(this.diagnosticCollection);
      case 'verilator':
        return new VerilatorLinter(this.diagnosticCollection);
      case 'slang':
        return new SlangLinter(this.diagnosticCollection);
      case 'verible-verilog-lint':
        return new VeribleVerilogLintLinter(this.diagnosticCollection);
      default:
        return null;
    }
  }

  configLinter() {
    const linterName = vscode.workspace.getConfiguration('verilog.linting').get<string>('linter');

    if (this.linter !== null) {
      if (this.linter.name === linterName) {
        return;
      }
    }

    if (linterName === undefined) {
      this.logger.warn("Linter name is undefined");
      return;
    }

    this.linter = this.getLinterFromString(linterName);
    if (this.linter === null) {
      this.logger.warn("Invalid linter name", { linter: linterName });
      return;
    }

    this.logger.info("Linter configured", { linter: this.linter.name });
  }

  lint(doc: vscode.TextDocument) {
    if (this.linter === null) {
      return;
    }
    switch (doc.languageId) {
      case 'verilog':
      case 'systemverilog':
        this.linter.startLint(doc);
        break;
      default:
        break;
    }
  }

  removeFileDiagnostics(doc: vscode.TextDocument) {
    if (this.linter === null) {
      return;
    }
    this.linter.removeFileDiagnostics(doc);
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

        linter.removeFileDiagnostics(editor.document);
        linter.startLint(editor.document);
      }
    );
  }
}
