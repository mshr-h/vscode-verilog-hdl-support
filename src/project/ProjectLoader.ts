// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as process from 'process';
import * as vscode from 'vscode';
import type { ResolvedFilelist } from '../filelist/FilelistResolver';
import { getExtensionLogger } from '../logging';
import { buildCompileUnit } from './ProjectModelMerger';
import {
  PROJECT_DIAGNOSTIC_SOURCE,
  type CompileUnit,
  type ProjectDiagnostic,
  type ProjectSnapshot,
  type SourceFileKind,
} from './ProjectTypes';
import { FilelistProjectSourceProvider } from './providers/FilelistProjectSourceProvider';
import { SettingsProjectSourceProvider, type ProjectSettings } from './providers/SettingsProjectSourceProvider';

const logger = getExtensionLogger('Project', 'Loader');

export class ProjectLoader {
  constructor(
    private readonly settingsProvider = new SettingsProjectSourceProvider(),
    private readonly filelistProvider = new FilelistProjectSourceProvider(),
    private readonly getWorkspaceFolders = (): readonly vscode.WorkspaceFolder[] => vscode.workspace.workspaceFolders ?? []
  ) {}

  async load(version: number): Promise<ProjectSnapshot> {
    const settings = this.settingsProvider.getSettings();
    const workspaceFolders = this.getWorkspaceFolders();
    const workspaceRoot = getPrimaryWorkspaceRoot(workspaceFolders);
    const diagnostics: ProjectDiagnostic[] = [];

    if (!workspaceRoot) {
      diagnostics.push({
        severity: 'warning',
        message: 'No workspace root; project model is empty.',
        source: PROJECT_DIAGNOSTIC_SOURCE,
        code: 'no-workspace-root',
      });
      return createSnapshot(version, vscode.Uri.file(process.cwd()), settings.activeTarget, [], diagnostics);
    }

    if (workspaceFolders.length > 1) {
      diagnostics.push({
        severity: 'info',
        message: 'Multi-root workspace detected; project model uses the first workspace folder for this MVP.',
        source: PROJECT_DIAGNOSTIC_SOURCE,
        code: 'multi-root-mvp',
      });
    }

    if (!settings.enabled) {
      diagnostics.push({
        severity: 'info',
        message: 'Project model is disabled by verilog.project.enabled.',
        source: PROJECT_DIAGNOSTIC_SOURCE,
        code: 'project-disabled',
      });
      return createSnapshot(version, workspaceRoot, settings.activeTarget, [], diagnostics);
    }

    const compileUnits =
      settings.filelists.length > 0
        ? this.loadFilelistCompileUnits(workspaceRoot, settings, diagnostics)
        : await this.loadFallbackCompileUnit(workspaceRoot, settings, diagnostics);

    return createSnapshot(version, workspaceRoot, settings.activeTarget, compileUnits, diagnostics);
  }

  private loadFilelistCompileUnits(
    workspaceRoot: vscode.Uri,
    settings: ProjectSettings,
    diagnostics: ProjectDiagnostic[]
  ): CompileUnit[] {
    return settings.filelists.map((filelist, index) => {
      const filelistPath = resolveWorkspacePath(filelist, workspaceRoot);
      logger.info("Loading Verilog project filelist", { filelistPath });
      const resolved = this.filelistProvider.load(filelistPath);
      diagnostics.push(...toProjectDiagnostics(resolved, filelistPath));
      const sourceFiles: Array<{ resolvedPath: string; kind: SourceFileKind }> = resolved.files
        .filter((file) => !isExcludedPath(file.resolvedPath, workspaceRoot.fsPath, settings.exclude))
        .map((file) => ({ ...file, kind: file.kind }));
      const libraryFiles: Array<{ resolvedPath: string; kind: SourceFileKind }> = resolved.libraryFiles
        .filter((file) => !isExcludedPath(file.resolvedPath, workspaceRoot.fsPath, settings.exclude))
        .map((file) => ({ ...file, kind: 'library' as const }));
      return buildCompileUnit({
        id: `filelist:${index}:${path.basename(filelistPath)}`,
        name: path.basename(filelistPath),
        root: workspaceRoot,
        files: [...sourceFiles, ...libraryFiles],
        includeDirs: resolved.includeDirs,
        defines: resolved.defines,
        settingsIncludeDirs: settings.includeDirs,
        settingsDefines: settings.defines,
        source: { type: 'filelist', uri: vscode.Uri.file(filelistPath) },
      });
    });
  }

  private async loadFallbackCompileUnit(
    workspaceRoot: vscode.Uri,
    settings: ProjectSettings,
    diagnostics: ProjectDiagnostic[]
  ): Promise<CompileUnit[]> {
    const exclude = settings.exclude.length > 0 ? `{${settings.exclude.join(',')}}` : undefined;
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(workspaceRoot, '**/*.{v,vh,sv,svh}'),
      exclude
    );
    diagnostics.push({
      severity: 'info',
      message: `No project filelists configured; discovered ${files.length} HDL files.`,
      source: PROJECT_DIAGNOSTIC_SOURCE,
      code: 'fallback-discovery',
    });
    return [
      buildCompileUnit({
        id: 'auto:workspace',
        name: 'Workspace HDL files',
        root: workspaceRoot,
        files: files
          .filter((file) => !isExcludedPath(file.fsPath, workspaceRoot.fsPath, settings.exclude))
          .map((file) => ({ resolvedPath: file.fsPath, kind: 'source' })),
        includeDirs: [],
        defines: [],
        settingsIncludeDirs: settings.includeDirs,
        settingsDefines: settings.defines,
        source: { type: 'auto' },
      }),
    ];
  }
}

function createSnapshot(
  version: number,
  workspaceRoot: vscode.Uri,
  activeTargetId: string,
  compileUnits: CompileUnit[],
  diagnostics: ProjectDiagnostic[]
): ProjectSnapshot {
  return {
    version,
    workspaceRoot,
    activeTargetId,
    compileUnits,
    diagnostics,
  };
}

function getPrimaryWorkspaceRoot(workspaceFolders: readonly vscode.WorkspaceFolder[]): vscode.Uri | undefined {
  return workspaceFolders.at(0)?.uri;
}

function resolveWorkspacePath(inputPath: string, workspaceRoot: vscode.Uri): string {
  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }
  return path.resolve(workspaceRoot.fsPath, inputPath);
}

function toProjectDiagnostics(resolved: ResolvedFilelist, filelistPath: string): ProjectDiagnostic[] {
  return resolved.diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity === 'error' ? 'error' : diagnostic.severity,
    message: diagnostic.message,
    source: PROJECT_DIAGNOSTIC_SOURCE,
    code: diagnostic.code,
    location:
      diagnostic.line !== undefined && diagnostic.character !== undefined
        ? new vscode.Location(
            vscode.Uri.file(diagnostic.source || filelistPath),
            new vscode.Position(diagnostic.line, diagnostic.character)
          )
        : undefined,
  }));
}

function isExcludedPath(inputPath: string, workspaceRoot: string, patterns: string[]): boolean {
  const relative = normalizeRelativePath(path.relative(workspaceRoot, inputPath));
  return patterns.some((pattern) => globToRegExp(normalizeRelativePath(pattern)).test(relative));
}

function normalizeRelativePath(inputPath: string): string {
  return inputPath.split(path.sep).join('/');
}

function globToRegExp(pattern: string): RegExp {
  let source = '^';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i] ?? '';
    const next = pattern[i + 1] ?? '';
    const afterGlobstar = pattern[i + 2] ?? '';
    if (ch === '*' && next === '*' && afterGlobstar === '/') {
      source += '(?:.*/)?';
      i += 2;
    } else if (ch === '*' && next === '*') {
      source += '.*';
      i += 1;
    } else if (ch === '*') {
      source += '[^/]*';
    } else if (ch === '?') {
      source += '[^/]';
    } else {
      source += escapeRegExp(ch);
    }
  }
  source += '$';
  return new RegExp(source);
}

function escapeRegExp(input: string): string {
  return input.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}
