// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export type HdlExplorerItemKind =
  | 'hdlExplorer.slangProject'
  | 'hdlExplorer.section'
  | 'hdlExplorer.info'
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
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
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
