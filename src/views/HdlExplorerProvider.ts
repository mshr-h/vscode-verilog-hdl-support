// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import type { HierarchyService } from '../hierarchy/HierarchyService';
import type { HierarchyInstanceNode, HierarchyNode } from '../hierarchy/HierarchyTypes';
import type { ProjectService } from '../project/ProjectService';
import type { CompileUnit } from '../project/ProjectTypes';
import { getActiveCompileUnit } from '../project/ProjectTargetResolver';
import type { IndexService } from '../semantic/IndexService';
import {
  createCompileUnitItem,
  createDefineItem,
  createFileItem,
  createGroupItem,
  createHierarchyInstanceItem,
  createHierarchyModuleItem,
  createInfoItem,
  createSymbolItem,
  HdlExplorerItem,
} from './HdlExplorerItems';

type RootSection = 'project' | 'modules' | 'packages' | 'hierarchy' | 'unresolved';
type CompileUnitGroup = 'files' | 'includeDirs' | 'defines';

interface SectionPayload {
  section: RootSection;
}

interface CompileUnitGroupPayload {
  group: CompileUnitGroup;
  compileUnit: CompileUnit;
}

interface CompileUnitsPayload {
  group: 'compileUnits';
  compileUnits: CompileUnit[];
}

export class HdlExplorerProvider implements vscode.TreeDataProvider<HdlExplorerItem>, vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<HdlExplorerItem | undefined>();
  private readonly disposables: vscode.Disposable[] = [];

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
    if (isSectionPayload(element.payload)) {
      return this.getSectionChildren(element.payload.section);
    }
    if (isCompileUnit(element.payload)) {
      return this.getCompileUnitChildren(element.payload);
    }
    if (isCompileUnitsPayload(element.payload)) {
      return element.payload.compileUnits.map(createCompileUnitItem);
    }
    if (isCompileUnitGroupPayload(element.payload)) {
      return this.getCompileUnitGroupChildren(element.payload);
    }
    if (isHierarchyNode(element.payload)) {
      return this.getHierarchyNodeChildren(element.payload);
    }
    if (isHierarchyInstance(element.payload) && element.payload.children) {
      return this.getHierarchyNodeChildren(element.payload.children);
    }
    return [];
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
        return this.hierarchyService.getHierarchy().roots.map(createHierarchyModuleItem);
      case 'unresolved':
        return this.hierarchyService.getHierarchy().unresolvedInstances.map(createHierarchyInstanceItem);
    }
  }

  private getProjectChildren(): HdlExplorerItem[] {
    const snapshot = this.projectService.getSnapshot();
    const activeCompileUnit = getActiveCompileUnit(snapshot);
    return [
      createInfoItem('Active Target', snapshot.activeTargetId || '(none)'),
      createInfoItem('Active Compile Unit', activeCompileUnit ? `${activeCompileUnit.name} (${activeCompileUnit.id})` : '(none)'),
      createInfoItem('Diagnostics', String(snapshot.diagnostics.length)),
      createInfoItem('Workspace Root', snapshot.workspaceRoot.fsPath),
      createGroupItem('Compile Units', { group: 'compileUnits', compileUnits: snapshot.compileUnits }),
    ];
  }

  private getCompileUnitChildren(compileUnit: CompileUnit): HdlExplorerItem[] {
    return [
      createInfoItem('Id', compileUnit.id),
      createInfoItem('Source', formatCompileUnitSource(compileUnit)),
      createGroupItem('Files', { group: 'files', compileUnit }),
      createGroupItem('Include Dirs', { group: 'includeDirs', compileUnit }),
      createGroupItem('Defines', { group: 'defines', compileUnit }),
    ];
  }

  private getCompileUnitGroupChildren(payload: CompileUnitGroupPayload): HdlExplorerItem[] {
    switch (payload.group) {
      case 'files':
        return payload.compileUnit.files.map(createFileItem);
      case 'includeDirs':
        return payload.compileUnit.includeDirs.map((uri) => {
          const item = createInfoItem(path.basename(uri.fsPath), uri.fsPath);
          item.resourceUri = uri;
          return item;
        });
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
  hierarchyService: HierarchyService,
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
    vscode.commands.registerCommand('verilog.openModuleFromExplorer', (location: vscode.Location) => openLocation(location)),
    vscode.commands.registerCommand('verilog.openInstanceFromExplorer', (location: vscode.Location) => openLocation(location)),
  ];
}

function createRootSectionItem(label: string, section: RootSection): HdlExplorerItem {
  return new HdlExplorerItem(label, 'section', vscode.TreeItemCollapsibleState.Expanded, { section });
}

async function openLocation(location: vscode.Location): Promise<void> {
  const document = await vscode.workspace.openTextDocument(location.uri);
  const editor = await vscode.window.showTextDocument(document);
  editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
  editor.selection = new vscode.Selection(location.range.start, location.range.end);
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

function isSectionPayload(payload: unknown): payload is SectionPayload {
  return typeof payload === 'object'
    && payload !== null
    && 'section' in payload
    && typeof (payload as SectionPayload).section === 'string';
}

function isCompileUnit(payload: unknown): payload is CompileUnit {
  return typeof payload === 'object'
    && payload !== null
    && 'files' in payload
    && 'includeDirs' in payload
    && 'defines' in payload;
}

function isCompileUnitGroupPayload(payload: unknown): payload is CompileUnitGroupPayload {
  return typeof payload === 'object'
    && payload !== null
    && 'group' in payload
    && 'compileUnit' in payload;
}

function isCompileUnitsPayload(payload: unknown): payload is CompileUnitsPayload {
  return typeof payload === 'object'
    && payload !== null
    && 'group' in payload
    && (payload as CompileUnitsPayload).group === 'compileUnits'
    && 'compileUnits' in payload;
}

function isHierarchyNode(payload: unknown): payload is HierarchyNode {
  return typeof payload === 'object'
    && payload !== null
    && 'moduleName' in payload
    && 'instances' in payload
    && 'unresolvedInstances' in payload;
}

function isHierarchyInstance(payload: unknown): payload is HierarchyInstanceNode {
  return typeof payload === 'object'
    && payload !== null
    && 'instanceName' in payload
    && 'moduleName' in payload
    && 'location' in payload;
}
