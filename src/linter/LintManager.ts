import { Disposable, workspace, TextDocument, DiagnosticCollection, Diagnostic, languages } from "vscode";

import BaseLinter from "./BaseLinter";
import IcarusLinter from "./IcarusLinter";
import VerilatorLinter from "./VerilatorLinter";
import XvlogLinter from "./XvlogLinter";
import ModelsimLinter from "./ModelsimLinter";

export default class LintManager {

    private subscriptions: Disposable[];

    private linter: BaseLinter;

    constructor() {
        workspace.onDidOpenTextDocument(this.lint, this, this.subscriptions);
		workspace.onDidSaveTextDocument(this.lint, this, this.subscriptions);
        workspace.onDidCloseTextDocument(this.removeFileDiagnostics, this, this.subscriptions)

        workspace.onDidChangeConfiguration(this.configLinter, this, this.subscriptions);
        this.configLinter();
    }

    configLinter() {
        let linter_name;
        linter_name = workspace.getConfiguration("verilog.linting").get<string>("linter");

        if (this.linter == null || this.linter.name != linter_name) {
            switch (linter_name) {
            case "iverilog":
                this.linter = new IcarusLinter();
                break;
            case "xvlog":
                this.linter = new XvlogLinter();
                break;
            case "modelsim":
                this.linter = new ModelsimLinter();
                break;
            case "verilator":
                this.linter = new VerilatorLinter();
                break;
            default:
                console.log("Invalid linter name.")
                this.linter = null;
                break;
            }
        }

        if (this.linter != null) {
            console.log("Using linter " + this.linter.name);
        }
    }

    lint(doc: TextDocument) {
        if(this.linter != null)
            this.linter.startLint(doc);
    }

    removeFileDiagnostics(doc: TextDocument) {
        if(this.linter != null)
            this.linter.removeFileDiagnostics(doc);
    }

}