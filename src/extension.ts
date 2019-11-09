'use strict';

import {workspace, window, DocumentSelector, ExtensionContext, extensions, Uri, languages, commands} from "vscode";

// Linters
import LintManager from "./linter/LintManager";

// ctags
import {CtagsManager} from "./ctags";

// Providers
import VerilogDocumentSymbolProvider from "./providers/DocumentSymbolProvider";
import VerilogHoverProvider from "./providers/HoverProvider";
import VerilogDefinitionProvider from "./providers/DefinitionProvider";
import VerilogCompletionItemProvider from "./providers/CompletionItemProvider";

// Commands
import * as ModuleInstantiation from "./commands/ModuleInstantiation"

// Logger
import {Logger} from "./Logger"

let lintManager: LintManager;
let logger: Logger = new Logger();
export let ctagsManager: CtagsManager = new CtagsManager(logger);
var extensionID: string = "mshr-h.veriloghdl";

export function activate(context: ExtensionContext) {
    
    console.log(extensionID + ' is now active!');

    // document selector
    let systemverilogSelector:DocumentSelector = { scheme: 'file', language: 'systemverilog' };
    let verilogSelector:DocumentSelector = {scheme: 'file', language: 'verilog'};

    // Check if the Extension was updated recently
    checkIfUpdated(context);

    // Configure ctags
    ctagsManager.configure();

    // Configure lint manager
    lintManager = new LintManager(logger);

    // Configure Document Symbol Provider
    let docProvider = new VerilogDocumentSymbolProvider(logger);
    context.subscriptions.push(languages.registerDocumentSymbolProvider(systemverilogSelector, docProvider));
    context.subscriptions.push(languages.registerDocumentSymbolProvider(verilogSelector, docProvider));

    // Configure Completion Item Provider
    // Trigger on ".", "(", "="
    let compItemProvider = new VerilogCompletionItemProvider(logger);
    context.subscriptions.push(languages.registerCompletionItemProvider(verilogSelector, compItemProvider, ".", "(", "="));
    context.subscriptions.push(languages.registerCompletionItemProvider(systemverilogSelector, compItemProvider, ".", "(", "="));

    // Configure Hover Providers
    let hoverProvider = new VerilogHoverProvider(logger);
    context.subscriptions.push(languages.registerHoverProvider(systemverilogSelector, hoverProvider));
    context.subscriptions.push(languages.registerHoverProvider(verilogSelector, hoverProvider));

    // Configure Definition Providers
    let defProvider = new VerilogDefinitionProvider(logger);
    context.subscriptions.push(languages.registerDefinitionProvider(systemverilogSelector, defProvider));
    context.subscriptions.push(languages.registerDefinitionProvider(verilogSelector, defProvider));

    // Configure command to instantiate a module
    commands.registerCommand("verilog.instantiateModule", ModuleInstantiation.instantiateModuleInteract);
    // Register command for manual linting
    commands.registerCommand("verilog.lint", lintManager.RunLintTool);
    
    logger.log("Activation complete");
}

function checkIfUpdated(context: ExtensionContext) {
    // Get previous version
    let prevVersion: string = context.globalState.get("version", "0.0.0");
    let pv = prevVersion.split('.').map(Number);
    // Get current version
    let currVersion: string = extensions.getExtension(extensionID).packageJSON.version;
    logger.log(extensionID + " v" + currVersion);
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
    logger.log("Recently Updated");
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
        logger.log("Update notification shown");
    }

export function deactivate() {
    logger.log("Deactivated");
}
