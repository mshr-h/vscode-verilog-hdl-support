// SPDX-License-Identifier: MIT
import * as path from 'path';
import type * as vscode from 'vscode';
import { convertToWslPath, type WslPathConversionOptions } from './WslPathConverter';

export type CwdMode = 'hostNormalizedOnWindows' | 'hostRawForWsl';

export interface ExecutionContextOptions {
  isWindows: boolean;
  useWSL: boolean;
  linterInstalledPath: string;
  windowsExecutable: string;
  unixExecutable: string;
  wslExecutableName?: string;
  runAtFileLocation: boolean;
  workspaceFolder?: string;
  cancellationToken?: vscode.CancellationToken;
  cwdMode?: CwdMode;
  convertToWslPathFn?: typeof convertToWslPath;
}

export interface PrepareExecutionOptions {
  documentPath: string;
  includePaths: string[];
}

export interface PreparedExecution {
  command: string;
  leadingArgs: string[];
  documentPath: string;
  documentFolder: string;
  includePaths: string[];
  cwd: string;
}

export class ExecutionContext {
  private readonly conversionCache = new Map<string, Promise<string>>();

  constructor(private readonly options: ExecutionContextOptions) {}

  buildCommand(): Pick<PreparedExecution, 'command' | 'leadingArgs'> {
    const joinPath = this.options.isWindows ? path.win32.join : path.join;
    if (this.options.isWindows && this.options.useWSL) {
      return {
        command: joinPath(this.options.linterInstalledPath, 'wsl'),
        leadingArgs: [this.options.wslExecutableName ?? this.options.unixExecutable],
      };
    }
    return {
      command: joinPath(
        this.options.linterInstalledPath,
        this.options.isWindows ? this.options.windowsExecutable : this.options.unixExecutable
      ),
      leadingArgs: [],
    };
  }

  async prepare(options: PrepareExecutionOptions): Promise<PreparedExecution> {
    const commandInfo = this.buildCommand();
    const dirname = this.options.isWindows ? path.win32.dirname : path.dirname;
    const rawDocumentFolder = dirname(options.documentPath);
    let documentPath = options.documentPath;
    let documentFolder = rawDocumentFolder;
    let includePaths = options.includePaths;

    if (this.options.isWindows) {
      if (this.options.useWSL) {
        documentPath = await this.convertToWslPath(options.documentPath, commandInfo.command);
        documentFolder = await this.convertToWslPath(rawDocumentFolder, commandInfo.command);
        includePaths = await Promise.all(
          options.includePaths.map((includePath) =>
            this.convertToWslPath(includePath, commandInfo.command)
          )
        );
      } else {
        documentPath = options.documentPath.replace(/\\/g, '/');
        documentFolder = rawDocumentFolder.replace(/\\/g, '/');
      }
    }

    return {
      ...commandInfo,
      documentPath,
      documentFolder,
      includePaths,
      cwd: this.getCwd(options.documentPath, rawDocumentFolder, documentFolder),
    };
  }

  private getCwd(
    documentPath: string,
    rawDocumentFolder: string,
    preparedDocumentFolder: string
  ): string {
    if (!this.options.runAtFileLocation) {
      return this.options.workspaceFolder ?? preparedDocumentFolder;
    }
    if (!this.options.isWindows) {
      return preparedDocumentFolder;
    }
    if (this.options.useWSL && this.options.cwdMode === 'hostRawForWsl') {
      return rawDocumentFolder;
    }
    const dirname = path.win32.dirname;
    return dirname(documentPath.replace(/\\/g, '/'));
  }

  private async convertToWslPath(inputPath: string, wslCommand: string): Promise<string> {
    let existing = this.conversionCache.get(inputPath);
    if (!existing) {
      const convert = this.options.convertToWslPathFn ?? convertToWslPath;
      const conversionOptions: WslPathConversionOptions = {
        cancellationToken: this.options.cancellationToken,
        wslCommand,
      };
      existing = Promise.resolve(convert(inputPath, conversionOptions));
      this.conversionCache.set(inputPath, existing);
    }
    return existing;
  }
}
