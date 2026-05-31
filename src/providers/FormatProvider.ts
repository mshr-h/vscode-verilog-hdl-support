// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import * as path from 'path';
import { type Logger } from '@logtape/logtape';
import { getExtensionLogger } from '../logging';
import { runTool, ToolRunError } from '../tools/ToolRunner';
import { splitCommandLineArgs } from '../utils/commandLine';
import { resolveConfigPath } from '../utils/configPath';
import { getWorkspaceRootForDocument } from '../utils/workspace';

export interface FormatProviderDependencies {
  runTool?: typeof runTool;
}

export function buildVerilogFormatArgs(
  tmpFilepath: string,
  settingsPath: string,
  workspaceFolder?: string,
  existsSync: (candidate: string) => boolean = fs.existsSync
): string[] {
  const args: string[] = ['-f', tmpFilepath];
  const resolvedSettingsPath = resolveConfigPath(settingsPath, workspaceFolder);
  if (resolvedSettingsPath !== '' && existsSync(resolvedSettingsPath)) {
    args.push('-s');
    args.push(resolvedSettingsPath);
  }
  return args;
}

export function buildIStyleVerilogFormatterArgs(
  tmpFilepath: string,
  customArgs: string,
  formatStyle: string
): string[] {
  const args: string[] = ['-n', ...splitCommandLineArgs(customArgs)];

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

export function buildVeribleVerilogFormatArgs(tmpFilepath: string, customArgs: string): string[] {
  return ['--inplace', ...splitCommandLineArgs(customArgs), tmpFilepath];
}

// handle temporary file
class TemporaryFile {
  public readonly path: string;

  constructor(prefix: string, ext: string) {
    this.path = path.join(
      os.tmpdir(),
      `${prefix  }-${  crypto.randomBytes(16).toString('hex')  }.tmp${  ext}`
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
  private runToolFn: typeof runTool;
  public logger: Logger;
  public config: vscode.WorkspaceConfiguration;

  constructor(
    namespace: string,
    tmpFileExt: string,
    logger: Logger,
    dependencies: FormatProviderDependencies = {}
  ) {
    this.namespace = namespace;
    this.logger = logger;
    this.tmpFileExt = tmpFileExt;
    this.runToolFn = dependencies.runTool ?? runTool;
    this.config = vscode.workspace.getConfiguration(`verilog.formatting.${  namespace}`);
  }

  // should be implemented to match formatter's argument
  protected abstract prepareArgument(document: vscode.TextDocument, tmpFilepath: string): string[];

  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    // create temporary file and copy document to it
    const tempFile: TemporaryFile = new TemporaryFile(this.namespace, this.tmpFileExt);
    try {
      tempFile.writeFileSync(document.getText(), { flag: 'w' });
      this.logger.info("Temp file created", { path: tempFile.path });

      const args: string[] = this.prepareArgument(document, tempFile.path);

      // execute command
      const binPath: string = this.config.get('path', '');
      const cwd = getWorkspaceRootForDocument(document);
      this.logger.info("Executing formatter", { binPath, args, cwd });
      const result = await this.runToolFn({
        command: binPath,
        args,
        cwd,
        collectStdout: true,
        collectStderr: true,
        cancellationToken: token,
      });
      if (result.exitCode !== 0) {
        this.logger.error("Formatter exited with non-zero status", {
          command: result.command,
          args: result.args,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        });
        return [];
      }
      const formattedText: string = tempFile.readFileSync({ encoding: 'utf-8' });
      const wholeFileRange: vscode.Range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      return [vscode.TextEdit.replace(wholeFileRange, formattedText)];
    } catch (err) {
      if (err instanceof ToolRunError && err.reason === 'cancelled') {
        return [];
      }
      this.logger.error("Formatter execution failed", { error: String(err) });
      if (err instanceof Error && err.stack) {
        this.logger.error("Stack trace", { stack: err.stack });
      }
      return [];
    } finally {
      tempFile.dispose();
    }
  }
}
class VerilogFormatEditProvider extends FileBasedFormattingEditProvider {
  prepareArgument(document: vscode.TextDocument, tmpFilepath: string): string[] {
    const settingsPath: string = <string>this.config.get('settings', '');
    return buildVerilogFormatArgs(tmpFilepath, settingsPath, getWorkspaceRootForDocument(document));
  }
}

class IStyleVerilogFormatterEditProvider extends FileBasedFormattingEditProvider {
  prepareArgument(_document: vscode.TextDocument, tmpFilepath: string): string[] {
    const customArgs: string = <string>this.config.get('arguments', '');
    const formatStyle: string = <string>this.config.get('style', 'Indent only');
    return buildIStyleVerilogFormatterArgs(tmpFilepath, customArgs, formatStyle);
  }
}
class VeribleVerilogFormatEditProvider extends FileBasedFormattingEditProvider {
  prepareArgument(_document: vscode.TextDocument, tmpFilepath: string): string[] {
    const customArgs: string = <string>this.config.get('arguments', '');
    return buildVeribleVerilogFormatArgs(tmpFilepath, customArgs);
  }
}

export class VerilogFormatProvider implements vscode.DocumentFormattingEditProvider {
  private readonly logger = getExtensionLogger('Provider', 'Format', 'Verilog');

  constructor(private readonly dependencies: FormatProviderDependencies = {}) {}

  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
      'verilog.formatting.verilogHDL'
    );
    const formatter: string = <string>settings.get('formatter', '');
    const verilogFormatter = new VerilogFormatEditProvider(
      'verilogFormat',
      '.v',
      this.logger,
      this.dependencies
    );
    const iStyleVerilogFormatter = new IStyleVerilogFormatterEditProvider(
      'iStyleVerilogFormatter',
      '.v',
      this.logger,
      this.dependencies
    );
    const veribleVerilogFormatter = new VeribleVerilogFormatEditProvider(
      'veribleVerilogFormatter',
      '.v',
      this.logger,
      this.dependencies
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
  private readonly logger = getExtensionLogger('Provider', 'Format', 'SystemVerilog');

  constructor(private readonly dependencies: FormatProviderDependencies = {}) {}

  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
      'verilog.formatting.systemVerilog'
    );
    const formatter: string = <string>settings.get('formatter', '');
    const veribleVerilogFormatter = new VeribleVerilogFormatEditProvider(
      'veribleVerilogFormatter',
      '.sv',
      this.logger,
      this.dependencies
    );

    switch (formatter) {
      case 'verible-verilog-format':
        return veribleVerilogFormatter.provideDocumentFormattingEdits(document, _options, _token);
    }
    return [];
  }
}
