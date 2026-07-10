// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { SlangServerConfig } from './SlangServerConfig';

const HDL_GLOB = '**/*.{v,vh,sv,svh}';

export interface SlangWasmStartupPolicy {
  env: Record<string, string>;
  skipAutoIndexing: boolean;
}

export interface SlangWasmStartupPolicyOptions {
  workspaceFolder: vscode.WorkspaceFolder;
  maxAutoIndexedFiles: number;
  traceServer: SlangServerConfig['traceServer'];
  outputChannel: Pick<vscode.LogOutputChannel, 'warn'>;
  findFiles?: typeof vscode.workspace.findFiles;
}

export async function resolveSlangWasmStartupPolicy(
  options: SlangWasmStartupPolicyOptions
): Promise<SlangWasmStartupPolicy> {
  const findFiles = options.findFiles ?? vscode.workspace.findFiles;
  let skipAutoIndexing: boolean;

  try {
    const files = await findFiles(
      new vscode.RelativePattern(options.workspaceFolder, HDL_GLOB),
      null,
      options.maxAutoIndexedFiles + 1
    );
    skipAutoIndexing = files.length > options.maxAutoIndexedFiles;
    if (skipAutoIndexing) {
      options.outputChannel.warn(
        `Automatic slang-server workspace indexing was skipped because more than ${options.maxAutoIndexedFiles} HDL files were found. `
        + 'Configure .slang/server.json "index" or increase verilog.slangServer.wasm.maxAutoIndexedFiles.'
      );
    }
  } catch (err) {
    skipAutoIndexing = true;
    options.outputChannel.warn(
      `Automatic slang-server workspace indexing was skipped because HDL files could not be counted: ${
        err instanceof Error ? err.message : String(err)
      }. Configure .slang/server.json "index" or increase verilog.slangServer.wasm.maxAutoIndexedFiles.`
    );
  }

  return {
    env: createWasmServerEnv(options.traceServer, skipAutoIndexing),
    skipAutoIndexing,
  };
}

export function createWasmServerEnv(
  traceServer: SlangServerConfig['traceServer'],
  skipAutoIndexing: boolean
): Record<string, string> {
  const env: Record<string, string> = {
    SLANG_SERVER_WASI_DEFER_CONFIG_LOAD: '1',
  };

  if (skipAutoIndexing) {
    env.SLANG_SERVER_WASI_SKIP_AUTO_INDEXING = '1';
  }
  if (traceServer !== 'off') {
    env.SLANG_SERVER_TESTS = '1';
  }

  return env;
}
