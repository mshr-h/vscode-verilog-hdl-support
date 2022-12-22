import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import * as path from 'path';
import * as which from 'which';
import { Logger, LogSeverity } from '../logger';

class TemporaryFile {
  public readonly filePath: string;

  constructor(prefix: string, ext: string) {
    this.filePath = path.join(os.tmpdir(), prefix + crypto.randomBytes(16).toString('hex') + ".tmp" + ext);
  }

  public writeFileSync(data: string, options?: fs.WriteFileOptions) {
    fs.writeFileSync(this.filePath, data, options);
  }

  public readFileSync(options: BufferEncoding | { encoding: BufferEncoding; flag?: string }): string {
    return fs.readFileSync(this.filePath, options);
  }

  public dispose(): void {
    if (fs.existsSync(this.filePath)) {
      fs.rmSync(this.filePath);
    }
  }
}

function formatWithVerilogFormat(document: vscode.TextDocument, logger: Logger): vscode.ProviderResult<vscode.TextEdit[]> {
  // grab config from verilog.formatter
  let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatting.verilogFormat');
  let binPath: string = <string>(settings.get("path", "verilog-format"));
  let settingsPath: string | null = <string>(settings.get("settings", null));

  // check if binary found
  try {
    which.sync(binPath);
  } catch (e) {
    logger.log("[Verilog-Format] cannot find executable: " + binPath, LogSeverity.error);
    return [];
  }

  // create temporary file and copy document to it
  let tempFile: TemporaryFile = new TemporaryFile("verilog-format-", ".v");
  tempFile.writeFileSync(document.getText(), { flag: "w" });
  logger.log("[Verilog-Format] Temp file created at:" + tempFile.filePath);

  var args: string[] = ["-f", tempFile.filePath];

  if (settingsPath !== null && fs.existsSync(settingsPath)) {
    args.push("-s");
    args.push(settingsPath);
  }

  // execute command
  logger.log("[Verilog-Format] Executing command: " + binPath + " " + args.join(" "));
  try {
    child_process.execFileSync(binPath, args, {});
    let formattedText: string = tempFile.readFileSync({ encoding: "utf-8" });
    let wholeFileRange: vscode.Range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length));
    tempFile.dispose();
    return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
  } catch (err) {
    logger.log("[Verilog-Format]  " + err.toString(), LogSeverity.error);
  }

  tempFile.dispose();
  return [];
}

function formatWithIStyleVerilogFormatter(document: vscode.TextDocument, logger: Logger): vscode.ProviderResult<vscode.TextEdit[]> {
  // grab config from verilog.iStyleVerilogFormatter
  let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatting.iStyleVerilogFormatter');
  let binPath: string = <string>(settings.get("path", "iStyle"));
  let customArgs: string = <string>(settings.get("arguments", ""));
  let formatStyle: string = <string>(settings.get("style", "Indent only"));

  // check if binary found
  try {
    which.sync(binPath);
  } catch (e) {
    logger.log("[iStyle-Formatter] cannot find executable: " + binPath, LogSeverity.error);
    return [];
  }

  // create temporary file and copy document to it
  let tempFile: TemporaryFile = new TemporaryFile("istyle-verilog-format-", ".v");
  tempFile.writeFileSync(document.getText(), { flag: "w" });
  logger.log("[iStyle-Formatter] Temp file created at:" + tempFile.filePath);

  // -n means not to create a .orig file
  var args: string[] = ["-n"];
  if (customArgs.length > 0) {
    args = args.concat(customArgs.split(" "));
  }

  // format style
  switch (formatStyle) {
    case "ANSI":
      args.push("--style=ansi");
      break;
    case "K&R":
      args.push("--style=kr");
      break;
    case "GNU":
      args.push("--style=gnu");
      break;
  }

  args.push(tempFile.filePath);

  // execute command
  logger.log("[iStyle-Formater] Executing command: " + binPath + " " + args.join(" "));
  try {
    child_process.execFileSync(binPath, args, {});
    let formattedText: string = tempFile.readFileSync({ encoding: "utf-8" });
    let wholeFileRange: vscode.Range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length));

    tempFile.dispose();
    return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
  } catch (err) {
    logger.log("[iStyle-Formatter] " + err.toString(), LogSeverity.error);
  }

  tempFile.dispose();
  return [];
}

function formatWithVeribleVerilogFormat(document: vscode.TextDocument, logger: Logger): vscode.ProviderResult<vscode.TextEdit[]> {
  // grab config from verilog.veribleVerilogFormatter
  let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatting.veribleVerilogFormatter');
  let binPath: string = <string>(settings.get("path", "verible-verilog-format"));
  let customArgs: string = <string>(settings.get("arguments", ""));

  // check if binary found
  try {
    which.sync(binPath);
  } catch (e) {
    logger.log("[verible-verilog-format] cannot find executable: " + binPath, LogSeverity.error);
    return [];
  }

  // create temporary file and copy document to it
  let tempFile: TemporaryFile = new TemporaryFile("verible-verilog-format-", ".v");
  tempFile.writeFileSync(document.getText(), { flag: "w" });
  logger.log("[verible-verilog-format] Temp file created at:" + tempFile.filePath);

  var args: string[] = ["--inplace"];
  if (customArgs.length > 0) {
    args = args.concat(customArgs.split(" "));
  }

  args.push(tempFile.filePath);

  // execute command
  logger.log("[verible-verilog-format] Executing command: " + binPath + " " + args.join(" "));
  try {
    child_process.execFileSync(binPath, args, {});
    let formattedText: string = tempFile.readFileSync({ encoding: "utf-8" });
    let wholeFileRange: vscode.Range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length));

    tempFile.dispose();
    return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
  } catch (err) {
    logger.log("[verible-verilog-format] " + err.toString(), LogSeverity.error);
  }

  tempFile.dispose();
  return [];
}

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
    let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatting.verilogHDL');
    let formatter: string | null = <string>(settings.get("formatter", null));

    switch (formatter) {
      case "verilog-format":
        return formatWithVerilogFormat(document, this.logger);
      case "iStyle":
        return formatWithIStyleVerilogFormatter(document, this.logger);
      case "verible-verilog-format":
        return formatWithVeribleVerilogFormat(document, this.logger);
    }
    return [];
  }
}

export class SystemVerilogFormatProvider implements vscode.DocumentFormattingEditProvider {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatting.systemVerilog');
    let formatter: string | null = <string>(settings.get("formatter", null));

    switch (formatter) {
      case "verible-verilog-format":
        return formatWithVeribleVerilogFormat(document, this.logger);
    }
    return [];
  }
}
