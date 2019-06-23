'use strict';

import * as path from 'path';
import { workspace, window, DocumentSelector, ExtensionContext, extensions, Uri, StatusBarAlignment, languages, TextDocument, commands } from "vscode";

// Linters
import LintManager from "./linter/LintManager";

// Providers
import VerilogDocumentSymbolProvider from "./providers/DocumentSymbolProvider";
import VerilogHoverProvider from "./providers/HoverProvider";
import VerilogDefinitionProvider from "./providers/DefinitionProvider";
import VerilogCompletionItemProvider from "./providers/CompletionItemProvider";
import VerilogTreeDataProvider from "./providers/TreeDataProvider";
import VerilogWorkspaceSymbolProvider from "./providers/WorkspaceSymbolProvider";

// Commands
import VerilogModuleInstantiation from "./commands/ModuleInstantiation"

let lintManager: LintManager;
var extensionID: string = "mshr-h.veriloghdl";

export function activate(context: ExtensionContext) {
    console.log('"verilog-hdl" is now active!');
    // document selector
    let systemverilogSelector: DocumentSelector = { scheme: 'file', language: 'systemverilog' };
    let verilogSelector: DocumentSelector = { scheme: 'file', language: 'verilog' };

    // Check if the Extension was updated recently
    checkIfUpdated(context);

    // Configure lint manager
    lintManager = new LintManager();

    // Configure Document Symbol Provider
    let docProvider = new VerilogDocumentSymbolProvider();
    let symProvider = new VerilogWorkspaceSymbolProvider(
        docProvider
    );

    context.subscriptions.push(languages.registerDocumentSymbolProvider(systemverilogSelector, docProvider));
    context.subscriptions.push(languages.registerDocumentSymbolProvider(verilogSelector, docProvider));

    // Configure Completion Item Provider
    // Trigger on ".", "(", "="
    let compItemProvider = new VerilogCompletionItemProvider(symProvider, docProvider);
    context.subscriptions.push(languages.registerCompletionItemProvider(verilogSelector, compItemProvider, ".", "(", "="));
    context.subscriptions.push(languages.registerCompletionItemProvider(systemverilogSelector, compItemProvider, ".", "(", "="));

    // Configure Hover Providers
    let hoverProvider = new VerilogHoverProvider(symProvider, docProvider, 'verilog');
    let hoverProviderSys = new VerilogHoverProvider(symProvider, docProvider, 'systemverilog');
    context.subscriptions.push(languages.registerHoverProvider(systemverilogSelector, hoverProviderSys));
    context.subscriptions.push(languages.registerHoverProvider(verilogSelector, hoverProvider));

    // Configure Definition Providers    
    let defProvider = new VerilogDefinitionProvider(symProvider, docProvider);
    context.subscriptions.push(languages.registerDefinitionProvider(systemverilogSelector, defProvider));
    context.subscriptions.push(languages.registerDefinitionProvider(verilogSelector, defProvider));

    // Configure command to instantiate a module
    const moduleInstantiator = new VerilogModuleInstantiation(symProvider);
    commands.registerCommand("verilog.instantiateModule", instantiateModuleInteract);
    // Register command for manual linting
    commands.registerCommand("verilog.lint", lintManager.RunLintTool);
    function instantiateModuleInteract() {
        moduleInstantiator.instantiateModule()
            .then(inst => {
                window.activeTextEditor.insertSnippet(inst);
            });
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
    for (let i = 0; i < pv.length; i++) {
        if (pv[i] < cv[i]) {
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
        .then(function (str: string) {
            if (str === "Open Changelog") {
                // get path of CHANGELOG.md
                let changelogPath: string = extensions.getExtension(extensionID).extensionPath + "/CHANGELOG.md";
                let path = Uri.file(changelogPath);
                // open
                workspace.openTextDocument(path).then(doc => {
                    window.showTextDocument(doc);
                });
            }
        });
}

export function deactivate() {
}
