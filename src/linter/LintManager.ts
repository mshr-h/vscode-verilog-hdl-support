// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import BaseLinter from './BaseLinter';
import IcarusLinter from './IcarusLinter';
import ModelsimLinter from './ModelsimLinter';
import VerilatorLinter from './VerilatorLinter';
import SlangLinter from './SlangLinter';
import XvlogLinter from './XvlogLinter';

export default class LintManager {
  private subscriptions: vscode.Disposable[];

  private linter: BaseLinter;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private logger: vscode.LogOutputChannel;

  constructor(logger: vscode.LogOutputChannel) {
    this.linter = null;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection();
    this.logger = logger;
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

  getLinterFromString(name: string): BaseLinter {
    switch (name) {
      case 'iverilog':
        return new IcarusLinter(this.diagnosticCollection, this.logger);
      case 'xvlog':
        return new XvlogLinter(this.diagnosticCollection, this.logger);
      case 'modelsim':
        return new ModelsimLinter(this.diagnosticCollection, this.logger);
      case 'verilator':
        return new VerilatorLinter(this.diagnosticCollection, this.logger);
      case 'slang':
        return new SlangLinter(this.diagnosticCollection, this.logger);
      default:
        return null;
    }
  }

  configLinter() {
    let linterName = vscode.workspace.getConfiguration('verilog.linting').get<string>('linter');

    if (this.linter !== null) {
      if (this.linter.name === linterName) {
        return;
      }
    }

    this.linter = this.getLinterFromString(linterName);
    if (this.linter === null) {
      this.logger.warn('[Lint Manager] Invalid linter name.');
      return;
    }

    this.logger.info('[lint-manager] Using linter ' + this.linter.name);
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
    let lang: string = vscode.window.activeTextEditor.document.languageId;
    if (
      vscode.window.activeTextEditor === undefined ||
      (lang !== 'verilog' && lang !== 'systemverilog')
    ) {
      vscode.window.showErrorMessage('Verilog-HDL/SystemVerilog: No document opened');
      return;
    }

    let linterStr: vscode.QuickPickItem = await vscode.window.showQuickPick(
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
      ],
      {
        matchOnDescription: true,
        placeHolder: 'Choose a linter to run',
      }
    );
    if (linterStr === undefined) {
      return;
    }
    // Create and run the linter with progress bar
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Verilog-HDL/SystemVerilog: Running lint tool...',
      },
      async (_progress, _token) => {
        let l: BaseLinter = this.getLinterFromString(linterStr.label);
        if (l === null) {
          return;
        }
        l.removeFileDiagnostics(vscode.window.activeTextEditor.document);
        l.startLint(vscode.window.activeTextEditor.document);
      }
    );
  }
}
