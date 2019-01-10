import { Disposable, workspace, TextDocument, DiagnosticCollection, Diagnostic, languages } from "vscode";

export default abstract class BaseLinter {
	protected diagnostic_collection: DiagnosticCollection;
	name : string;

	constructor(name: string) {
		this.diagnostic_collection = languages.createDiagnosticCollection();
		this.name = name;
	}

	public startLint(doc: TextDocument) {
		this.lint(doc);
	}

	public removeFileDiagnostics(doc: TextDocument) {
		this.diagnostic_collection.delete(doc.uri);
	}

	protected abstract lint(doc: TextDocument);
}
