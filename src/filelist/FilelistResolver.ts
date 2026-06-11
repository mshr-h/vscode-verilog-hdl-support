// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import { parseFilelist, type FilelistDiagnostic, type ParsedDefine, type ParsedFileRef, type ParsedPathRef } from './FilelistParser';

export interface ResolvedPathRef extends ParsedPathRef {
  resolvedPath: string;
}

export interface ResolvedFileRef extends ParsedFileRef {
  resolvedPath: string;
}

export interface ResolvedFilelist {
  files: ResolvedFileRef[];
  includeDirs: ResolvedPathRef[];
  defines: ParsedDefine[];
  libraryDirs: ResolvedPathRef[];
  libraryFiles: ResolvedPathRef[];
  nestedFilelists: ResolvedPathRef[];
  diagnostics: FilelistDiagnostic[];
}

export function resolveFilelist(filelistPath: string): ResolvedFilelist {
  return resolveFilelistInternal(path.resolve(filelistPath), []);
}

function resolveFilelistInternal(filelistPath: string, stack: string[]): ResolvedFilelist {
  const resolved: ResolvedFilelist = emptyResolvedFilelist();
  const normalizedPath = path.resolve(filelistPath);
  const containingDir = path.dirname(normalizedPath);

  if (stack.includes(normalizedPath)) {
    resolved.diagnostics.push({
      severity: 'error',
      message: `Nested filelist cycle detected: ${stack.concat(normalizedPath).join(' -> ')}`,
      source: normalizedPath,
      code: 'nested-filelist-cycle',
      path: normalizedPath,
    });
    return resolved;
  }

  if (!fs.existsSync(normalizedPath)) {
    resolved.diagnostics.push({
      severity: 'error',
      message: `Missing filelist: ${normalizedPath}`,
      source: normalizedPath,
      code: 'missing-filelist',
      path: normalizedPath,
    });
    return resolved;
  }

  const parsed = parseFilelist(fs.readFileSync(normalizedPath, 'utf8'), normalizedPath);
  resolved.diagnostics.push(...parsed.diagnostics);
  resolved.files.push(...parsed.files.map((file) => resolveFileRef(file, containingDir)));
  resolved.includeDirs.push(...parsed.includeDirs.map((dir) => resolvePathRef(dir, containingDir)));
  resolved.defines.push(...parsed.defines);
  resolved.libraryDirs.push(...parsed.libraryDirs.map((dir) => resolvePathRef(dir, containingDir)));
  resolved.libraryFiles.push(...parsed.libraryFiles.map((file) => resolvePathRef(file, containingDir)));

  for (const file of resolved.files) {
    if (!fs.existsSync(file.resolvedPath)) {
      resolved.diagnostics.push({
        severity: 'warning',
        message: `Missing source file: ${file.resolvedPath}`,
        source: normalizedPath,
        code: 'missing-source-file',
        path: file.resolvedPath,
        line: file.line,
        character: file.character,
      });
    }
  }

  for (const includeDir of resolved.includeDirs) {
    if (!fs.existsSync(includeDir.resolvedPath)) {
      resolved.diagnostics.push({
        severity: 'warning',
        message: `Missing include directory: ${includeDir.resolvedPath}`,
        source: normalizedPath,
        code: 'missing-include-dir',
        path: includeDir.resolvedPath,
        line: includeDir.line,
        character: includeDir.character,
      });
    }
  }

  for (const nested of parsed.nestedFilelists) {
    const nestedRef = resolvePathRef(nested, containingDir);
    resolved.nestedFilelists.push(nestedRef);
    const nestedResolved = resolveFilelistInternal(nestedRef.resolvedPath, stack.concat(normalizedPath));
    mergeResolvedFilelist(resolved, nestedResolved);
  }

  return resolved;
}

function emptyResolvedFilelist(): ResolvedFilelist {
  return {
    files: [],
    includeDirs: [],
    defines: [],
    libraryDirs: [],
    libraryFiles: [],
    nestedFilelists: [],
    diagnostics: [],
  };
}

function resolvePathRef(ref: ParsedPathRef, baseDir: string): ResolvedPathRef {
  return {
    ...ref,
    resolvedPath: path.isAbsolute(ref.path) ? path.normalize(ref.path) : path.resolve(baseDir, ref.path),
  };
}

function resolveFileRef(ref: ParsedFileRef, baseDir: string): ResolvedFileRef {
  return {
    ...ref,
    resolvedPath: path.isAbsolute(ref.path) ? path.normalize(ref.path) : path.resolve(baseDir, ref.path),
  };
}

function mergeResolvedFilelist(target: ResolvedFilelist, source: ResolvedFilelist): void {
  target.files.push(...source.files);
  target.includeDirs.push(...source.includeDirs);
  target.defines.push(...source.defines);
  target.libraryDirs.push(...source.libraryDirs);
  target.libraryFiles.push(...source.libraryFiles);
  target.nestedFilelists.push(...source.nestedFilelists);
  target.diagnostics.push(...source.diagnostics);
}
