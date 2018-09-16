'use strict';

import {workspace, window, DocumentSelector, ExtensionContext, extensions, Uri, StatusBarAlignment, languages} from "vscode";
import BaseLinter from "./linter/BaseLinter";
import IcarusLinter from "./linter/IcarusLinter";
import XvlogLinter from "./linter/XvlogLinter";
import ModelsimLinter from "./linter/ModelsimLinter";
import {VerilogDocumentSymbolProvider} from "./providers/DocumentSymbolProvider";
import * as hover from "./providers/hover";

//let diagnosticCollection: DiagnosticCollection;
var linter: BaseLinter;
let extensionID: string = "mshr-h.veriloghdl";

export function activate(context: ExtensionContext) {
    console.log('"verilog-hdl" is now active!');
    // document selector
    let systemverilogSelector:DocumentSelector = { scheme: 'file', language: 'systemverilog' };
    let verilogSelector:DocumentSelector = {scheme: 'file', language: 'verilog'};

    // Check if the Extension was updated recently
    checkIfUpdated(context);

    // Configure linter
    workspace.onDidChangeConfiguration(configLinter, this, context.subscriptions);
    configLinter();

    // Show status bar item
    createStatusBarItem();
    //context.subscriptions.push(commands.registerCommand('systemverilog.build_index', rebuild));

    // Configure Document Symbol Provider
    let docProvider = new VerilogDocumentSymbolProvider();
    context.subscriptions.push(languages.registerDocumentSymbolProvider(systemverilogSelector, docProvider));
    context.subscriptions.push(languages.registerDocumentSymbolProvider(verilogSelector, docProvider));

    // Configure Hover Provider - SystemVerilog
    // let disposable = languages.registerHoverProvider('systemverilog',
    //     new hover.HoverProvider('systemverilog')
    // );
    // context.subscriptions.push(disposable);

    // // Configure Hover Provider - Verilog
    // disposable = languages.registerHoverProvider('verilog',
    //     new hover.HoverProvider('verilog')
    // );
    // context.subscriptions.push(disposable);
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

function createStatusBarItem() {
    let statusBar = window.createStatusBarItem(StatusBarAlignment.Left, 0)
    statusBar.text = 'SystemVerilog: Active'
    statusBar.show()
    statusBar.command = 'systemverilog.build_index';
}

export function deactivate() {
}
