// SPDX-License-Identifier: MIT
import * as path from 'path';
import which = require('which');
import type { CompileUnit, ProjectSnapshot } from '../../project/ProjectTypes';
import { runTool, ToolRunError, type ToolRunOptions, type ToolRunResult } from '../../tools/ToolRunner';
import type { AnalysisResult } from './AnalysisBackend';
import type { AnalysisSettings } from './AnalysisSettings';
import { enrichSymbolsWithSlangAst } from './SlangAstParser';
import { FastIndexerBackend } from './FastIndexerBackend';

export interface SlangBackendDependencies {
  runTool: (options: ToolRunOptions) => Promise<ToolRunResult>;
  resolveExecutable: (command: string) => Promise<string | undefined>;
}

export class SlangIndexerBackend {
  constructor(
    private readonly settings: AnalysisSettings,
    private readonly fastBackend = new FastIndexerBackend(),
    private readonly deps: SlangBackendDependencies = {
      runTool,
      resolveExecutable: resolveExecutableOnPath,
    }
  ) {}

  async build(snapshot: ProjectSnapshot): Promise<AnalysisResult> {
    const fastSymbols = await this.fastBackend.build(snapshot);
    const resolvedSlang = await this.deps.resolveExecutable(this.settings.slangPath);
    if (!resolvedSlang) {
      return {
        symbols: fastSymbols,
        metadata: {
          requestedEngine: 'slang',
          actualEngine: 'fast',
          cacheEnabled: this.settings.cacheEnabled,
          fallbackReason: `slang binary not found: ${this.settings.slangPath}`,
        },
      };
    }

    try {
      let symbols = fastSymbols;
      for (const compileUnit of snapshot.compileUnits) {
        if (compileUnit.files.length === 0) {
          continue;
        }
        const ast = await this.loadAst(resolvedSlang, snapshot, compileUnit);
        symbols = enrichSymbolsWithSlangAst(symbols, ast);
      }
      return {
        symbols,
        metadata: {
          requestedEngine: 'slang',
          actualEngine: 'slang',
          cacheEnabled: this.settings.cacheEnabled,
        },
      };
    } catch (error) {
      return {
        symbols: fastSymbols,
        metadata: {
          requestedEngine: 'slang',
          actualEngine: 'fast',
          cacheEnabled: this.settings.cacheEnabled,
          fallbackReason: fallbackMessage(error),
        },
      };
    }
  }

  private async loadAst(
    slangPath: string,
    snapshot: ProjectSnapshot,
    compileUnit: CompileUnit
  ): Promise<unknown> {
    const result = await this.deps.runTool({
      command: slangPath,
      args: buildSlangAstArgs(compileUnit, this.settings.slangArguments),
      cwd: snapshot.workspaceRoot.fsPath,
      timeoutMs: 15000,
      collectStdout: true,
      collectStderr: true,
    });
    if (result.exitCode !== 0) {
      throw new Error(`slang exited with code ${result.exitCode ?? 'unknown'}`);
    }
    const stdout = result.stdout.trim();
    if (stdout.length === 0) {
      throw new Error('slang did not emit AST JSON');
    }
    return JSON.parse(stdout) as unknown;
  }
}

export function buildSlangAstArgs(
  compileUnit: CompileUnit,
  extraArgs: string[]
): string[] {
  return [
    ...extraArgs,
    '--ast-json',
    ...compileUnit.includeDirs.map((dir) => `-I${dir.fsPath}`),
    ...Object.values(compileUnit.defines).map((define) =>
      define.value === true ? `-D${define.name}` : `-D${define.name}=${define.value}`
    ),
    ...compileUnit.files
      .filter((file) => file.kind !== 'include')
      .map((file) => path.relative(compileUnit.root.fsPath, file.uri.fsPath)),
  ];
}

async function resolveExecutableOnPath(command: string): Promise<string | undefined> {
  try {
    return await which(command);
  } catch {
    return undefined;
  }
}

function fallbackMessage(error: unknown): string {
  if (error instanceof ToolRunError) {
    return `${error.reason}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
