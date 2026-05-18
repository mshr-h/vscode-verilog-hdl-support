// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as path from 'path';
import BaseLinter from './BaseLinter';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import LinterDiagnosticManager, { type DiagnosticMap } from './LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from './LintRunManager';

const standardToArg: Map<string, string> = new Map<string, string>([
  ['Verilog-95', '-g1995'],
  ['Verilog-2001', '-g2001'],
  ['Verilog-2005', '-g2005'],
  ['SystemVerilog2005', '-g2005-sv'],
  ['SystemVerilog2009', '-g2009'],
  ['SystemVerilog2012', '-g2012'],
]);

export interface BuildIcarusArgsOptions {
  languageId: string;
  standards: Map<string, string>;
  includePaths: string[];
  customArguments: string;
  documentPath: string;
}

export function splitCommandLineArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: "'" | '"' | undefined;
  let hasToken = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '\\') {
      if (i + 1 < input.length) {
        current += input[i + 1];
        hasToken = true;
        i++;
      } else {
        current += char;
        hasToken = true;
      }
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
      hasToken = true;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      hasToken = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (hasToken) {
        args.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }

    current += char;
    hasToken = true;
  }

  if (hasToken) {
    args.push(current);
  }

  return args;
}

export function buildIcarusArgs(options: BuildIcarusArgsOptions): string[] {
  const args: string[] = ['-t', 'null'];
  const standard = options.standards.get(options.languageId);
  const standardArg = standard ? standardToArg.get(standard) : undefined;
  if (standardArg) {
    args.push(standardArg);
  }
  for (const includePath of options.includePaths) {
    args.push('-I', includePath);
  }
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(options.documentPath);
  return args;
}

function convertIcarusSeverity(kind?: string, msg?: string): vscode.DiagnosticSeverity {
  const k = (kind ?? "").toLowerCase();
  if (k === "warning") {
    return vscode.DiagnosticSeverity.Warning;
  }
  if (k === "note") {
    return vscode.DiagnosticSeverity.Information;
  }
  if (k === "error") {
    return vscode.DiagnosticSeverity.Error;
  }
  if ((msg ?? "").toLowerCase().includes("syntax error")) {
    return vscode.DiagnosticSeverity.Error;
  }
  return vscode.DiagnosticSeverity.Error;
}

function makeLineRange(doc: vscode.TextDocument | undefined, oneBasedLine: number): vscode.Range {
  const line = Math.max(0, oneBasedLine - 1);
  if (doc && line < doc.lineCount) {
    const textLine = doc.lineAt(line);
    return new vscode.Range(
      new vscode.Position(line, 0),
      new vscode.Position(line, textLine.text.length)
    );
  }
  // when doc is undefined, e.g., linting on closed files
  return new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 1));
}

export function parseIcarusDiagnostics(
  output: string,
  cwd: string,
  doc?: vscode.TextDocument
): Map<string, vscode.Diagnostic[]> {
  // 1) Group messages (lines starting with "file:line:" are the beginning of a new message)
  const startRe = /^(.+?):(\d+):/;
  const chunks: string[] = [];
  let current = "";

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line) {
      continue;
    }

    if (startRe.test(line)) {
      if (current) {
        chunks.push(current);
      }
      current = line;
    } else if (current) {
      // concat with newline
      current += `\n${  line}`;
    }
  }
  if (current) {
    chunks.push(current);
  }

  // 2) Consider each chunk as: file:line: [error|warning|note:] message
  const diagMap = new Map<string, vscode.Diagnostic[]>();
  const mainRe = /^(?<file>.*?):(?<line>\d+):\s*(?:(?<kind>error|warning|note):\s*)?(?<msg>.*)$/i;

  for (const chunk of chunks) {
    const firstLine = chunk.split("\n", 1)[0];
    const m = firstLine.match(mainRe);
    if (!m || !m.groups) {
      continue;
    }

    const fileRaw = m.groups.file;
    const lineNum = Number(m.groups.line);
    const kind = m.groups.kind;
    const msgFirst = m.groups.msg ?? "";

    // If there are continuation lines in the chunk, include them in the message
    const restLines = chunk.includes("\n") ? `\n${  chunk.split("\n").slice(1).join("\n")}` : "";
    const message = (msgFirst + restLines).trim();

    const severity = convertIcarusSeverity(kind, message);

    // 3) Resolve file path and create Diagnostic
    const fsPath = path.isAbsolute(fileRaw) ? fileRaw : path.resolve(cwd, fileRaw);

    const range = makeLineRange(doc, lineNum);
    const d = new vscode.Diagnostic(range, message, severity);
    d.source = "iverilog";

    const arr = diagMap.get(fsPath) ?? [];
    arr.push(d);
    diagMap.set(fsPath, arr);
  }

  return diagMap;
}

export default class IcarusLinter extends BaseLinter {
  private configuration!: vscode.WorkspaceConfiguration;
  private standards!: Map<string, string>;

  constructor(diagnosticManager: LinterDiagnosticManager, runManager: LintRunManager) {
    super('iverilog', diagnosticManager, runManager);
    this.updateConfig();
  }

  protected override updateConfig() {
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.iverilog');
    this.config.arguments = this.configuration.get<string>('arguments', '');
    const paths = this.configuration.get<string[]>('includePath', []);
    this.config.includePath = this.resolveIncludePaths(paths);
    this.config.runAtFileLocation = this.configuration.get<boolean>('runAtFileLocation', false);
    this.standards = new Map<string, string>([
      ['verilog', this.configuration.get('verilogHDL.standard') || ''],
      ['systemverilog', this.configuration.get('systemVerilog.standard') || ''],
    ]);
  }

  protected convertToSeverity(kind?: string, msg?: string): vscode.DiagnosticSeverity {
    return convertIcarusSeverity(kind, msg);
  }

  protected async lint(doc: vscode.TextDocument, run: LintRunHandle): Promise<void> {
    this.logger.info`Executing IcarusLinter.lint()`;

    const binPath: string = path.join(this.config.linterInstalledPath, 'iverilog');
    this.logger.info`iverilog binary path: ${binPath}`;

    const args = buildIcarusArgs({
      languageId: doc.languageId,
      standards: this.standards,
      includePaths: this.config.includePath,
      customArguments: this.config.arguments,
      documentPath: doc.uri.fsPath,
    });
    const cwd: string = this.getWorkingDirectory(doc);

    this.logger.info("Executing", { command: binPath, args, cwd });

    await this.runIcarus(binPath, args, cwd, doc, run);
  }

  private async runIcarus(
    command: string,
    args: string[],
    cwd: string,
    doc: vscode.TextDocument,
    run: LintRunHandle
  ): Promise<void> {
    try {
      const result = await runTool({
        command,
        args,
        cwd,
        collectStdout: true,
        collectStderr: true,
        cancellationToken: run.cancellationToken,
      });
      if (!run.isCurrent()) {
        return;
      }
      // Parse output lines. Examples:
      // /home/ubuntu/project1/module_1.sv:3: syntax error"
      // /home/ubuntu/project1/property_1.sv:3: error: Invalid module instantiation"
      // test.v:8: error: Module test was already declared here: ./float_add.v:6
      const diagMap = parseIcarusDiagnostics(`${result.stderr  }\n${  result.stdout}`, cwd, doc);
      this.replaceDiagnostics(doc, run, diagMap);
    } catch (err) {
      if (err instanceof ToolRunError && err.reason === 'cancelled') {
        return;
      }
      if (err instanceof ToolRunError) {
        this.logger.warn`iverilog failed: ${err.message}`;
      } else {
        this.logger.error`iverilog exception: ${err}`;
      }
      this.replaceDiagnostics(doc, run, new Map<string, vscode.Diagnostic[]>());
    }
  }

  private replaceDiagnostics(
    doc: vscode.TextDocument,
    run: LintRunHandle,
    diagMap: Map<string, vscode.Diagnostic[]>
  ): void {
    const diagnosticsByUri: DiagnosticMap = new Map();
    for (const [fsPath, diags] of diagMap) {
      const uri = vscode.Uri.file(fsPath);
      diagnosticsByUri.set(uri.toString(), { uri, diagnostics: diags });
    }
    this.publishDiagnosticsIfCurrent(doc, run, diagnosticsByUri);
  }
}
