'use strict';

import {workspace, window, commands, Disposable, Range, ExtensionContext,
     TextDocument, Diagnostic, DiagnosticSeverity, DiagnosticCollection, languages} from "vscode";
import BaseLinter from "./linter/BaseLinter";
import IcarusLinter from "./linter/IcarusLinter";
import XvlogLinter from "./linter/XvlogLinter";

let diagnosticCollection: DiagnosticCollection;
var linter: BaseLinter;


export function activate(context: ExtensionContext) {
    console.log('"verilog-hdl" is now active!');
    workspace.onDidChangeConfiguration(configLinter, this, context.subscriptions);
    configLinter();
}


function configLinter() {
    let linter_name;
    linter_name = workspace.getConfiguration("verilog.linting").get<string>("linter");

    if (linter == null || linter.name != linter_name) {
        switch (linter_name) {
        case "iverilog":
            linter = new IcarusLinter();
            break;
        case "xvlog":
            linter = new XvlogLinter();
            break;
        default:
            console.log("Invalid linter name.")
            linter = null;
            break;
        }
    }

    if (linter != null) {
        console.log("Using linter " + linter.name);
    }
}


export function deactivate() {
}
