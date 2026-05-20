// SPDX-License-Identifier: MIT
import * as process from 'process';
import * as vscode from 'vscode';
import BaseLinter, { type LinterConfig } from './BaseLinter';
import LinterDiagnosticManager, { type DiagnosticMap } from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import type {
  LinterDiagnosticResult,
  LinterExecutionContext,
  LinterExecutionSpec,
  LinterRunInput,
} from '../tools/metadata';

const isWindows = process.platform === 'win32';

export default class GenericExternalLinter extends BaseLinter {
  private specificConfig!: vscode.WorkspaceConfiguration;

  constructor(
    private readonly spec: LinterExecutionSpec,
    diagnosticManager: LinterDiagnosticManager,
    runManager: LintRunManager
  ) {
    super(spec.id, diagnosticManager, runManager);
    this.updateConfig();
  }

  protected override updateConfig(): void {
    this.specificConfig = vscode.workspace.getConfiguration(
      `verilog.linting.${this.spec.configSection}`
    );
    this.config.arguments = this.spec.configKeys.arguments
      ? this.specificConfig.get<string>(this.spec.configKeys.arguments, '')
      : '';
    this.config.includePath = this.spec.configKeys.includePath
      ? this.specificConfig.get<string[]>(this.spec.configKeys.includePath, [])
      : [];
    this.config.runAtFileLocation = this.spec.configKeys.runAtFileLocation
      ? this.specificConfig.get<boolean>(this.spec.configKeys.runAtFileLocation, false)
      : false;
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    return this.spec.convertToSeverity?.(severityString) ?? vscode.DiagnosticSeverity.Warning;
  }

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle): Promise<void> {
    const cwd = this.getWorkingDirectory(doc);
    const context: LinterExecutionContext = {
      document: doc,
      config: this.config,
      specificConfig: this.specificConfig,
      cwd,
      isWindows,
      cancellationToken: run.cancellationToken,
      resolveIncludePaths: (paths) => this.resolveIncludePaths(paths, doc),
    };

    const commandInfo = this.spec.buildCommand({
      isWindows,
      configuredPath: this.config.linterInstalledPath,
      useWSL: this.spec.configKeys.useWSL
        ? this.specificConfig.get<boolean>(this.spec.configKeys.useWSL, false)
        : false,
    });
    const args = commandInfo.leadingArgs.concat(this.spec.buildArgs(context));
    const runInput: LinterRunInput = { command: commandInfo.command, args, cwd };

    this.logger.info("Executing", { command: runInput.command, args: runInput.args, cwd });

    try {
      const result = await runTool({
        command: runInput.command,
        args: runInput.args,
        cwd: runInput.cwd,
        collectStdout: true,
        collectStderr: true,
        cancellationToken: run.cancellationToken,
      });
      if (!run.isCurrent()) {
        return;
      }
      const diagnostics = await this.spec.parseDiagnostics(result, context, runInput);
      if (!run.isCurrent()) {
        return;
      }
      this.publishResult(doc, run, diagnostics);
    } catch (err) {
      this.handleFailure(err, doc, run);
    }
  }

  private publishResult(
    doc: vscode.TextDocument,
    run: LintRunHandle,
    result: LinterDiagnosticResult
  ): void {
    if (result.kind === 'singleFile') {
      this.logger.info`${result.diagnostics.length} errors/warnings returned`;
      this.publishDocumentDiagnosticsIfCurrent(doc, run, result.diagnostics);
      return;
    }

    const count = Array.from(result.diagnosticsByUri.values()).reduce(
      (total, entry) => total + entry.diagnostics.length,
      0
    );
    this.logger.info`${count} errors/warnings returned`;
    this.publishDiagnosticsIfCurrent(doc, run, result.diagnosticsByUri);
  }

  private handleFailure(err: unknown, doc: vscode.TextDocument, run: LintRunHandle): void {
    if (err instanceof ToolRunError && err.reason === 'cancelled') {
      return;
    }
    if (err instanceof ToolRunError) {
      if (this.spec.id === 'iverilog') {
        this.logger.warn`${this.spec.id} failed: ${err.message}`;
      } else {
        this.logger.error`${this.spec.id} failed: ${err.message}`;
      }
    } else {
      this.logger.error`${this.spec.id} exception: ${err}`;
    }
    this.publishEmptyDiagnostics(doc, run);
  }

  private publishEmptyDiagnostics(doc: vscode.TextDocument, run: LintRunHandle): void {
    if (this.spec.diagnosticMode === 'multiFile') {
      const diagnosticsByUri: DiagnosticMap = new Map();
      this.publishDiagnosticsIfCurrent(doc, run, diagnosticsByUri);
      return;
    }
    this.publishDocumentDiagnosticsIfCurrent(doc, run, []);
  }
}

export type GenericLinterConfig = LinterConfig;
