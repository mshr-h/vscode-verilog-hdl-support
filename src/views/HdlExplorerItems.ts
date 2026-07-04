// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { SlangInstance, SlangModule, SlangScope } from '../slangServer/SlangServerApi';

export type RootSection = 'server' | 'build' | 'modules' | 'hierarchy';

export type HdlExplorerPayload =
  | { kind: 'section'; section: RootSection }
  | { kind: 'module'; module: SlangModule }
  | { kind: 'scope'; scope: SlangScope }
  | { kind: 'instance'; instance: SlangInstance }
  | { kind: 'info' };

export type HdlExplorerItemKind =
  | 'hdlExplorer.section'
  | 'hdlExplorer.info'
  | 'hdlExplorer.module'
  | 'hdlExplorer.scope'
  | 'hdlExplorer.instance';

export class HdlExplorerItem extends vscode.TreeItem {
  constructor(
    label: string,
    readonly kind: HdlExplorerItemKind,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    readonly payload: HdlExplorerPayload = { kind: 'info' }
  ) {
    super(label, collapsibleState);
    this.contextValue = kind;
  }
}

export function createInfoItem(label: string, description?: string): HdlExplorerItem {
  const item = new HdlExplorerItem(label, 'hdlExplorer.info');
  item.description = description;
  return item;
}

export function createSectionItem(label: string, section: RootSection): HdlExplorerItem {
  return new HdlExplorerItem(label, 'hdlExplorer.section', vscode.TreeItemCollapsibleState.Collapsed, {
    kind: 'section',
    section,
  });
}

export function createModuleItem(module: SlangModule, location?: vscode.Location): HdlExplorerItem {
  const item = new HdlExplorerItem(module.name, 'hdlExplorer.module', vscode.TreeItemCollapsibleState.None, {
    kind: 'module',
    module,
  });
  if (location) {
    item.resourceUri = location.uri;
    item.command = {
      command: 'verilog.openModuleFromExplorer',
      title: 'Open Module',
      arguments: [location],
    };
  }
  return item;
}

export function createScopeItem(scope: SlangScope, collapsible: boolean, location?: vscode.Location): HdlExplorerItem {
  const item = new HdlExplorerItem(
    scope.name ?? scope.moduleName ?? scope.instPath ?? '(scope)',
    'hdlExplorer.scope',
    collapsible ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    { kind: 'scope', scope }
  );
  if (scope.moduleName && scope.moduleName !== item.label) {
    item.description = scope.moduleName;
  }
  if (location) {
    item.resourceUri = location.uri;
    item.command = {
      command: 'verilog.openInstanceFromExplorer',
      title: 'Open Scope',
      arguments: [location],
    };
  }
  return item;
}

export function createInstanceItem(instance: SlangInstance, collapsible: boolean, location?: vscode.Location): HdlExplorerItem {
  const label = instance.name && instance.moduleName
    ? `${instance.name} : ${instance.moduleName}`
    : instance.instPath ?? instance.name ?? '(instance)';
  const item = new HdlExplorerItem(
    label,
    'hdlExplorer.instance',
    collapsible ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    { kind: 'instance', instance }
  );
  if (location) {
    item.resourceUri = location.uri;
    item.command = {
      command: 'verilog.openInstanceFromExplorer',
      title: 'Open Instance',
      arguments: [location],
    };
  }
  return item;
}
