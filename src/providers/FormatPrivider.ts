// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import * as path from 'path';
import { Logger } from '../logger';

// handle temporary file
class TemporaryFile {
  public readonly path: string;

  constructor(prefix: string, ext: string) {
    this.path = path.join(
      os.tmpdir(),
      prefix + '-' + crypto.randomBytes(16).toString('hex') + '.tmp' + ext
    );
  }

  public writeFileSync(data: string, options?: fs.WriteFileOptions) {
    fs.writeFileSync(this.path, data, options);
  }

  public readFileSync(
    options: BufferEncoding | { encoding: BufferEncoding; flag?: string }
  ): string {
    return fs.readFileSync(this.path, options);
  }

  public dispose(): void {
    if (fs.existsSync(this.path)) {
      fs.rmSync(this.path);
    }
  }
}

// Base class
abstract class FileBasedFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
  private namespace: string;
  private tmpFileExt: string; // .v, .sv, .vhd
  public logger: Logger;
  public config: vscode.WorkspaceConfiguration;

  constructor(namespace: string, tmpFileExt: string, logger: Logger) {
    this.namespace = namespace;
    this.logger = logger;
    this.tmpFileExt = tmpFileExt;
    this.config = vscode.workspace.getConfiguration('verilog.formatting.' + namespace);
  }

  // should be implemented to match formatter's argument
  protected abstract prepareArgument(tmpFilepath: string): string[];

  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    // create temporary file and copy document to it
    let tempFile: TemporaryFile = new TemporaryFile(this.namespace, this.tmpFileExt);
    tempFile.writeFileSync(document.getText(), { flag: 'w' });
    this.logger.info('Temp file created at:' + tempFile.path);

    let args: string[] = this.prepareArgument(tempFile.path);

    // execute command
    let binPath: string = this.config.get('path');
    this.logger.info('Executing command: ' + binPath + ' ' + args.join(' '));
    try {
      child_process.execFileSync(binPath, args, {});
      let formattedText: string = tempFile.readFileSync({ encoding: 'utf-8' });
      let wholeFileRange: vscode.Range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      tempFile.dispose();
      return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
    } catch (err) {
      this.logger.error(err.toString());
    }

    tempFile.dispose();
    return [];
  }
}
class VerilogFormatEditProvider extends FileBasedFormattingEditProvider {
  prepareArgument(tmpFilepath: string): string[] {
    var args: string[] = ['-f', tmpFilepath];
    let settingsPath: string | null = this.config.get('settings');
    if (settingsPath !== null && fs.existsSync(settingsPath)) {
      args.push('-s');
      args.push(settingsPath);
    }
    return args;
  }
}

class IStyleVerilogFormatterEditProvider extends FileBasedFormattingEditProvider {
  prepareArgument(tmpFilepath: string): string[] {
    let customArgs: string = <string>this.config.get('arguments', '');
    let formatStyle: string = <string>this.config.get('style', 'Indent only');

    // -n means not to create a .orig file
    var args: string[] = ['-n'];
    if (customArgs.length > 0) {
      args = args.concat(customArgs.split(' '));
    }

    // format style
    switch (formatStyle) {
      case 'ANSI':
        args.push('--style=ansi');
        break;
      case 'K&R':
        args.push('--style=kr');
        break;
      case 'GNU':
        args.push('--style=gnu');
        break;
    }
    args.push(tmpFilepath);
    return args;
  }
}
class VeribleVerilogFormatEditProvider extends FileBasedFormattingEditProvider {
  prepareArgument(tmpFilepath: string): string[] {
    let customArgs: string = <string>this.config.get('arguments', '');

    var args: string[] = ['--inplace'];
    if (customArgs.length > 0) {
      args = args.concat(customArgs.split(' '));
    }
    args.push(tmpFilepath);
    return args;
  }
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
    let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
      'verilog.formatting.verilogHDL'
    );
    let formatter: string | null = <string>settings.get('formatter', null);
    let verilogFormatter = new VerilogFormatEditProvider('verilogFormat', '.v', this.logger);
    let iStyleVerilogFormatter = new IStyleVerilogFormatterEditProvider(
      'iStyleVerilogFormatter',
      '.v',
      this.logger
    );
    let veribleVerilogFormatter = new VeribleVerilogFormatEditProvider(
      'veribleVerilogFormatter',
      '.v',
      this.logger
    );

    switch (formatter) {
      case 'verilog-format':
        return verilogFormatter.provideDocumentFormattingEdits(document, _options, _token);
      case 'iStyle':
        return iStyleVerilogFormatter.provideDocumentFormattingEdits(document, _options, _token);
      case 'verible-verilog-format':
        return veribleVerilogFormatter.provideDocumentFormattingEdits(document, _options, _token);
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
    let settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
      'verilog.formatting.systemVerilog'
    );
    let formatter: string | null = <string>settings.get('formatter', null);
    let veribleVerilogFormatter = new VeribleVerilogFormatEditProvider(
      'veribleVerilogFormatter',
      '.sv',
      this.logger
    );

    switch (formatter) {
      case 'verible-verilog-format':
        return veribleVerilogFormatter.provideDocumentFormattingEdits(document, _options, _token);
    }
    return [];
  }
}
