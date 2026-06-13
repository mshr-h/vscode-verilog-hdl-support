// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import type { CompileUnit, MacroDefine, SourceFileRef } from '../project/ProjectTypes';
import type { HierarchyInstanceNode, HierarchyNode } from '../hierarchy/HierarchyTypes';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';

export type RootSection = 'project' | 'modules' | 'packages' | 'hierarchy' | 'unresolved';
export type CompileUnitGroup = 'files' | 'includeDirs' | 'defines';

export type HdlExplorerPayload =
  | { kind: 'section'; section: RootSection }
  | { kind: 'compileUnits'; compileUnits: CompileUnit[] }
  | { kind: 'compileUnit'; compileUnit: CompileUnit }
  | { kind: 'compileUnitGroup'; group: CompileUnitGroup; compileUnit: CompileUnit }
  | { kind: 'sourceFile'; file: SourceFileRef }
  | { kind: 'includeDir'; uri: vscode.Uri }
  | { kind: 'define'; name: string; define: MacroDefine }
  | { kind: 'symbol'; symbol: ModuleRecord | SymbolRecord }
  | { kind: 'hierarchyModule'; node: HierarchyNode }
  | { kind: 'hierarchyInstance'; instance: HierarchyInstanceNode }
  | { kind: 'info' };

export type HdlExplorerItemKind =
  | 'hdlExplorer.projectRoot'
  | 'hdlExplorer.section'
  | 'hdlExplorer.info'
  | 'hdlExplorer.compileUnits'
  | 'hdlExplorer.compileUnit'
  | 'hdlExplorer.compileUnitGroup'
  | 'hdlExplorer.sourceFile'
  | 'hdlExplorer.includeDir'
  | 'hdlExplorer.define'
  | 'hdlExplorer.module'
  | 'hdlExplorer.package'
  | 'hdlExplorer.symbol'
  | 'hdlExplorer.hierarchyModule'
  | 'hdlExplorer.hierarchyInstance'
  | 'hdlExplorer.unresolvedInstance';

export class HdlExplorerItem extends vscode.TreeItem {
  constructor(
    label: string,
    readonly kind: HdlExplorerItemKind,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    readonly payload: HdlExplorerPayload = { kind: 'info' }
  ) {
    super(label, collapsibleState);
    this.contextValue = getContextValueForPayload(payload, kind);
  }
}

export function getContextValueForPayload(
  payload: HdlExplorerPayload,
  fallback: HdlExplorerItemKind = 'hdlExplorer.info'
): HdlExplorerItemKind {
  switch (payload.kind) {
    case 'section':
      return payload.section === 'project' ? 'hdlExplorer.projectRoot' : 'hdlExplorer.section';
    case 'compileUnits':
      return 'hdlExplorer.compileUnits';
    case 'compileUnit':
      return 'hdlExplorer.compileUnit';
    case 'compileUnitGroup':
      return 'hdlExplorer.compileUnitGroup';
    case 'sourceFile':
      return 'hdlExplorer.sourceFile';
    case 'includeDir':
      return 'hdlExplorer.includeDir';
    case 'define':
      return 'hdlExplorer.define';
    case 'symbol':
      if (payload.symbol.kind === 'module') {
        return 'hdlExplorer.module';
      }
      return payload.symbol.kind === 'package' ? 'hdlExplorer.package' : 'hdlExplorer.symbol';
    case 'hierarchyModule':
      return 'hdlExplorer.hierarchyModule';
    case 'hierarchyInstance':
      return payload.instance.resolvedModule ? 'hdlExplorer.hierarchyInstance' : 'hdlExplorer.unresolvedInstance';
    case 'info':
      return 'hdlExplorer.info';
    default:
      return fallback;
  }
}

export function createInfoItem(label: string, description?: string): HdlExplorerItem {
  const item = new HdlExplorerItem(label, 'hdlExplorer.info');
  item.description = description;
  return item;
}

export function createCompileUnitItem(compileUnit: CompileUnit): HdlExplorerItem {
  const item = new HdlExplorerItem(
    compileUnit.name,
    'hdlExplorer.compileUnit',
    vscode.TreeItemCollapsibleState.Collapsed,
    { kind: 'compileUnit', compileUnit }
  );
  item.description = compileUnit.id;
  return item;
}

export function createCompileUnitsItem(compileUnits: CompileUnit[]): HdlExplorerItem {
  return new HdlExplorerItem(
    'Compile Units',
    'hdlExplorer.compileUnits',
    vscode.TreeItemCollapsibleState.Collapsed,
    { kind: 'compileUnits', compileUnits }
  );
}

export function createGroupItem(label: string, group: CompileUnitGroup, compileUnit: CompileUnit): HdlExplorerItem {
  return new HdlExplorerItem(
    label,
    'hdlExplorer.compileUnitGroup',
    vscode.TreeItemCollapsibleState.Collapsed,
    { kind: 'compileUnitGroup', group, compileUnit }
  );
}

export function createFileItem(file: SourceFileRef): HdlExplorerItem {
  const item = new HdlExplorerItem(
    path.basename(file.uri.fsPath),
    'hdlExplorer.sourceFile',
    vscode.TreeItemCollapsibleState.None,
    { kind: 'sourceFile', file }
  );
  item.description = file.kind;
  item.resourceUri = file.uri;
  item.command = {
    command: 'verilog.openFileFromExplorer',
    title: 'Open File',
    arguments: [file.uri],
  };
  return item;
}

export function createIncludeDirItem(uri: vscode.Uri): HdlExplorerItem {
  const item = new HdlExplorerItem(
    path.basename(uri.fsPath),
    'hdlExplorer.includeDir',
    vscode.TreeItemCollapsibleState.None,
    { kind: 'includeDir', uri }
  );
  item.description = uri.fsPath;
  item.resourceUri = uri;
  return item;
}

export function createDefineItem(name: string, define: MacroDefine): HdlExplorerItem {
  const item = new HdlExplorerItem(
    name,
    'hdlExplorer.define',
    vscode.TreeItemCollapsibleState.None,
    { kind: 'define', name, define }
  );
  item.description = String(define.value);
  item.tooltip = `${name} = ${String(define.value)} (${define.source})`;
  return item;
}

export function createSymbolItem(symbol: ModuleRecord | SymbolRecord): HdlExplorerItem {
  const item = new HdlExplorerItem(
    symbol.name,
    symbol.kind === 'module' ? 'hdlExplorer.module' : 'hdlExplorer.symbol',
    vscode.TreeItemCollapsibleState.None,
    { kind: 'symbol', symbol }
  );
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
    'hdlExplorer.hierarchyModule',
    childCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    { kind: 'hierarchyModule', node }
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
    instance.resolvedModule ? 'hdlExplorer.hierarchyInstance' : 'hdlExplorer.unresolvedInstance',
    childCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    { kind: 'hierarchyInstance', instance }
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
