// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import BaseLinter from './BaseLinter';
import { END_OF_LINE } from '../constants';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import { splitCommandLineArgs } from './IcarusLinter';

export interface BuildModelsimArgsOptions {
  workLibrary: string;
  customArguments: string;
  documentPath: string;
}

export function buildModelsimArgs(options: BuildModelsimArgsOptions): string[] {
  const args: string[] = ['-nologo', '-work', options.workLibrary, options.documentPath];
  args.push(...splitCommandLineArgs(options.customArguments));
  return args;
}

function convertModelsimSeverity(severityString: string): vscode.DiagnosticSeverity {
  switch (severityString) {
    case 'Error':
      return vscode.DiagnosticSeverity.Error;
    case 'Warning':
      return vscode.DiagnosticSeverity.Warning;
  }
  return vscode.DiagnosticSeverity.Information;
}

export function parseModelsimDiagnostics(
  stdout: string,
  documentPath: string
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const lines = stdout.split(/\r?\n/g);
  const regexExp =
    '^\\*\\* (((Error)|(Warning))( \\(suppressible\\))?: )(\\([a-z]+-[0-9]+\\) )?([^\\(]*)\\(([0-9]+)\\): (\\([a-z]+-[0-9]+\\) )?((((near|Unknown identifier|Undefined variable):? )?["\']([\\w:;\\.]+)["\'][ :.]*)?.*)';

  lines.forEach((line) => {
    if (!line.startsWith('**')) {
      return;
    }
    try {
      const m = line.match(regexExp);
      if (!m || m[7] !== documentPath) {
        return;
      }
      const lineNum = parseInt(m[8]) - 1;
      const msg = m[10];
      diagnostics.push({
        severity: convertModelsimSeverity(m[2]),
        range: new vscode.Range(lineNum, 0, lineNum, END_OF_LINE),
        message: msg,
        code: 'modelsim',
        source: 'modelsim',
      });
    } catch {
      diagnostics.push({
        severity: vscode.DiagnosticSeverity.Information,
        range: new vscode.Range(0, 0, 0, END_OF_LINE),
        message: line,
        code: 'modelsim',
        source: 'modelsim',
      });
    }
  });

  return diagnostics;
}

export default class ModelsimLinter extends BaseLinter {
  private modelsimWork!: string;

  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    super('modelsim', diagnosticCollection);
    this.updateConfig();
  }

  protected override updateConfig() {
    const configuration = vscode.workspace.getConfiguration('verilog.linting.modelsim');
    this.config.arguments = configuration.get<string>('arguments', '');
    this.modelsimWork = configuration.get<string>('work', '');
    this.config.runAtFileLocation = configuration.get<boolean>('runAtFileLocation', false);
  }

  protected convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    return convertModelsimSeverity(severityString);
  }

  protected lint(doc: vscode.TextDocument) {
    this.logger.info`modelsim lint requested`;
    const cwd: string = this.getWorkingDirectory(doc);
    // no change needed for systemverilog
    const command = path.join(this.config.linterInstalledPath, 'vlog');
    const args = buildModelsimArgs({
      workLibrary: this.modelsimWork,
      customArguments: this.config.arguments,
      documentPath: doc.fileName,
    });

    this.logger.info("Executing", { command, args, cwd });

    void this.runModelsim(command, args, cwd, doc);
  }

  private async runModelsim(
    command: string,
    args: string[],
    cwd: string,
    doc: vscode.TextDocument
  ): Promise<void> {
    try {
      const result = await runTool({
        command,
        args,
        cwd,
        collectStdout: true,
        collectStderr: true,
      });
      const diagnostics = parseModelsimDiagnostics(result.stdout, doc.fileName);
      this.logger.info`${diagnostics.length} errors/warnings returned`;
      this.diagnosticCollection.set(doc.uri, diagnostics);
    } catch (err) {
      if (err instanceof ToolRunError) {
        this.logger.error`modelsim failed: ${err.message}`;
      } else {
        this.logger.error`modelsim exception: ${err}`;
      }
      this.diagnosticCollection.set(doc.uri, []);
    }
  }
}
