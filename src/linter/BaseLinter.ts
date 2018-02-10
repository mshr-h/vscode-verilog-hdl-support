import { Disposable, workspace, TextDocument, DiagnosticCollection, Diagnostic, languages } from "vscode";

export default abstract class BaseLinter {
	protected subscriptions: Disposable[];
	protected diagnostic_collection: DiagnosticCollection;

	constructor(readonly name: string) {
		this.diagnostic_collection = languages.createDiagnosticCollection();

		workspace.onDidOpenTextDocument(this.startLint, this, this.subscriptions);
		workspace.onDidSaveTextDocument(this.startLint, this, this.subscriptions);
		workspace.onDidCloseTextDocument(this.removeFileDiagnostics, this, this.subscriptions)
	}

	private startLint(doc: TextDocument) {
		if (doc.languageId == "verilog") {
			this.lint(doc);
		}
	}

	private removeFileDiagnostics(doc: TextDocument) {
		this.diagnostic_collection.delete(doc.uri);
	}

	protected abstract lint(doc: TextDocument);
}
