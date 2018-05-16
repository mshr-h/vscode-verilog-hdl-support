import {workspace, window, Disposable, Range, TextDocument, Diagnostic, DiagnosticSeverity, DiagnosticCollection, languages} from "vscode";
import * as child from 'child_process';
import BaseLinter from "./BaseLinter";

var isWindows = process.platform === "win32";

export default class ModelsimLinter extends BaseLinter {

    constructor() {
        super("modelsim");

    }


    protected lint(doc: TextDocument) {

    }
}
