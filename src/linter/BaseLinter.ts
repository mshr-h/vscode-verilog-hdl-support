// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../logger';

/**
 * Abstract base class for all linters.
 * Provides common functionality for running external linting tools
 * and reporting diagnostics to VS Code.
 */
export default abstract class BaseLinter {
  /** The diagnostic collection for reporting issues */
  protected diagnosticCollection: vscode.DiagnosticCollection;
  /** The name of the linter */
  name: string;
  /** The logger instance for output */
  protected logger: Logger;

  /**
   * Creates a new BaseLinter instance.
   * @param name - The name of the linter
   * @param diagnosticCollection - The VS Code diagnostic collection
   * @param logger - The logger instance
   */
  constructor(name: string, diagnosticCollection: vscode.DiagnosticCollection, logger: Logger) {
    this.diagnosticCollection = diagnosticCollection;
    this.name = name;
    this.logger = logger;
  }

  /**
   * Resolves a path to an absolute path, using the workspace root if relative.
   * @param inputPath - The path to resolve
   * @returns The absolute path
   */
  protected resolvePath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
      return inputPath;
    }
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return inputPath;
    }
    return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, inputPath);
  }

  /**
   * Starts the linting process for a document.
   * @param doc - The document to lint
   */
  public startLint(doc: vscode.TextDocument) {
    this.lint(doc);
  }

  /**
   * Removes all diagnostics for a document.
   * @param doc - The document to clear diagnostics for
   */
  public removeFileDiagnostics(doc: vscode.TextDocument) {
    this.diagnosticCollection.delete(doc.uri);
  }

  /**
   * Converts a severity string from the linter output to a VS Code DiagnosticSeverity.
   * Must be implemented by subclasses.
   * @param severityString - The severity string from the linter
   * @returns The corresponding DiagnosticSeverity
   */
  protected abstract convertToSeverity(severityString: string): vscode.DiagnosticSeverity;

  /**
   * Runs the linting process for a document.
   * Must be implemented by subclasses.
   * @param doc - The document to lint
   */
  protected abstract lint(doc: vscode.TextDocument): void;
}
