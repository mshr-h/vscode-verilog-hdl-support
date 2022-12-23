import * as vscode from 'vscode';
import BaseLinter from './BaseLinter';
import IcarusLinter from './IcarusLinter';
import VerilatorLinter from './VerilatorLinter';
import XvlogLinter from './XvlogLinter';
import ModelsimLinter from './ModelsimLinter';

export default class LintManager {
  private subscriptions: vscode.Disposable[];

  private linter: BaseLinter;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private logger: vscode.LogOutputChannel;

  constructor(logger: vscode.LogOutputChannel) {
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

  configLinter() {
    let linterName;
    linterName = vscode.workspace.getConfiguration('verilog.linting').get<string>('linter');

    if (this.linter == null || this.linter.name != linterName) {
      switch (linterName) {
        case 'iverilog':
          this.linter = new IcarusLinter(this.diagnosticCollection, this.logger);
          break;
        case 'xvlog':
          this.linter = new XvlogLinter(this.diagnosticCollection, this.logger);
          break;
        case 'modelsim':
          this.linter = new ModelsimLinter(this.diagnosticCollection, this.logger);
          break;
        case 'verilator':
          this.linter = new VerilatorLinter(this.diagnosticCollection, this.logger);
          break;
        default:
          this.logger.warn('[Lint Manager] Invalid linter name.');
          this.linter = null;
          break;
      }
    }

    if (this.linter != null) {
      this.logger.info('[iverilog-lint] Using linter ' + this.linter.name);
    }
  }

  lint(doc: vscode.TextDocument) {
    // Check for language id
    let lang: string = doc.languageId;
    if (this.linter != null && (lang === 'verilog' || lang === 'systemverilog')) {
      this.linter.startLint(doc);
    }
  }

  removeFileDiagnostics(doc: vscode.TextDocument) {
    if (this.linter != null) {
      this.linter.removeFileDiagnostics(doc);
    }
  }

  async runLintTool() {
    // Check for language id
    let lang: string = vscode.window.activeTextEditor.document.languageId;
    if (
      vscode.window.activeTextEditor === undefined ||
      (lang !== 'verilog' && lang !== 'systemverilog')
    ) {
      vscode.window.showErrorMessage('Verilog-HDL/SystemVerilog: No document opened');
    }
    // else if(window.activeTextEditor.document.languageId !== "verilog")
    // window.showErrorMessage("Verilog-HDL/SystemVerilog: No Verilog document opened");
    else {
      // Show the available linters
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
      let tempLinter: BaseLinter;
      switch (linterStr.label) {
        case 'iverilog':
          tempLinter = new IcarusLinter(this.diagnosticCollection, this.logger);
          break;
        case 'xvlog':
          tempLinter = new XvlogLinter(this.diagnosticCollection, this.logger);
          break;
        case 'modelsim':
          tempLinter = new ModelsimLinter(this.diagnosticCollection, this.logger);
          break;
        case 'verilator':
          tempLinter = new VerilatorLinter(this.diagnosticCollection, this.logger);
          break;
        default:
          return;
      }
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Verilog-HDL/SystemVerilog: Running lint tool...',
        },
        async (_progress, _token) => {
          tempLinter.removeFileDiagnostics(vscode.window.activeTextEditor.document);
          tempLinter.startLint(vscode.window.activeTextEditor.document);
        }
      );
    }
  }
}
