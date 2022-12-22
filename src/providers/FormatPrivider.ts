import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import * as path from 'path';
import * as which from 'which';
import { Logger, LogSeverity } from '../logger';

function formatWithVerilogFormat(document: vscode.TextDocument, logger: Logger): vscode.ProviderResult<vscode.TextEdit[]> {
  // grab config from verilog.formatter
  let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatter.verilogFormat');
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
  let tempFilepath: string = path.join(os.tmpdir(), "verilog-format-" + crypto.randomBytes(16).toString('hex') + ".tmp.v");
  fs.writeFileSync(tempFilepath, document.getText(), { flag: "w" });
  logger.log("[Verilog-Format] Temp file created at:" + tempFilepath);

  var args: string[] = ["-f", tempFilepath];

  if (settingsPath !== null && fs.existsSync(settingsPath)) {
    args.push("-s");
    args.push(settingsPath);
  }

  // execute command
  logger.log("[Verilog-Format] Executing command: " + binPath + " " + args.join(" "));
  try {
    child_process.execFileSync(binPath, args, {});

    let formattedText: string = fs.readFileSync(tempFilepath, { encoding: "utf-8" });
    let wholeFileRange: vscode.Range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length));
    fs.rmSync(tempFilepath);

    return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
  } catch (err) {
    logger.log("[Verilog-Format]  " + err.toString(), LogSeverity.error);
  }

  if (fs.existsSync(tempFilepath)) {
    fs.rmSync(tempFilepath);
  }
  return [];
}

function formatWithIStyleVerilogFormatter(document: vscode.TextDocument, logger: Logger): vscode.ProviderResult<vscode.TextEdit[]> {
  // grab config from verilog.iStyleVerilogFormatter
  let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatter.iStyleVerilogFormatter');
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
  let tempFilepath: string = path.join(os.tmpdir(), "istyle-verilog-format-" + crypto.randomBytes(16).toString('hex') + ".tmp.v");
  fs.writeFileSync(tempFilepath, document.getText(), { flag: "w" });
  logger.log("[iStyle-Formatter] Temp file created at:" + tempFilepath);

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

  args.push(tempFilepath);

  // execute command
  logger.log("[iStyle-Formater] Executing command: " + binPath + " " + args.join(" "));
  try {
    child_process.execFileSync(binPath, args, {});

    let formattedText: string = fs.readFileSync(tempFilepath, { encoding: "utf-8" });
    let wholeFileRange: vscode.Range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length));
    fs.rmSync(tempFilepath);

    return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
  } catch (err) {
    logger.log("[iStyle-Formatter] " + err.toString(), LogSeverity.error);
  }

  if (fs.existsSync(tempFilepath)) {
    fs.rmSync(tempFilepath);
  }
  return [];
}

function formatWithVeribleVerilogFormat(document: vscode.TextDocument, logger: Logger): vscode.ProviderResult<vscode.TextEdit[]> {
  // grab config from verilog.veribleVerilogFormatter
  let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatter.veribleVerilogFormatter');
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
  let tempFilepath: string = path.join(os.tmpdir(), "verible-verilog-format-" + crypto.randomBytes(16).toString('hex') + ".tmp.v");
  fs.writeFileSync(tempFilepath, document.getText(), { flag: "w" });
  logger.log("[verible-verilog-format] Temp file created at:" + tempFilepath);

  var args: string[] = ["--inplace"];
  if (customArgs.length > 0) {
    args = args.concat(customArgs.split(" "));
  }

  args.push(tempFilepath);

  // execute command
  logger.log("[verible-verilog-format] Executing command: " + binPath + " " + args.join(" "));
  try {
    child_process.execFileSync(binPath, args, {});

    let formattedText: string = fs.readFileSync(tempFilepath, { encoding: "utf-8" });
    let wholeFileRange: vscode.Range = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length));
    fs.rmSync(tempFilepath);

    return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
  } catch (err) {
    logger.log("[verible-verilog-format] " + err.toString(), LogSeverity.error);
  }

  if (fs.existsSync(tempFilepath)) {
    fs.rmSync(tempFilepath);
  }
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
    let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('verilog.formatter.verilogHDL');
    let formatter: string | null = <string>(settings.get("name", null));

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
