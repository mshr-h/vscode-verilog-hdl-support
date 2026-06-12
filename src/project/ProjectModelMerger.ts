// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import type { ParsedDefine } from '../filelist/FilelistParser';
import type { ResolvedFileRef, ResolvedPathRef } from '../filelist/FilelistResolver';
import {
  detectSourceLanguageId,
  type CompileUnit,
  type MacroDefine,
  type SourceFileKind,
  type SourceFileRef,
} from './ProjectTypes';

export interface CompileUnitBuildInput {
  id: string;
  name: string;
  root: vscode.Uri;
  files: Array<ResolvedFileRef | { resolvedPath: string; kind: SourceFileKind }>;
  includeDirs: Array<ResolvedPathRef | { resolvedPath: string }>;
  defines: ParsedDefine[];
  settingsIncludeDirs: string[];
  settingsDefines: Record<string, string | boolean | number>;
  settingsTopModules?: string[];
  source: CompileUnit['source'];
}

export function buildCompileUnit(input: CompileUnitBuildInput): CompileUnit {
  return {
    id: input.id,
    name: input.name,
    root: input.root,
    files: dedupeSourceFiles(input.files),
    includeDirs: dedupeUris(
      input.includeDirs
        .map((includeDir) => vscode.Uri.file(includeDir.resolvedPath))
        .concat(input.settingsIncludeDirs.map((includeDir) => resolveSettingsUri(includeDir, input.root)))
    ),
    defines: mergeDefines(input.defines, input.settingsDefines),
    topModules: input.settingsTopModules?.slice() ?? [],
    source: input.source,
  };
}

export function dedupeSourceFiles(
  files: Array<ResolvedFileRef | { resolvedPath: string; kind: SourceFileKind }>
): SourceFileRef[] {
  const seen = new Set<string>();
  const deduped: SourceFileRef[] = [];
  for (const file of files) {
    const uri = vscode.Uri.file(path.normalize(file.resolvedPath));
    const key = uri.fsPath;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push({
      uri,
      languageId: detectSourceLanguageId(uri),
      kind: file.kind,
      order: deduped.length,
    });
  }
  return deduped;
}

export function mergeDefines(
  filelistDefines: ParsedDefine[],
  settingsDefines: Record<string, string | boolean | number>
): Record<string, MacroDefine> {
  const merged: Record<string, MacroDefine> = {};
  for (const define of filelistDefines) {
    if (define.name.length === 0) {
      continue;
    }
    merged[define.name] = {
      name: define.name,
      value: define.value,
      source: 'filelist',
    };
  }
  for (const [name, value] of Object.entries(settingsDefines)) {
    merged[name] = {
      name,
      value: value === true ? true : String(value),
      source: 'settings',
    };
  }
  return merged;
}

function resolveSettingsUri(inputPath: string, root: vscode.Uri): vscode.Uri {
  if (path.isAbsolute(inputPath)) {
    return vscode.Uri.file(inputPath);
  }
  return vscode.Uri.file(path.join(root.fsPath, inputPath));
}

function dedupeUris(uris: vscode.Uri[]): vscode.Uri[] {
  const seen = new Set<string>();
  const deduped: vscode.Uri[] = [];
  for (const uri of uris) {
    if (seen.has(uri.fsPath)) {
      continue;
    }
    seen.add(uri.fsPath);
    deduped.push(uri);
  }
  return deduped;
}
