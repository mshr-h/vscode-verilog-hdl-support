// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { type Logger } from '@logtape/logtape';
import { getExtensionLogger } from '../logging';
import { getWorkingDirectoryForDocument, resolvePathsForDocument } from '../utils/workspace';
import LinterDiagnosticManager, { type DiagnosticMap } from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';
import type { LintRunOptions } from './LintMode';

/** Common configuration interface for linters */
export interface LinterConfig {
  /** Path where the linter binary is installed */
  linterInstalledPath: string;
  /** Additional command-line arguments */
  arguments: string;
  /** Include paths for the linter */
  includePath: string[];
  /** Whether to run the linter at the file location */
  runAtFileLocation: boolean;
}

export type LintDecision =
  | { kind: 'file' }
  | { kind: 'skip' };

const DEFAULT_LINT_RUN_OPTIONS: LintRunOptions = { trigger: 'automatic' };

/**
 * Abstract base class for all linters.
 * Provides common functionality for running external linting tools
 * and reporting diagnostics to VS Code.
 */
export default abstract class BaseLinter implements vscode.Disposable {
  /** The diagnostic manager for reporting issues */
  protected diagnosticManager: LinterDiagnosticManager;
  protected runManager: LintRunManager;
  /** The name of the linter */
  name: string;
  /** The logger instance for output */
  protected logger: Logger;
  private readonly disposables: vscode.Disposable[] = [];
  private disposed = false;
  /** Common linter configuration */
  protected config: LinterConfig = {
    linterInstalledPath: '',
    arguments: '',
    includePath: [],
    runAtFileLocation: false,
  };

  /**
   * Creates a new BaseLinter instance.
   * @param name - The name of the linter
   * @param diagnosticManager - The linter diagnostic manager
   * @param runManager - The linter run manager
   */
  constructor(
    name: string,
    diagnosticManager: LinterDiagnosticManager,
    runManager: LintRunManager,
    _unusedCompatibilityArg?: unknown
  ) {
    this.diagnosticManager = diagnosticManager;
    this.runManager = runManager;
    this.name = name;
    this.logger = getExtensionLogger('Linter', name);

    // Register configuration change listener
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('verilog.linting')) {
          this.loadBaseConfig();
          this.updateConfig();
        }
      })
    );
    this.loadBaseConfig();
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  /**
   * Loads the base configuration common to all linters.
   */
  protected loadBaseConfig(): void {
    this.config.linterInstalledPath = vscode.workspace
      .getConfiguration()
      .get<string>('verilog.linting.path', '');
  }

  /**
   * Updates linter-specific configuration.
   * Subclasses should override this to load their specific settings.
   */
  protected updateConfig(): void {
    // Override in subclasses
  }

  /**
   * Resolves an array of include paths to absolute paths.
   * @param paths - Array of paths to resolve
   * @param doc - The document being linted
   * @returns Array of resolved absolute paths
   */
  protected resolveIncludePaths(paths: string[], doc: vscode.TextDocument): string[] {
    return resolvePathsForDocument(paths, doc);
  }

  protected getConfiguredDefineArgs(_doc: vscode.TextDocument): string[] {
    return [];
  }

  protected getConfiguredAndProjectIncludePaths(doc: vscode.TextDocument): string[] {
    return this.resolveIncludePaths(this.config.includePath, doc);
  }

  /**
   * Gets the working directory for the linter based on configuration.
   * @param doc - The document being linted
   * @returns The working directory path
   */
  protected getWorkingDirectory(doc: vscode.TextDocument): string {
    return getWorkingDirectoryForDocument(doc, this.config.runAtFileLocation);
  }

  /**
   * Starts the linting process for a document.
   * @param doc - The document to lint
   */
  public async startLint(
    doc: vscode.TextDocument,
    options: LintRunOptions = DEFAULT_LINT_RUN_OPTIONS
  ): Promise<void> {
    const run = this.runManager.beginRun(this.name, doc.uri);
    try {
      await this.lint(doc, run, options);
    } catch (err) {
      this.logger.error`Unexpected lint error: ${err}`;
    } finally {
      this.runManager.finishRun(run);
    }
  }

  /**
   * Removes all diagnostics for a document.
   * @param doc - The document to clear diagnostics for
   */
  public removeFileDiagnostics(doc: vscode.TextDocument) {
    this.diagnosticManager.clearOwner(this.name, doc.uri);
  }

  protected publishDiagnosticsIfCurrent(
    ownerDoc: vscode.TextDocument,
    run: LintRunHandle,
    diagnosticsByUri: DiagnosticMap
  ): void {
    if (!run.isCurrent()) {
      this.logger.info("Skipping stale lint diagnostics", {
        ownerUri: ownerDoc.uri.toString(),
        generation: run.generation,
      });
      return;
    }
    this.diagnosticManager.replaceRunDiagnostics(this.name, ownerDoc.uri, diagnosticsByUri);
  }

  protected publishDocumentDiagnosticsIfCurrent(
    ownerDoc: vscode.TextDocument,
    run: LintRunHandle,
    diagnostics: vscode.Diagnostic[]
  ): void {
    const diagnosticsByUri: DiagnosticMap = new Map();
    if (diagnostics.length > 0) {
      diagnosticsByUri.set(ownerDoc.uri.toString(), {
        uri: ownerDoc.uri,
        diagnostics,
      });
    }
    this.publishDiagnosticsIfCurrent(ownerDoc, run, diagnosticsByUri);
  }

  protected async getLintDecision(doc: vscode.TextDocument, options: LintRunOptions): Promise<LintDecision> {
    void doc;
    void options;
    return { kind: 'file' };
  }

  protected warnUnsupportedCompileUnitMode(options: LintRunOptions): void {
    void options;
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
  protected abstract lint(
    doc: vscode.TextDocument,
    run: LintRunHandle,
    options: LintRunOptions
  ): Promise<void>;
}
