// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import * as child from 'child_process';
import { type Logger } from '@logtape/logtape';
import { getExtensionLogger } from '../logging';
import LinterDiagnosticManager, { type DiagnosticMap } from './LinterDiagnosticManager';

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

/**
 * Abstract base class for all linters.
 * Provides common functionality for running external linting tools
 * and reporting diagnostics to VS Code.
 */
export default abstract class BaseLinter {
  /** The diagnostic manager for reporting issues */
  protected diagnosticManager: LinterDiagnosticManager;
  /** The name of the linter */
  name: string;
  /** The logger instance for output */
  protected logger: Logger;
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
   */
  constructor(name: string, diagnosticManager: LinterDiagnosticManager) {
    this.diagnosticManager = diagnosticManager;
    this.name = name;
    this.logger = getExtensionLogger('Linter', name);

    // Register configuration change listener
    vscode.workspace.onDidChangeConfiguration(() => {
      this.loadBaseConfig();
      this.updateConfig();
    });
    this.loadBaseConfig();
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
   * Resolves an array of include paths to absolute paths.
   * @param paths - Array of paths to resolve
   * @returns Array of resolved absolute paths
   */
  protected resolveIncludePaths(paths: string[]): string[] {
    return paths.map((p) => this.resolvePath(p));
  }

  /**
   * Gets the working directory for the linter based on configuration.
   * @param doc - The document being linted
   * @returns The working directory path
   */
  protected getWorkingDirectory(doc: vscode.TextDocument): string {
    const docFolder = path.dirname(doc.uri.fsPath);
    if (this.config.runAtFileLocation) {
      return docFolder;
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? docFolder;
  }

  /**
   * Converts a Windows path to WSL path format.
   * @param inputPath - The Windows path to convert
   * @returns The WSL path
   */
  protected convertToWslPath(inputPath: string): string {
    const cmd = `wsl wslpath '${inputPath}'`;
    return child.execSync(cmd, {}).toString().replace(/\r?\n/g, '');
  }

  /**
   * Converts a WSL path back to Windows path format.
   * @param inputPath - The WSL path to convert
   * @returns The Windows path
   */
  protected convertFromWslPath(inputPath: string): string {
    const cmd = `wsl wslpath -w '${inputPath}'`;
    return child.execSync(cmd, {}).toString().replace(/\r?\n/g, '');
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
    this.diagnosticManager.clearOwner(this.name, doc.uri);
  }

  protected publishDiagnostics(
    ownerDoc: vscode.TextDocument,
    diagnosticsByUri: DiagnosticMap
  ): void {
    // TODO: Add per-owner run generation tracking to avoid slower stale runs overwriting newer ones.
    this.diagnosticManager.replaceRunDiagnostics(this.name, ownerDoc.uri, diagnosticsByUri);
  }

  protected publishDocumentDiagnostics(
    ownerDoc: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): void {
    const diagnosticsByUri: DiagnosticMap = new Map();
    if (diagnostics.length > 0) {
      diagnosticsByUri.set(ownerDoc.uri.toString(), {
        uri: ownerDoc.uri,
        diagnostics,
      });
    }
    this.publishDiagnostics(ownerDoc, diagnosticsByUri);
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
