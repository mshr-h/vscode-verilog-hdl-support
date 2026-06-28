// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { SlangServerManager } from '../slangServer/SlangServerManager';
import {
  SlangKind,
  SlangCommandClient,
  toVscodeLocation,
  type SlangHierItem,
  type SlangModule,
  type SlangQualifiedInstance,
} from '../slangServer/SlangCommandClient';
import type { SlangConfigService } from '../slangServer/SlangConfigService';
import { HdlExplorerItem, createInfoItem } from './HdlExplorerItems';

type RootSection = 'project' | 'modules' | 'hierarchy' | 'instances';

type SlangExplorerPayload =
  | { kind: 'section'; section: RootSection }
  | { kind: 'module'; module: SlangModule }
  | { kind: 'scope'; hierPath: string; item: SlangHierItem }
  | { kind: 'instance'; moduleName: string; instance: SlangQualifiedInstance }
  | { kind: 'info' };

class SlangExplorerItem extends HdlExplorerItem {
  constructor(
    label: string,
    contextValue: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    readonly slangPayload: SlangExplorerPayload
  ) {
    super(label, contextValue as never, collapsibleState);
    this.contextValue = contextValue;
  }
}

export class HdlExplorerProvider implements vscode.TreeDataProvider<HdlExplorerItem>, vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<HdlExplorerItem | undefined>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly slangCommands: SlangCommandClient;
  private readonly configService: SlangConfigService | undefined;
  private hierarchyRootFilter: string | undefined;

  readonly onDidChangeTreeData = this.emitter.event;

  constructor(
    slangCommands: SlangCommandClient | unknown,
    configService?: SlangConfigService | unknown,
    _legacyHierarchyService?: unknown
  ) {
    this.slangCommands = isSlangCommandClient(slangCommands)
      ? slangCommands
      : new SlangCommandClient();
    this.configService = isSlangConfigService(configService) ? configService : undefined;
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('verilog.hdlExplorer')) {
          this.refresh();
        }
      })
    );
  }

  refresh(): void {
    this.emitter.fire(undefined);
  }

  getTreeItem(element: HdlExplorerItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: HdlExplorerItem): Promise<HdlExplorerItem[]> {
    if (!isHdlExplorerEnabled()) {
      return [createInfoItem('HDL Explorer disabled', 'verilog.hdlExplorer.enabled=false')];
    }
    if (!element) {
      return this.getRootItems();
    }
    if (!(element instanceof SlangExplorerItem)) {
      return [];
    }
    switch (element.slangPayload.kind) {
      case 'section':
        return this.getSectionChildren(element.slangPayload.section);
      case 'module':
        return this.getModuleChildren(element.slangPayload.module);
      case 'scope':
        return this.getScopeChildren(element.slangPayload.hierPath, element.slangPayload.item);
      default:
        return [];
    }
  }

  setHierarchyRootFilter(moduleName: string): void {
    this.hierarchyRootFilter = moduleName;
    this.refresh();
  }

  clearHierarchyRootFilter(): void {
    this.hierarchyRootFilter = undefined;
    this.refresh();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.emitter.dispose();
  }

  private getRootItems(): HdlExplorerItem[] {
    return [
      rootItem('Slang Project', 'project'),
      rootItem('Modules', 'modules'),
      rootItem('Hierarchy', 'hierarchy'),
      rootItem('Instances', 'instances'),
    ];
  }

  private async getSectionChildren(section: RootSection): Promise<HdlExplorerItem[]> {
    switch (section) {
      case 'project':
        return this.getProjectChildren();
      case 'modules':
        return (await this.safeGetModules()).map(createModuleItem);
      case 'hierarchy':
        return this.getHierarchyChildren();
      case 'instances':
        return this.getInstancesSectionChildren();
    }
  }

  private async getProjectChildren(): Promise<HdlExplorerItem[]> {
    const configUri = this.configService?.getConfigUri();
    const items = [
      createInfoItem('Backend', 'slang-server'),
      createInfoItem('Config', configUri?.fsPath ?? '(no workspace)'),
    ];
    if (this.hierarchyRootFilter) {
      items.push(createInfoItem('Filtered root', this.hierarchyRootFilter));
    }
    return items;
  }

  private async getHierarchyChildren(): Promise<HdlExplorerItem[]> {
    const items = await this.safeGetScope('');
    const roots = this.hierarchyRootFilter
      ? items.filter((item) => getDisplayModuleName(item) === this.hierarchyRootFilter)
      : items;
    return roots.map((item) => createScopeItem(item.instName, item.instName, item));
  }

  private async getInstancesSectionChildren(): Promise<HdlExplorerItem[]> {
    const modules = await this.safeGetModules();
    return modules.map((module) => {
      const item = createModuleItem(module);
      item.collapsibleState = module.instCount > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;
      item.description = `${module.instCount} instance${module.instCount === 1 ? '' : 's'}`;
      return item;
    });
  }

  private async getModuleChildren(module: SlangModule): Promise<HdlExplorerItem[]> {
    const instances = await this.safeGetInstancesOfModule(module.declName);
    return instances.map((instance) => {
      const item = new SlangExplorerItem(
        instance.instPath,
        'hdlExplorer.hierarchyInstance',
        vscode.TreeItemCollapsibleState.None,
        { kind: 'instance', moduleName: module.declName, instance }
      );
      item.command = {
        command: 'verilog.openInstanceFromExplorer',
        title: 'Open Instance',
        arguments: [toVscodeLocation(instance.instLoc)],
      };
      return item;
    });
  }

  private async getScopeChildren(hierPath: string, item: SlangHierItem): Promise<HdlExplorerItem[]> {
    if ('children' in item && item.children.length > 0) {
      return item.children.map((child) => createScopeItem(`${hierPath}.${child.instName}`.replace(/^\./, ''), child.instName, child));
    }
    if (item.kind === SlangKind.Instance || item.kind === SlangKind.InstanceArray || item.kind === SlangKind.Package) {
      return (await this.safeGetScope(hierPath)).map((child) => createScopeItem(`${hierPath}.${child.instName}`.replace(/^\./, ''), child.instName, child));
    }
    return [];
  }

  private async safeGetModules(): Promise<SlangModule[]> {
    try {
      return await this.slangCommands.getScopesByModule();
    } catch {
      return [];
    }
  }

  private async safeGetScope(hierPath: string): Promise<SlangHierItem[]> {
    try {
      return await this.slangCommands.getScope(hierPath);
    } catch {
      return [];
    }
  }

  private async safeGetInstancesOfModule(moduleName: string): Promise<SlangQualifiedInstance[]> {
    try {
      return await this.slangCommands.getInstancesOfModule(moduleName);
    } catch {
      return [];
    }
  }
}

function isSlangCommandClient(input: unknown): input is SlangCommandClient {
  return typeof input === 'object' && input !== null && 'getScope' in input && 'getScopesByModule' in input;
}

function isSlangConfigService(input: unknown): input is SlangConfigService {
  return typeof input === 'object' && input !== null && 'getConfigUri' in input;
}

export function registerHdlExplorerCommands(
  slangCommands: SlangCommandClient,
  slangServerManager: SlangServerManager,
  provider: HdlExplorerProvider
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('verilog.refreshHierarchy', () => provider.refresh()),
    vscode.commands.registerCommand('verilog.refreshHdlExplorer', () => provider.refresh()),
    vscode.commands.registerCommand('verilog.selectSlangBuildFile', () => selectBuildFile(slangServerManager)),
    vscode.commands.registerCommand('verilog.showSlangServerStatus', () => vscode.commands.executeCommand('verilog.doctor')),
    vscode.commands.registerCommand('verilog.showSlangModules', () => provider.refresh()),
    vscode.commands.registerCommand('verilog.openModuleFromExplorer', (arg: unknown) => openOptionalLocation(getLocationFromArg(arg))),
    vscode.commands.registerCommand('verilog.instantiateModuleFromExplorer', () => vscode.commands.executeCommand('verilog.instantiateModule')),
    vscode.commands.registerCommand('verilog.showHierarchyFromModule', (arg: unknown) => {
      const moduleName = getModuleNameFromArg(arg);
      if (moduleName) {
        provider.setHierarchyRootFilter(moduleName);
      }
    }),
    vscode.commands.registerCommand('verilog.clearHierarchyRootFilter', () => provider.clearHierarchyRootFilter()),
    vscode.commands.registerCommand('verilog.findModuleReferencesFromExplorer', async (arg: unknown) => {
      const moduleName = getModuleNameFromArg(arg);
      if (!moduleName) {
        return;
      }
      const files = await slangCommands.getFilesContainingModule(moduleName);
      vscode.window.showInformationMessage(`${moduleName}: ${files.length} file(s) reported by slang-server.`);
    }),
    vscode.commands.registerCommand('verilog.openInstanceFromExplorer', (arg: unknown) => openOptionalLocation(getLocationFromArg(arg))),
    vscode.commands.registerCommand('verilog.openInstanceModuleFromExplorer', (arg: unknown) => openOptionalLocation(getLocationFromArg(arg))),
    vscode.commands.registerCommand('verilog.findInstanceModuleReferencesFromExplorer', (arg: unknown) => vscode.commands.executeCommand('verilog.findModuleReferencesFromExplorer', arg)),
    vscode.commands.registerCommand('verilog.searchUnresolvedModule', async (arg: unknown) => {
      const moduleName = getModuleNameFromArg(arg);
      if (moduleName) {
        await vscode.commands.executeCommand('workbench.action.findInFiles', { query: moduleName });
      }
    }),
    vscode.commands.registerCommand('verilog.copyModuleNameFromExplorer', (arg: unknown) => copyText(getModuleNameFromArg(arg))),
  ];
}

function rootItem(label: string, section: RootSection): HdlExplorerItem {
  return new SlangExplorerItem(
    label,
    section === 'project' ? 'hdlExplorer.slangProject' : 'hdlExplorer.section',
    vscode.TreeItemCollapsibleState.Expanded,
    { kind: 'section', section }
  );
}

function createModuleItem(module: SlangModule): SlangExplorerItem {
  const item = new SlangExplorerItem(
    module.declName,
    'hdlExplorer.module',
    vscode.TreeItemCollapsibleState.None,
    { kind: 'module', module }
  );
  const location = toVscodeLocation(module.declLoc);
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

function createScopeItem(hierPath: string, label: string, item: SlangHierItem): SlangExplorerItem {
  const context = item.kind === SlangKind.Package
    ? 'hdlExplorer.package'
    : item.kind === SlangKind.Instance || item.kind === SlangKind.InstanceArray
      ? 'hdlExplorer.hierarchyInstance'
      : 'hdlExplorer.hierarchyModule';
  const treeItem = new SlangExplorerItem(
    label,
    context,
    'children' in item || item.kind === SlangKind.Instance || item.kind === SlangKind.InstanceArray
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None,
    { kind: 'scope', hierPath, item }
  );
  const location = toVscodeLocation(item.instLoc);
  if (location) {
    treeItem.resourceUri = location.uri;
    treeItem.command = {
      command: 'verilog.openInstanceFromExplorer',
      title: 'Open HDL Item',
      arguments: [location],
    };
  }
  if ('declName' in item) {
    treeItem.description = item.declName;
  } else if ('type' in item) {
    treeItem.description = item.type;
  }
  return treeItem;
}

async function selectBuildFile(slangServerManager: SlangServerManager): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Open a workspace before selecting a slang build file.');
    return;
  }
  const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, '**/*.f'));
  const selected = await vscode.window.showQuickPick(
    files.map((uri) => ({
      label: vscode.workspace.asRelativePath(uri, false),
      uri,
    })),
    { placeHolder: 'Select slang build file' }
  );
  if (selected) {
    await slangServerManager.setBuildFile(selected.uri.fsPath);
  }
}

async function openOptionalLocation(location: vscode.Location | undefined): Promise<void> {
  if (!location) {
    vscode.window.showWarningMessage('Selected HDL item does not have a source location.');
    return;
  }
  const document = await vscode.workspace.openTextDocument(location.uri);
  const editor = await vscode.window.showTextDocument(document);
  editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
  editor.selection = new vscode.Selection(location.range.start, location.range.end);
}

async function copyText(text: string | undefined): Promise<void> {
  if (text) {
    await vscode.env.clipboard.writeText(text);
  }
}

function getLocationFromArg(arg: unknown): vscode.Location | undefined {
  if (arg instanceof vscode.Location) {
    return arg;
  }
  if (arg instanceof SlangExplorerItem) {
    const payload = arg.slangPayload;
    if (payload.kind === 'module') {
      return toVscodeLocation(payload.module.declLoc);
    }
    if (payload.kind === 'scope') {
      return toVscodeLocation(payload.item.instLoc);
    }
    if (payload.kind === 'instance') {
      return toVscodeLocation(payload.instance.instLoc);
    }
  }
  return undefined;
}

function getModuleNameFromArg(arg: unknown): string | undefined {
  if (arg instanceof SlangExplorerItem) {
    const payload = arg.slangPayload;
    if (payload.kind === 'module') {
      return payload.module.declName;
    }
    if (payload.kind === 'scope') {
      return getDisplayModuleName(payload.item);
    }
    if (payload.kind === 'instance') {
      return payload.moduleName;
    }
  }
  return undefined;
}

function getDisplayModuleName(item: SlangHierItem): string {
  return 'declName' in item ? item.declName : item.instName;
}

function isHdlExplorerEnabled(): boolean {
  return vscode.workspace.getConfiguration('verilog.hdlExplorer').get<boolean>('enabled', true);
}
