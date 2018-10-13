'use strict';

import {workspace, window, commands, Disposable, Range, ExtensionContext,
        TextDocument, Diagnostic, DiagnosticSeverity, DiagnosticCollection,
        languages, extensions, Selection, Uri, ProgressLocation, QuickPickItem} from "vscode";
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
    // Register command for manual linting
    commands.registerCommand("verilog.lint", RunLintTool);
}

async function RunLintTool() {
    if(window.activeTextEditor === undefined)
        window.showErrorMessage("Verilog HDL: No document opened");
    else if(window.activeTextEditor.document.languageId !== "verilog")
        window.showErrorMessage("Verilog HDL: No Verilog document opened");
    else {
        let linterStr: QuickPickItem = await window.showQuickPick([
        {   label: "iverilog",
            description: "Icarus Verilog",
        },
        {   label: "xvlog",
            description: "Vivado Logical Simulator"
        },
        {   label: "modelsim",
            description: "Modelsim"
        },
        {   label: "verilator",
            description: "Verilator"
        }],
        {   matchOnDescription: true,
            placeHolder: "Choose a linter to run",
        });
        if(linterStr === undefined)
            return;
        let tempLinter: BaseLinter;
        switch(linterStr.label) {
            case "iverilog":  tempLinter = new IcarusLinter;    break;
            case "xvlog":     tempLinter = new XvlogLinter;     break;
            case "modelsim":  tempLinter = new ModelsimLinter;  break;
            case "verilator": tempLinter = new VerilatorLinter; break;
            default:
                return;
        }
        await window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: "Verilog HDL: Running lint tool..."
            }, async (progress, token) => {
                linter.removeFileDiagnostics(window.activeTextEditor.document);
                linter.startLint(window.activeTextEditor.document);
            }
        );
    }
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
        .then(function(str: string){
                if(str === "Open Changelog") {
                // get path of CHANGELOG.md
                let changelogPath:string = extensions.getExtension(extensionID).extensionPath + "/CHANGELOG.md";
                let path = Uri.file(changelogPath);
                // open
                workspace.openTextDocument(path).then(doc => {
                    window.showTextDocument(doc);
                });
            }
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
