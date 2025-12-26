// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import BaseLinter from './BaseLinter';
import { Logger } from '../logger';

let standardToArg: Map<string, string> = new Map<string, string>([
  ['Verilog-95', '-g1995'],
  ['Verilog-2001', '-g2001'],
  ['Verilog-2005', '-g2005'],
  ['SystemVerilog2005', '-g2005-sv'],
  ['SystemVerilog2009', '-g2009'],
  ['SystemVerilog2012', '-g2012'],
]);

export default class IcarusLinter extends BaseLinter {
  private configuration!: vscode.WorkspaceConfiguration;
  private linterInstalledPath!: string;
  private arguments!: string;
  private includePath!: string[];
  private standards!: Map<string, string>;
  private runAtFileLocation!: boolean;

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: Logger) {
    super('iverilog', diagnosticCollection, logger);
    vscode.workspace.onDidChangeConfiguration(() => {
      this.updateConfig();
    });
    this.updateConfig();
  }

  private updateConfig() {
    this.linterInstalledPath = <string>(
      vscode.workspace.getConfiguration().get('verilog.linting.path')
    );
    this.configuration = vscode.workspace.getConfiguration('verilog.linting.iverilog');
    this.arguments = <string>this.configuration.get('arguments');
    let path = <string[]>this.configuration.get('includePath');
    this.includePath = path.map((includePath: string) => this.resolvePath(includePath));
    this.standards = new Map<string, string>([
      ['verilog', this.configuration.get('verilogHDL.standard') || ''],
      ['systemverilog', this.configuration.get('systemVerilog.standard') || ''],
    ]);
    this.runAtFileLocation = <boolean>this.configuration.get('runAtFileLocation');
  }

  protected convertToSeverity(kind?: string, msg?: string): vscode.DiagnosticSeverity {
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

  protected lint(doc: vscode.TextDocument) {
    this.logger.info('Executing IcarusLinter.lint()');

    let binPath: string = path.join(this.linterInstalledPath, 'iverilog');
    this.logger.info('iverilog binary path: ' + binPath);

    let args: string[] = [];
    args.push('-t null');

    const standard = this.standards.get(doc.languageId);
    const standardArg = standard ? standardToArg.get(standard) : undefined;
    if (standardArg) {
      args.push(standardArg);
    }
    args = args.concat(this.includePath.map((path: string) => '-I "' + path + '"'));
    args.push(this.arguments);
    args.push('"' + doc.uri.fsPath + '"');

    let command: string = binPath + ' ' + args.join(' ');

    let cwd: string =
      this.runAtFileLocation || vscode.workspace.workspaceFolders === undefined
        ? path.dirname(doc.uri.fsPath)
        : vscode.workspace.workspaceFolders[0].uri.fsPath;

    this.logger.info('Execute');
    this.logger.info('  command: ', command);
    this.logger.info('  cwd    : ', cwd);

    var _: child.ChildProcess = child.exec(
      command,
      { cwd: cwd },
      (_error: child.ExecException | null, _stdout: string, stderr: string) => {
        // Parse output lines
        // the message is something like this
        // /home/ubuntu/project1/module_1.sv:3: syntax error"
        // /home/ubuntu/project1/property_1.sv:3: error: Invalid module instantiation"
        // test.v:8: error: Module test was already declared here: ./float_add.v:6

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

        let output = stderr + "\n" + _stdout;
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
          } else {
            // concat with newline
            if (current) {
              current += "\n" + line;
            }
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
          const restLines = chunk.includes("\n") ? "\n" + chunk.split("\n").slice(1).join("\n") : "";
          const message = (msgFirst + restLines).trim();

          const severity = this.convertToSeverity(kind, message);

          // 3) Resolve file path and create Diagnostic
          const fsPath = path.isAbsolute(fileRaw) ? fileRaw : path.resolve(cwd, fileRaw);

          const range = makeLineRange(doc, lineNum);
          const d = new vscode.Diagnostic(range, message, severity);
          d.source = "iverilog";

          const arr = diagMap.get(fsPath) ?? [];
          arr.push(d);
          diagMap.set(fsPath, arr);
        }

        this.diagnosticCollection.clear();
        for (const [fsPath, diags] of diagMap) {
          this.diagnosticCollection.set(vscode.Uri.file(fsPath), diags);
        }
      }
    );
  }
}
