// SPDX-License-Identifier: MIT
import type * as vscode from 'vscode';
import { runTool } from './ToolRunner';

const DEFAULT_WSLPATH_TIMEOUT_MS = 5000;

export interface WslPathConversionOptions {
  cancellationToken?: vscode.CancellationToken;
  timeoutMs?: number;
  wslCommand?: string;
  runToolFn?: typeof runTool;
}

function stripTrailingLineBreaks(value: string): string {
  return value.replace(/[\r\n]+$/g, '');
}

async function convertWslPath(
  inputPath: string,
  args: string[],
  options: WslPathConversionOptions = {}
): Promise<string> {
  const command = options.wslCommand ?? 'wsl';
  const fullArgs = [...args, inputPath];
  const runToolFn = options.runToolFn ?? runTool;
  const result = await runToolFn({
    command,
    args: fullArgs,
    timeoutMs: options.timeoutMs ?? DEFAULT_WSLPATH_TIMEOUT_MS,
    collectStdout: true,
    collectStderr: true,
    cancellationToken: options.cancellationToken,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `wslpath failed: command=${command} args=${JSON.stringify(fullArgs)} exitCode=${
        result.exitCode
      } stderr=${result.stderr}`
    );
  }

  return stripTrailingLineBreaks(result.stdout);
}

export async function convertToWslPath(
  inputPath: string,
  options?: WslPathConversionOptions
): Promise<string> {
  return convertWslPath(inputPath, ['wslpath'], options);
}

export async function convertFromWslPath(
  inputPath: string,
  options?: WslPathConversionOptions
): Promise<string> {
  return convertWslPath(inputPath, ['wslpath', '-w'], options);
}
