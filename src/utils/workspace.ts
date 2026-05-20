// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';

export function getWorkspaceFolderForUri(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.getWorkspaceFolder(uri);
}

export function getWorkspaceRootForUri(uri: vscode.Uri): string | undefined {
  return getWorkspaceFolderForUri(uri)?.uri.fsPath;
}

export function getWorkspaceRootForDocument(doc: vscode.TextDocument): string | undefined {
  return getWorkspaceRootForUri(doc.uri);
}

export function resolvePathForDocument(inputPath: string, doc: vscode.TextDocument): string {
  return resolvePathForWorkspaceRoot(inputPath, getWorkspaceRootForDocument(doc));
}

export function resolvePathsForDocument(paths: string[], doc: vscode.TextDocument): string[] {
  return paths.map((inputPath) => resolvePathForDocument(inputPath, doc));
}

export function getWorkingDirectoryForDocument(
  doc: vscode.TextDocument,
  runAtFileLocation: boolean
): string {
  return getWorkingDirectoryForPath(doc.uri.fsPath, getWorkspaceRootForDocument(doc), runAtFileLocation);
}

export function resolvePathForWorkspaceRoot(
  inputPath: string,
  workspaceRoot: string | undefined
): string {
  if (path.isAbsolute(inputPath) || !workspaceRoot) {
    return inputPath;
  }
  return path.join(workspaceRoot, inputPath);
}

export function getWorkingDirectoryForPath(
  documentPath: string,
  workspaceRoot: string | undefined,
  runAtFileLocation: boolean
): string {
  const docFolder = path.dirname(documentPath);
  if (runAtFileLocation) {
    return docFolder;
  }
  return workspaceRoot ?? docFolder;
}
