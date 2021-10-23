import {
    Disposable,
    workspace,
    TextDocument,
    DiagnosticCollection,
    Diagnostic,
    languages,
} from 'vscode';
import { Logger } from '../Logger';

export default abstract class BaseLinter {
    protected diagnostic_collection: DiagnosticCollection;
    name: string;
    protected logger: Logger;

    constructor(
        name: string,
        diagnostic_collection: DiagnosticCollection,
        logger: Logger
    ) {
        this.diagnostic_collection = diagnostic_collection;
        this.name = name;
        this.logger = logger;
    }

    public startLint(doc: TextDocument) {
        this.lint(doc);
    }

    public removeFileDiagnostics(doc: TextDocument) {
        this.diagnostic_collection.delete(doc.uri);
    }

    protected abstract lint(doc: TextDocument);
}
