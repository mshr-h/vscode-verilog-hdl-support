// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import type { CompileUnit, MacroDefine, SourceFileRef } from '../project/ProjectTypes';
import type { HierarchyInstanceNode, HierarchyNode } from '../hierarchy/HierarchyTypes';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';

export type HdlExplorerItemKind =
  | 'section'
  | 'info'
  | 'compileUnit'
  | 'group'
  | 'file'
  | 'symbol'
  | 'hierarchyModule'
  | 'hierarchyInstance';

export class HdlExplorerItem extends vscode.TreeItem {
  constructor(
    label: string,
    readonly kind: HdlExplorerItemKind,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    readonly payload?: unknown
  ) {
    super(label, collapsibleState);
    this.contextValue = kind;
  }
}

export function createSectionItem(label: string): HdlExplorerItem {
  return new HdlExplorerItem(label, 'section', vscode.TreeItemCollapsibleState.Expanded);
}

export function createInfoItem(label: string, description?: string): HdlExplorerItem {
  const item = new HdlExplorerItem(label, 'info');
  item.description = description;
  return item;
}

export function createCompileUnitItem(compileUnit: CompileUnit): HdlExplorerItem {
  const item = new HdlExplorerItem(
    compileUnit.name,
    'compileUnit',
    vscode.TreeItemCollapsibleState.Collapsed,
    compileUnit
  );
  item.description = compileUnit.id;
  return item;
}

export function createGroupItem(label: string, payload: unknown): HdlExplorerItem {
  return new HdlExplorerItem(label, 'group', vscode.TreeItemCollapsibleState.Collapsed, payload);
}

export function createFileItem(file: SourceFileRef): HdlExplorerItem {
  const item = new HdlExplorerItem(path.basename(file.uri.fsPath), 'file', vscode.TreeItemCollapsibleState.None, file);
  item.description = file.kind;
  item.resourceUri = file.uri;
  item.command = {
    command: 'vscode.open',
    title: 'Open File',
    arguments: [file.uri],
  };
  return item;
}

export function createDefineItem(name: string, define: MacroDefine): HdlExplorerItem {
  const item = createInfoItem(name, String(define.value));
  item.tooltip = `${name} = ${String(define.value)} (${define.source})`;
  return item;
}

export function createSymbolItem(symbol: ModuleRecord | SymbolRecord): HdlExplorerItem {
  const item = new HdlExplorerItem(symbol.name, 'symbol', vscode.TreeItemCollapsibleState.None, symbol);
  item.description = symbol.compileUnitId;
  item.resourceUri = symbol.uri;
  item.command = {
    command: 'verilog.openModuleFromExplorer',
    title: 'Open HDL Symbol',
    arguments: [new vscode.Location(symbol.uri, symbol.selectionRange)],
  };
  return item;
}

export function createHierarchyModuleItem(node: HierarchyNode): HdlExplorerItem {
  const childCount = node.instances.length + node.unresolvedInstances.length;
  const item = new HdlExplorerItem(
    node.moduleName,
    'hierarchyModule',
    childCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    node
  );
  if (node.module) {
    item.description = node.module.compileUnitId;
    item.resourceUri = node.module.uri;
    item.command = {
      command: 'verilog.openModuleFromExplorer',
      title: 'Open HDL Module',
      arguments: [new vscode.Location(node.module.uri, node.module.selectionRange)],
    };
  }
  return item;
}

export function createHierarchyInstanceItem(instance: HierarchyInstanceNode): HdlExplorerItem {
  const childCount = instance.children
    ? instance.children.instances.length + instance.children.unresolvedInstances.length
    : 0;
  const item = new HdlExplorerItem(
    `${instance.instanceName} : ${instance.moduleName}`,
    'hierarchyInstance',
    childCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    instance
  );
  item.description = instance.resolvedModule ? undefined : 'unresolved';
  item.resourceUri = instance.location.uri;
  item.command = {
    command: 'verilog.openInstanceFromExplorer',
    title: 'Open HDL Instance',
    arguments: [instance.location],
  };
  return item;
}
