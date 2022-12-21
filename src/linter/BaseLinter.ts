import {
    TextDocument,
    DiagnosticCollection,
} from 'vscode';
import { Logger } from '../logger';

export default abstract class BaseLinter {
    protected diagnosticCollection: DiagnosticCollection;
    name: string;
    protected logger: Logger;

    constructor(
        name: string,
        diagnosticCollection: DiagnosticCollection,
        logger: Logger
    ) {
        this.diagnosticCollection = diagnosticCollection;
        this.name = name;
        this.logger = logger;
    }

    public startLint(doc: TextDocument) {
        this.lint(doc);
    }

    public removeFileDiagnostics(doc: TextDocument) {
        this.diagnosticCollection.delete(doc.uri);
    }

    protected abstract lint(doc: TextDocument);
}
