// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import type { HierarchyService } from '../hierarchy/HierarchyService';
import type { HierarchyNode } from '../hierarchy/HierarchyTypes';
import type { InstantiationService } from '../hdl/InstantiationService';
import type { ReferenceService } from '../hdl/ReferenceService';
import type { ProjectService } from '../project/ProjectService';
import type { CompileUnit, MacroDefine } from '../project/ProjectTypes';
import { getActiveCompileUnit } from '../project/ProjectTargetResolver';
import type { IndexService } from '../semantic/IndexService';
import type { ModuleRecord } from '../semantic/SymbolRecords';
import {
  createCompileUnitItem,
  createCompileUnitsItem,
  createDefineItem,
  createFileItem,
  createGroupItem,
  createHierarchyInstanceItem,
  createHierarchyModuleItem,
  createIncludeDirItem,
  createInfoItem,
  createSymbolItem,
  HdlExplorerPayload,
  HdlExplorerItem,
  RootSection,
} from './HdlExplorerItems';

interface HierarchyRootFilter {
  moduleName: string;
  compileUnitId?: string;
}

interface ActiveTargetQuickPickItem extends vscode.QuickPickItem {
  targetId: string;
}

export class HdlExplorerProvider implements vscode.TreeDataProvider<HdlExplorerItem>, vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<HdlExplorerItem | undefined>();
  private readonly disposables: vscode.Disposable[] = [];
  private hierarchyRootFilter?: HierarchyRootFilter;

  readonly onDidChangeTreeData = this.emitter.event;

  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService,
    private readonly hierarchyService: HierarchyService
  ) {
    this.disposables.push(
      projectService.onDidChangeSnapshot(() => this.refresh()),
      indexService.onDidChangeIndex(() => this.refresh()),
      hierarchyService.onDidChangeHierarchy(() => this.refresh()),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration('verilog.hdlExplorer')
          || event.affectsConfiguration('verilog.hierarchy')
        ) {
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

  getChildren(element?: HdlExplorerItem): vscode.ProviderResult<HdlExplorerItem[]> {
    if (!isHdlExplorerEnabled()) {
      return [createInfoItem('HDL Explorer disabled', 'verilog.hdlExplorer.enabled=false')];
    }
    if (!element) {
      return this.getRootItems();
    }
    if (element.payload.kind === 'section') {
      return this.getSectionChildren(element.payload.section);
    }
    if (element.payload.kind === 'compileUnit') {
      return this.getCompileUnitChildren(element.payload.compileUnit);
    }
    if (element.payload.kind === 'compileUnits') {
      return element.payload.compileUnits.map(createCompileUnitItem);
    }
    if (element.payload.kind === 'compileUnitGroup') {
      return this.getCompileUnitGroupChildren(element.payload);
    }
    if (element.payload.kind === 'hierarchyModule') {
      return this.getHierarchyNodeChildren(element.payload.node);
    }
    if (element.payload.kind === 'hierarchyInstance' && element.payload.instance.children) {
      return this.getHierarchyNodeChildren(element.payload.instance.children);
    }
    return [];
  }

  setHierarchyRootFilter(moduleName: string, compileUnitId?: string): void {
    this.hierarchyRootFilter = { moduleName, compileUnitId };
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
    const items = [
      createRootSectionItem('HDL Project', 'project'),
      createRootSectionItem('Modules', 'modules'),
      createRootSectionItem('Packages', 'packages'),
      createRootSectionItem('Hierarchy (best-effort)', 'hierarchy'),
    ];
    if (isShowUnresolvedEnabled()) {
      items.push(createRootSectionItem('Unresolved Instances', 'unresolved'));
    }
    return items;
  }

  private getSectionChildren(section: RootSection): HdlExplorerItem[] {
    switch (section) {
      case 'project':
        return this.getProjectChildren();
      case 'modules':
        return this.indexService.getIndex().getAllModules().map(createSymbolItem);
      case 'packages':
        return this.indexService
          .getIndex()
          .getAllSymbols()
          .filter((symbol) => symbol.kind === 'package')
          .map(createSymbolItem);
      case 'hierarchy':
        return this.getHierarchySectionChildren();
      case 'unresolved':
        return this.hierarchyService.getHierarchy().unresolvedInstances.map(createHierarchyInstanceItem);
    }
  }

  private getHierarchySectionChildren(): HdlExplorerItem[] {
    const roots = filterHierarchyRoots(this.hierarchyService.getHierarchy().roots, this.hierarchyRootFilter);
    const items = roots.map(createHierarchyModuleItem);
    if (this.hierarchyRootFilter) {
      return [
        createInfoItem('Filtered root', this.hierarchyRootFilter.moduleName),
        ...items,
      ];
    }
    return items;
  }

  private getProjectChildren(): HdlExplorerItem[] {
    const snapshot = this.projectService.getSnapshot();
    const activeCompileUnit = getActiveCompileUnit(snapshot);
    return [
      createInfoItem('Active Target', snapshot.activeTargetId || '(none)'),
      createInfoItem('Active Compile Unit', activeCompileUnit ? `${activeCompileUnit.name} (${activeCompileUnit.id})` : '(none)'),
      createInfoItem('Diagnostics', String(snapshot.diagnostics.length)),
      createInfoItem('Workspace Root', snapshot.workspaceRoot.fsPath),
      createCompileUnitsItem(snapshot.compileUnits),
    ];
  }

  private getCompileUnitChildren(compileUnit: CompileUnit): HdlExplorerItem[] {
    return [
      createInfoItem('Id', compileUnit.id),
      createInfoItem('Source', formatCompileUnitSource(compileUnit)),
      createGroupItem('Files', 'files', compileUnit),
      createGroupItem('Include Dirs', 'includeDirs', compileUnit),
      createGroupItem('Defines', 'defines', compileUnit),
    ];
  }

  private getCompileUnitGroupChildren(payload: Extract<HdlExplorerPayload, { kind: 'compileUnitGroup' }>): HdlExplorerItem[] {
    switch (payload.group) {
      case 'files':
        return payload.compileUnit.files.map(createFileItem);
      case 'includeDirs':
        return payload.compileUnit.includeDirs.map(createIncludeDirItem);
      case 'defines':
        return Object.entries(payload.compileUnit.defines).map(([name, define]) => createDefineItem(name, define));
    }
  }

  private getHierarchyNodeChildren(node: HierarchyNode): HdlExplorerItem[] {
    return [
      ...node.instances.map(createHierarchyInstanceItem),
      ...node.unresolvedInstances.map(createHierarchyInstanceItem),
    ];
  }
}

export function registerHdlExplorerCommands(
  projectService: ProjectService,
  hierarchyService: HierarchyService,
  instantiationService: InstantiationService,
  referenceService: ReferenceService,
  provider: HdlExplorerProvider
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('verilog.refreshHierarchy', async () => {
      await hierarchyService.rebuild('command');
      vscode.window.showInformationMessage('Verilog hierarchy refreshed.');
    }),
    vscode.commands.registerCommand('verilog.refreshHdlExplorer', async () => {
      await hierarchyService.rebuild('explorer-command');
      provider.refresh();
    }),
    vscode.commands.registerCommand('verilog.setActiveTargetFromExplorer', async (arg: unknown) => {
      const compileUnit = getCompileUnitFromArg(arg);
      if (!compileUnit) {
        vscode.window.showWarningMessage('No HDL compile unit selected.');
        return;
      }
      await setActiveTarget(projectService, hierarchyService, provider, compileUnit.id);
      vscode.window.showInformationMessage(`Active HDL target set to ${compileUnit.id}`);
    }),
    vscode.commands.registerCommand('verilog.selectActiveTarget', async () => {
      const snapshot = projectService.getSnapshot();
      if (snapshot.compileUnits.length === 0) {
        vscode.window.showWarningMessage('No HDL compile units are available.');
        return;
      }
      const selected = await vscode.window.showQuickPick(buildActiveTargetQuickPickItems(snapshot.compileUnits), {
        placeHolder: 'Select active HDL target',
        matchOnDescription: true,
        matchOnDetail: true,
      });
      if (!selected) {
        return;
      }
      await setActiveTarget(projectService, hierarchyService, provider, selected.targetId);
      vscode.window.showInformationMessage(
        selected.targetId ? `Active HDL target set to ${selected.targetId}` : 'Active HDL target cleared.'
      );
    }),
    vscode.commands.registerCommand('verilog.openModuleFromExplorer', (arg: unknown) => {
      void openOptionalLocation(getModuleLocationFromArg(arg));
    }),
    vscode.commands.registerCommand('verilog.instantiateModuleFromExplorer', async (arg: unknown) => {
      const moduleRecord = getModuleRecordFromArg(arg);
      if (!moduleRecord) {
        vscode.window.showWarningMessage('No resolved HDL module selected.');
        return;
      }
      await instantiationService.instantiateModule(moduleRecord);
    }),
    vscode.commands.registerCommand('verilog.showHierarchyFromModule', (arg: unknown) => {
      const moduleRecord = getModuleRecordFromArg(arg);
      const moduleName = moduleRecord?.name ?? getHierarchyModuleNameFromArg(arg);
      if (!moduleName) {
        vscode.window.showWarningMessage('No HDL module selected.');
        return;
      }
      provider.setHierarchyRootFilter(moduleName, moduleRecord?.compileUnitId);
    }),
    vscode.commands.registerCommand('verilog.clearHierarchyRootFilter', () => {
      provider.clearHierarchyRootFilter();
    }),
    vscode.commands.registerCommand('verilog.findModuleReferencesFromExplorer', (arg: unknown) => {
      void showModuleReferences(referenceService, getModuleRecordFromArg(arg));
    }),
    vscode.commands.registerCommand('verilog.openInstanceFromExplorer', (arg: unknown) => {
      void openOptionalLocation(getInstanceLocationFromArg(arg));
    }),
    vscode.commands.registerCommand('verilog.openInstanceModuleFromExplorer', (arg: unknown) => {
      void openOptionalLocation(getModuleLocationFromArg(arg));
    }),
    vscode.commands.registerCommand('verilog.findInstanceModuleReferencesFromExplorer', (arg: unknown) => {
      void showModuleReferences(referenceService, getModuleRecordFromArg(arg));
    }),
    vscode.commands.registerCommand('verilog.searchUnresolvedModule', async (arg: unknown) => {
      const moduleName = getModuleNameFromArg(arg);
      if (!moduleName) {
        vscode.window.showWarningMessage('No unresolved HDL module selected.');
        return;
      }
      await vscode.commands.executeCommand('workbench.action.findInFiles', { query: moduleName });
    }),
    vscode.commands.registerCommand('verilog.copyModuleNameFromExplorer', async (arg: unknown) => {
      await copyText(getModuleNameFromArg(arg), 'No HDL module name selected.', 'HDL module name copied.');
    }),
    vscode.commands.registerCommand('verilog.openFileFromExplorer', (arg: unknown) => {
      void openOptionalUri(getUriFromArg(arg));
    }),
    vscode.commands.registerCommand('verilog.revealFileInOs', (arg: unknown) => {
      void revealOptionalUri(getUriFromArg(arg));
    }),
    vscode.commands.registerCommand('verilog.revealIncludeDirInOs', (arg: unknown) => {
      void revealOptionalUri(getUriFromArg(arg));
    }),
    vscode.commands.registerCommand('verilog.copyPathFromExplorer', async (arg: unknown) => {
      await copyText(getUriFromArg(arg)?.fsPath, 'No HDL path selected.', 'HDL path copied.');
    }),
    vscode.commands.registerCommand('verilog.copyRelativePathFromExplorer', async (arg: unknown) => {
      const uri = getUriFromArg(arg);
      await copyText(uri ? getRelativePath(uri) : undefined, 'No HDL path selected.', 'HDL relative path copied.');
    }),
    vscode.commands.registerCommand('verilog.openCompileUnitSource', (arg: unknown) => {
      void openOptionalUri(getCompileUnitFromArg(arg)?.source.uri);
    }),
    vscode.commands.registerCommand('verilog.copyDefineNameFromExplorer', async (arg: unknown) => {
      await copyText(getDefineFromArg(arg)?.name, 'No HDL define selected.', 'HDL define name copied.');
    }),
    vscode.commands.registerCommand('verilog.copyDefineArgumentFromExplorer', async (arg: unknown) => {
      const entry = getDefineFromArg(arg);
      await copyText(entry ? formatDefineArgument(entry.name, entry.define) : undefined, 'No HDL define selected.', 'HDL define argument copied.');
    }),
    vscode.commands.registerCommand('verilog.openDefineLocationFromExplorer', (arg: unknown) => {
      const location = getDefineFromArg(arg)?.define.location;
      void openOptionalLocation(location, 'Selected HDL define does not have a source location.');
    }),
  ];
}

function createRootSectionItem(label: string, section: RootSection): HdlExplorerItem {
  return new HdlExplorerItem(
    label,
    section === 'project' ? 'hdlExplorer.projectRoot' : 'hdlExplorer.section',
    vscode.TreeItemCollapsibleState.Expanded,
    { kind: 'section', section }
  );
}

async function openLocation(location: vscode.Location): Promise<void> {
  const document = await vscode.workspace.openTextDocument(location.uri);
  const editor = await vscode.window.showTextDocument(document);
  editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
  editor.selection = new vscode.Selection(location.range.start, location.range.end);
}

async function openOptionalLocation(
  location: vscode.Location | undefined,
  missingMessage = 'Selected HDL item does not have a source location.'
): Promise<void> {
  if (!location) {
    vscode.window.showWarningMessage(missingMessage);
    return;
  }
  await openLocation(location);
}

async function openOptionalUri(uri: vscode.Uri | undefined): Promise<void> {
  if (!uri) {
    vscode.window.showWarningMessage('Selected HDL item does not have a file path.');
    return;
  }
  try {
    await vscode.workspace.fs.stat(uri);
    await vscode.commands.executeCommand('vscode.open', uri);
  } catch {
    vscode.window.showWarningMessage(`HDL path does not exist: ${uri.fsPath}`);
  }
}

async function revealOptionalUri(uri: vscode.Uri | undefined): Promise<void> {
  if (!uri) {
    vscode.window.showWarningMessage('Selected HDL item does not have a file path.');
    return;
  }
  try {
    await vscode.workspace.fs.stat(uri);
    await vscode.commands.executeCommand('revealFileInOS', uri);
  } catch {
    vscode.window.showWarningMessage(`HDL path does not exist: ${uri.fsPath}`);
  }
}

async function copyText(text: string | undefined, missingMessage: string, successMessage: string): Promise<void> {
  if (!text) {
    vscode.window.showWarningMessage(missingMessage);
    return;
  }
  await vscode.env.clipboard.writeText(text);
  vscode.window.showInformationMessage(successMessage);
}

async function setActiveTarget(
  projectService: ProjectService,
  hierarchyService: HierarchyService,
  provider: HdlExplorerProvider,
  targetId: string
): Promise<void> {
  const configTarget = vscode.workspace.workspaceFolders?.length
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
  await vscode.workspace.getConfiguration('verilog.project').update('activeTarget', targetId, configTarget);
  await projectService.reload('active-target-command');
  await hierarchyService.rebuild('active-target-command');
  provider.refresh();
}

async function showModuleReferences(
  referenceService: ReferenceService,
  moduleRecord: ModuleRecord | undefined
): Promise<void> {
  if (!moduleRecord) {
    vscode.window.showWarningMessage('No resolved HDL module selected.');
    return;
  }
  const document = await vscode.workspace.openTextDocument(moduleRecord.uri);
  const tokenSource = new vscode.CancellationTokenSource();
  try {
    const locations = await referenceService.provideReferences(
      document,
      moduleRecord.selectionRange.start,
      { includeDeclaration: true },
      tokenSource.token
    );
    if (locations.length === 0) {
      vscode.window.showInformationMessage(`No references found for ${moduleRecord.name}.`);
      return;
    }
    await vscode.commands.executeCommand(
      'editor.action.showReferences',
      moduleRecord.uri,
      moduleRecord.selectionRange.start,
      locations
    );
  } finally {
    tokenSource.dispose();
  }
}

function isHdlExplorerEnabled(): boolean {
  return vscode.workspace.getConfiguration('verilog.hdlExplorer').get<boolean>('enabled', true);
}

function isShowUnresolvedEnabled(): boolean {
  return vscode.workspace.getConfiguration('verilog.hierarchy').get<boolean>('showUnresolved', true);
}

function formatCompileUnitSource(compileUnit: CompileUnit): string {
  return compileUnit.source.uri
    ? `${compileUnit.source.type} ${compileUnit.source.uri.fsPath}`
    : compileUnit.source.type;
}

export function buildActiveTargetQuickPickItems(compileUnits: readonly CompileUnit[]): ActiveTargetQuickPickItem[] {
  return [
    {
      label: '(auto / none)',
      description: 'Use automatic target selection',
      targetId: '',
    },
    ...compileUnits.map((compileUnit) => ({
      label: compileUnit.name,
      description: compileUnit.id,
      detail: formatCompileUnitSource(compileUnit),
      targetId: compileUnit.id,
    })),
  ];
}

export function filterHierarchyRoots(
  roots: readonly HierarchyNode[],
  filter?: HierarchyRootFilter
): HierarchyNode[] {
  if (!filter) {
    return roots.slice();
  }
  const matches: HierarchyNode[] = [];
  for (const root of roots) {
    collectMatchingHierarchyNodes(root, filter, matches);
  }
  return matches;
}

function collectMatchingHierarchyNodes(
  node: HierarchyNode,
  filter: HierarchyRootFilter,
  matches: HierarchyNode[]
): void {
  if (
    node.moduleName === filter.moduleName
    && (!filter.compileUnitId || node.module?.compileUnitId === filter.compileUnitId)
  ) {
    matches.push(node);
  }
  for (const instance of [...node.instances, ...node.unresolvedInstances]) {
    if (instance.children) {
      collectMatchingHierarchyNodes(instance.children, filter, matches);
    }
  }
}

export function getRelativePath(uri: vscode.Uri, workspaceRoot?: vscode.Uri): string {
  const root = workspaceRoot ?? vscode.workspace.getWorkspaceFolder(uri)?.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!root) {
    return uri.fsPath;
  }
  const relative = path.relative(root.fsPath, uri.fsPath);
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative)
    ? relative.split(path.sep).join('/')
    : uri.fsPath;
}

export function formatDefineArgument(name: string, define: MacroDefine): string {
  return define.value === true ? `+define+${name}` : `+define+${name}=${define.value}`;
}

function getPayload(arg: unknown): HdlExplorerPayload | undefined {
  if (arg instanceof HdlExplorerItem) {
    return arg.payload;
  }
  if (typeof arg === 'object' && arg !== null && 'payload' in arg) {
    return (arg as { payload?: HdlExplorerPayload }).payload;
  }
  return undefined;
}

function getCompileUnitFromArg(arg: unknown): CompileUnit | undefined {
  const payload = getPayload(arg);
  if (payload?.kind === 'compileUnit') {
    return payload.compileUnit;
  }
  if (isCompileUnitLike(arg)) {
    return arg;
  }
  return undefined;
}

function getUriFromArg(arg: unknown): vscode.Uri | undefined {
  if (arg instanceof vscode.Uri) {
    return arg;
  }
  if (arg instanceof vscode.Location) {
    return arg.uri;
  }
  const payload = getPayload(arg);
  switch (payload?.kind) {
    case 'sourceFile':
      return payload.file.uri;
    case 'includeDir':
      return payload.uri;
    case 'compileUnit':
      return payload.compileUnit.source.uri;
    case 'symbol':
      return payload.symbol.uri;
    case 'hierarchyModule':
      return payload.node.module?.uri;
    case 'hierarchyInstance':
      return payload.instance.location.uri;
    default:
      return undefined;
  }
}

function getDefineFromArg(arg: unknown): { name: string; define: MacroDefine } | undefined {
  const payload = getPayload(arg);
  return payload?.kind === 'define' ? { name: payload.name, define: payload.define } : undefined;
}

function getModuleRecordFromArg(arg: unknown): ModuleRecord | undefined {
  const payload = getPayload(arg);
  if (payload?.kind === 'symbol' && isModuleRecordLike(payload.symbol)) {
    return payload.symbol;
  }
  if (payload?.kind === 'hierarchyModule') {
    return payload.node.module;
  }
  if (payload?.kind === 'hierarchyInstance') {
    return payload.instance.resolvedModule;
  }
  return isModuleRecordLike(arg) ? arg : undefined;
}

function getHierarchyModuleNameFromArg(arg: unknown): string | undefined {
  const payload = getPayload(arg);
  if (payload?.kind === 'hierarchyModule') {
    return payload.node.moduleName;
  }
  return undefined;
}

function getModuleNameFromArg(arg: unknown): string | undefined {
  const payload = getPayload(arg);
  switch (payload?.kind) {
    case 'symbol':
      return payload.symbol.name;
    case 'hierarchyModule':
      return payload.node.moduleName;
    case 'hierarchyInstance':
      return payload.instance.moduleName;
    default:
      return isModuleRecordLike(arg) ? arg.name : undefined;
  }
}

function getModuleLocationFromArg(arg: unknown): vscode.Location | undefined {
  if (arg instanceof vscode.Location) {
    return arg;
  }
  const moduleRecord = getModuleRecordFromArg(arg);
  return moduleRecord ? new vscode.Location(moduleRecord.uri, moduleRecord.selectionRange) : undefined;
}

function getInstanceLocationFromArg(arg: unknown): vscode.Location | undefined {
  if (arg instanceof vscode.Location) {
    return arg;
  }
  const payload = getPayload(arg);
  return payload?.kind === 'hierarchyInstance' ? payload.instance.location : undefined;
}

function isCompileUnitLike(value: unknown): value is CompileUnit {
  return typeof value === 'object'
    && value !== null
    && 'id' in value
    && 'files' in value
    && 'includeDirs' in value
    && 'defines' in value;
}

function isModuleRecordLike(value: unknown): value is ModuleRecord {
  return typeof value === 'object'
    && value !== null
    && 'kind' in value
    && (value as { kind?: unknown }).kind === 'module'
    && 'uri' in value
    && 'selectionRange' in value;
}
