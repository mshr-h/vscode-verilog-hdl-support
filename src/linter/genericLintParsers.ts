// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import { END_OF_LINE } from '../constants';
import { splitCommandLineArgs } from '../utils/commandLine';

const standardToArg: Map<string, string> = new Map<string, string>([
  ['Verilog-95', '-g1995'],
  ['Verilog-2001', '-g2001'],
  ['Verilog-2005', '-g2005'],
  ['SystemVerilog2005', '-g2005-sv'],
  ['SystemVerilog2009', '-g2009'],
  ['SystemVerilog2012', '-g2012'],
]);

export interface BuildVeribleVerilogLintArgsOptions {
  customArguments: string;
  documentPath: string;
}

export function buildVeribleVerilogLintArgs(
  options: BuildVeribleVerilogLintArgsOptions
): string[] {
  return [...splitCommandLineArgs(options.customArguments), options.documentPath];
}

export interface ParseVeribleVerilogLintDiagnosticsOptions {
  output: string;
  cwd: string;
  documentPath: string;
  isWindows: boolean;
}

export function convertVeribleSeverity(message: string): vscode.DiagnosticSeverity {
  const lower = message.toLowerCase();
  if (lower.includes('error') || lower.includes('fatal') || lower.includes('syntax')) {
    return vscode.DiagnosticSeverity.Error;
  }
  if (lower.includes('warning')) {
    return vscode.DiagnosticSeverity.Warning;
  }
  return vscode.DiagnosticSeverity.Warning;
}

export function parseVeribleVerilogLintDiagnostics(
  options: ParseVeribleVerilogLintDiagnosticsOptions
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const re = /^(.*?):(\d+):(\d+)(?:-(\d+))?:\s*(.*?)(?:\s*\[(.+?)\])?$/;
  let docPath = options.documentPath;
  if (options.isWindows) {
    docPath = docPath.replace(/\\/g, '/');
  }

  options.output.split(/\r?\n/g).forEach((line) => {
    const rex = line.match(re);
    if (!rex) {
      return;
    }

    const filePath = rex[1];
    let resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(options.cwd, filePath);
    if (options.isWindows) {
      resolvedPath = resolvedPath.replace(/\\/g, '/');
    }

    if (path.normalize(resolvedPath) !== path.normalize(docPath)) {
      return;
    }

    const lineNum = Number(rex[2]) - 1;
    const colStart = Number(rex[3]) - 1;
    const colEnd = rex[4] ? Number(rex[4]) - 1 : END_OF_LINE;
    const message = rex[5].trim();
    const ruleName = rex[6] ? rex[6].trim() : '';

    diagnostics.push({
      severity: convertVeribleSeverity(message),
      range: new vscode.Range(lineNum, colStart, lineNum, colEnd),
      message,
      code: ruleName.length > 0 ? ruleName : 'verible-verilog-lint',
      source: 'verible-verilog-lint',
    });
  });

  return diagnostics;
}

export interface BuildXvlogArgsOptions {
  languageId: string;
  includePaths: string[];
  customArguments: string;
  documentPath: string;
}

export function buildXvlogArgs(options: BuildXvlogArgsOptions): string[] {
  const args: string[] = ['-nolog'];
  if (options.languageId === 'systemverilog') {
    args.push('-sv');
  }
  for (const includePath of options.includePaths) {
    args.push('-i', includePath);
  }
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(options.documentPath);
  return args;
}

export function convertXvlogSeverity(severityString: string): vscode.DiagnosticSeverity {
  if (severityString === 'ERROR') {
    return vscode.DiagnosticSeverity.Error;
  }
  return vscode.DiagnosticSeverity.Warning;
}

export function parseXvlogDiagnostics(stdout: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  stdout.split(/\r?\n/g).forEach((line) => {
    const match = line.match(
      /^(ERROR|WARNING):\s+\[(VRFC\b[^\]]*)\]\s+(.*\S)\s+\[(.*):(\d+)\]\s*$/
    );
    if (!match) {
      return;
    }

    const lineno = parseInt(match[5]) - 1;

    diagnostics.push({
      severity: convertXvlogSeverity(match[1]),
      code: match[2],
      message: `[${  match[2]  }] ${  match[3]}`,
      range: new vscode.Range(lineno, 0, lineno, END_OF_LINE),
      source: 'xvlog',
    });
  });

  return diagnostics;
}

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

export function convertModelsimSeverity(severityString: string): vscode.DiagnosticSeverity {
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

export interface BuildIcarusArgsOptions {
  languageId: string;
  standards: Map<string, string>;
  includePaths: string[];
  customArguments: string;
  documentPath: string;
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

export function convertIcarusSeverity(kind?: string, msg?: string): vscode.DiagnosticSeverity {
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
  return new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 1));
}

export function parseIcarusDiagnostics(
  output: string,
  cwd: string,
  doc?: vscode.TextDocument
): Map<string, vscode.Diagnostic[]> {
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
      current += `\n${  line}`;
    }
  }
  if (current) {
    chunks.push(current);
  }

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
    const restLines = chunk.includes("\n") ? `\n${  chunk.split("\n").slice(1).join("\n")}` : "";
    const message = (msgFirst + restLines).trim();
    const severity = convertIcarusSeverity(kind, message);
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
