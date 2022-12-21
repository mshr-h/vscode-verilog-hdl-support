import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import * as path from 'path';
import { Logger, LogSeverity } from '../logger';

export class VerilogFormatProvider implements vscode.DocumentFormattingEditProvider {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    // grab config from verilog.formatter
    let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatter');
    let binPath: string = <string>(settings.get("path", "verilog-format"));
    let settingsPath: string | null = <string>(settings.get("settings", null));

    // create temporary file and copy document to it
    let tempFilepath: string = path.join(os.tmpdir(), "verilog-format-" + crypto.randomBytes(16).toString('hex') + ".tmp.v");
    fs.writeFileSync(tempFilepath, document.getText(), { flag: "w" });
    this.logger.log("[Verilog-Format] Temp file created at:" + tempFilepath);

    var args: string[] = ["-f", tempFilepath];

    if (settingsPath !== null && fs.existsSync(settingsPath)) {
      args.push("-s");
      args.push(settingsPath);
    }

    // execute command
    this.logger.log("[Verilog-Format] Executing command: " + binPath + " " + args.join(" "));
    try {
      child_process.execFileSync(binPath, args, {});

      let formattedText: string = fs.readFileSync(tempFilepath, { encoding: "utf-8" });
      let wholeFileRange: vscode.Range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length));
      fs.rmSync(tempFilepath);

      return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
    } catch (err) {
      this.logger.log("[Verilog-Format] Error on verilog-format: " + err.toString(), LogSeverity.error);
    }

    if (fs.existsSync(tempFilepath)) {
      fs.rmSync(tempFilepath);
    }
    return [];
  }
}
