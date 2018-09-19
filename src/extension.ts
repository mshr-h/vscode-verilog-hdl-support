'use strict';

import {workspace, window, commands, Disposable, Range, ExtensionContext,
        TextDocument, Diagnostic, DiagnosticSeverity, DiagnosticCollection,
        languages, extensions, Selection, Uri} from "vscode";
import BaseLinter from "./linter/BaseLinter";
import IcarusLinter from "./linter/IcarusLinter";
import VerilatorLinter from "./linter/VerilatorLinter";
import XvlogLinter from "./linter/XvlogLinter";
import ModelsimLinter from "./linter/ModelsimLinter";

let diagnosticCollection: DiagnosticCollection;
var linter: BaseLinter;
let extensionID: string = "mshr-h.veriloghdl";

export function activate(context: ExtensionContext) {
    console.log('"verilog-hdl" is now active!');
    checkIfUpdated(context);
    workspace.onDidChangeConfiguration(configLinter, this, context.subscriptions);
    configLinter();
}

function checkIfUpdated(context: ExtensionContext) {
    // Get previous version
    let prevVersion: string = context.globalState.get("version", "0.0.0");
    let pv = prevVersion.split('.').map(Number);
    // Get current version
    let currVersion: string = extensions.getExtension(extensionID).packageJSON.version;
    let cv = currVersion.split('.').map(Number);
    // check if current version > previous version
    for(let i = 0; i < pv.length; i++) {
        if(pv[i] < cv[i]) {
            showUpdatedNotif();
            break;
        }
    }
    // update the value
    context.globalState.update("version", currVersion);
}

function showUpdatedNotif() {
    window
        .showInformationMessage("Verilog HDL extension has been updated", "Open Changelog")
        .then(function(){
            // get path of CHANGELOG.md
            let changelogPath:string = extensions.getExtension(extensionID).extensionPath + "/CHANGELOG.md";
            let path = Uri.file(changelogPath);
            // open
            workspace.openTextDocument(path).then(doc => {
                window.showTextDocument(doc);
            });
        });
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
        case "modelsim":
            linter = new ModelsimLinter();
            break;
        case "verilator":
            linter = new VerilatorLinter();
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
