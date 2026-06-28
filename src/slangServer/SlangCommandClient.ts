// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export enum SlangKind {
  Instance = 'Instance',
  Scope = 'Scope',
  ScopeArray = 'ScopeArray',
  Port = 'Port',
  Param = 'Param',
  Logic = 'Logic',
  InstanceArray = 'InstanceArray',
  Package = 'Package',
}

export interface SlangLocation {
  uri: string;
  range: vscode.Range;
}

export interface SlangItem {
  kind: SlangKind;
  instName: string;
  instLoc: SlangLocation;
}

export interface SlangVar extends SlangItem {
  type: string;
  value?: string;
}

export interface SlangScope extends SlangItem {
  children: SlangHierItem[];
}

export interface SlangInstance extends SlangItem {
  declName: string;
  declLoc: SlangLocation;
  children: SlangHierItem[];
}

export type SlangHierItem = SlangVar | SlangScope | SlangInstance;

export interface SlangModule {
  declName: string;
  declLoc: SlangLocation;
  inst?: SlangQualifiedInstance;
  instCount: number;
}

export interface SlangQualifiedInstance {
  instPath: string;
  instLoc: SlangLocation;
}

export interface ExpandMacroArgs {
  src: string;
  dst: string;
}

export class SlangCommandClient {
  async setTopLevel(fsPath: string): Promise<void> {
    await vscode.commands.executeCommand('slang.setTopLevel', fsPath);
  }

  async setBuildFile(fsPath: string): Promise<void> {
    await vscode.commands.executeCommand('slang.setBuildFile', fsPath);
  }

  async getScope(hierPath: string): Promise<SlangHierItem[]> {
    return (await vscode.commands.executeCommand('slang.getScope', hierPath)) ?? [];
  }

  async getScopesByModule(): Promise<SlangModule[]> {
    return (await vscode.commands.executeCommand('slang.getScopesByModule')) ?? [];
  }

  async getInstancesOfModule(declName: string): Promise<SlangQualifiedInstance[]> {
    return (await vscode.commands.executeCommand('slang.getInstancesOfModule', declName)) ?? [];
  }

  async getFilesContainingModule(moduleName: string): Promise<string[]> {
    return (await vscode.commands.executeCommand('slang.getFilesContainingModule', moduleName)) ?? [];
  }

  async getModulesInFile(fsPath: string): Promise<string[]> {
    return (await vscode.commands.executeCommand('slang.getModulesInFile', fsPath)) ?? [];
  }

  async expandMacros(args: ExpandMacroArgs): Promise<boolean> {
    return (await vscode.commands.executeCommand('slang.expandMacros', args)) ?? false;
  }
}

export function toVscodeLocation(location: SlangLocation | undefined): vscode.Location | undefined {
  if (!location) {
    return undefined;
  }
  return new vscode.Location(vscode.Uri.parse(location.uri), location.range);
}
