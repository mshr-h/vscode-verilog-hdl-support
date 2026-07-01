// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { SlangConfigService } from '../slangServer/SlangConfigService';
import type { SlangModuleInstantiationService } from '../slangServer/SlangModuleInstantiationService';
import type { SlangServerApi, SlangInstance, SlangScope } from '../slangServer/SlangServerApi';
import type { SlangServerManager } from '../slangServer/SlangServerManager';
import {
  createInfoItem,
  createInstanceItem,
  createModuleItem,
  createScopeItem,
  createSectionItem,
  HdlExplorerItem,
  RootSection,
} from './HdlExplorerItems';

export class HdlExplorerProvider implements vscode.TreeDataProvider<HdlExplorerItem>, vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<HdlExplorerItem | undefined>();
  private focusedHierarchyPath = '';
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(
    private readonly api: SlangServerApi,
    private readonly manager: SlangServerManager,
    private readonly configService: SlangConfigService
  ) {}

  refresh(): void {
    this.emitter.fire(undefined);
  }

  focusHierarchy(path: string): void {
    this.focusedHierarchyPath = path;
    this.refresh();
  }

  getTreeItem(element: HdlExplorerItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: HdlExplorerItem): Promise<HdlExplorerItem[]> {
    if (!isHdlExplorerEnabled()) {
      return [createInfoItem('HDL Explorer disabled', 'verilog.hdlExplorer.enabled=false')];
    }
    if (!element) {
      return [
        createSectionItem('slang-server', 'server'),
        createSectionItem('Build', 'build'),
        createSectionItem('Modules', 'modules'),
        createSectionItem('Hierarchy', 'hierarchy'),
      ];
    }
    if (element.payload.kind === 'section') {
      return this.getSectionChildren(element.payload.section);
    }
    if (element.payload.kind === 'scope') {
      return this.getScopeChildren(element.payload.scope);
    }
    if (element.payload.kind === 'instance') {
      return this.getInstanceChildren(element.payload.instance);
    }
    return [];
  }

  dispose(): void {
    this.emitter.dispose();
  }

  private async getSectionChildren(section: RootSection): Promise<HdlExplorerItem[]> {
    switch (section) {
      case 'server':
        return this.getServerChildren();
      case 'build':
        return this.getBuildChildren();
      case 'modules':
        return this.getModuleChildren();
      case 'hierarchy':
        return this.getHierarchyChildren();
    }
  }

  private getServerChildren(): HdlExplorerItem[] {
    const status = this.manager.getStatus();
    return [
      createInfoItem('State', status.state),
      createInfoItem('Runtime', status.resolvedRuntime),
      createInfoItem('Path', status.path || '(not configured)'),
      ...(status.error ? [createInfoItem('Error', status.error)] : []),
    ];
  }

  private async getBuildChildren(): Promise<HdlExplorerItem[]> {
    const status = await this.configService.getStatus();
    const items = [
      createInfoItem('Workspace config', status.workspaceConfig?.fsPath ?? '(missing)'),
      createInfoItem('Local config', status.localConfig?.fsPath ?? '(missing)'),
      createInfoItem('User config', status.userConfig?.fsPath ?? '(missing)'),
    ];
    if (!status.ok) {
      items.push(createInfoItem('Parse error', status.error));
    }
    if (status.build) {
      items.push(createInfoItem('Build', String(status.build)));
    }
    if (status.buildPattern) {
      items.push(createInfoItem('Build pattern', String(status.buildPattern)));
    }
    if (status.builds) {
      items.push(createInfoItem('Builds', Array.isArray(status.builds) ? String(status.builds.length) : 'configured'));
    }
    return items;
  }

  private async getModuleChildren(): Promise<HdlExplorerItem[]> {
    const modules = await this.api.getScopesByModule();
    if (!Array.isArray(modules) || modules.length === 0) {
      return [createInfoItem('No modules available', 'Check slang-server build/top configuration')];
    }
    return modules.map((module) => createModuleItem(module, this.api.toLocation(module.location ?? module.declaration)));
  }

  private async getHierarchyChildren(): Promise<HdlExplorerItem[]> {
    const scope = await this.api.getScope(this.focusedHierarchyPath);
    if (!scope || (!scope.children?.length && !scope.instances?.length)) {
      // TODO: if slang-server exposes richer top/build state, show that exact reason here.
      return [createInfoItem('Hierarchy unavailable', 'Select a build/top level in slang-server')];
    }
    return this.scopeToChildren(scope);
  }

  private async getScopeChildren(scope: SlangScope): Promise<HdlExplorerItem[]> {
    if (scope.children?.length || scope.instances?.length) {
      return this.scopeToChildren(scope);
    }
    const expanded = await this.api.getScope(scope.instPath ?? '');
    return expanded ? this.scopeToChildren(expanded) : [];
  }

  private async getInstanceChildren(instance: SlangInstance): Promise<HdlExplorerItem[]> {
    if (instance.children?.length) {
      return instance.children.map((scope) => this.scopeToItem(scope));
    }
    const expanded = await this.api.getScope(instance.instPath ?? '');
    return expanded ? this.scopeToChildren(expanded) : [];
  }

  private scopeToChildren(scope: SlangScope): HdlExplorerItem[] {
    return [
      ...(scope.children ?? []).map((child) => this.scopeToItem(child)),
      ...(scope.instances ?? []).map((instance) => this.instanceToItem(instance)),
    ];
  }

  private scopeToItem(scope: SlangScope): HdlExplorerItem {
    const collapsible = Boolean(scope.children?.length || scope.instances?.length || scope.instPath);
    return createScopeItem(scope, collapsible, this.api.toLocation(scope.location));
  }

  private instanceToItem(instance: SlangInstance): HdlExplorerItem {
    const collapsible = Boolean(instance.children?.length || instance.instPath);
    return createInstanceItem(instance, collapsible, this.api.toLocation(instance.location));
  }
}

export function registerHdlExplorerCommands(
  api: SlangServerApi,
  configService: SlangConfigService,
  provider: HdlExplorerProvider,
  instantiationService: SlangModuleInstantiationService
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('verilog.refreshHdlExplorer', () => provider.refresh()),
    vscode.commands.registerCommand('verilog.setSlangBuildFile', async () => {
      const candidates = await configService.findCandidateFilelists();
      const selected = await vscode.window.showQuickPick(
        candidates.map((uri) => ({ label: vscode.workspace.asRelativePath(uri), uri })),
        { placeHolder: 'Select slang-server build file' }
      );
      if (selected) {
        await api.setBuildFile(selected.uri.fsPath);
        provider.refresh();
      }
    }),
    vscode.commands.registerCommand('verilog.setSlangTopLevel', async (arg?: unknown) => {
      const module = isModuleItem(arg) ? arg.payload.module : undefined;
      const target = module?.location?.path
        ?? module?.location?.uri
        ?? module?.declaration?.path
        ?? module?.declaration?.uri
        ?? vscode.window.activeTextEditor?.document.uri.fsPath;
      if (!target) {
        vscode.window.showWarningMessage('No top-level path is available.');
        return;
      }
      await api.setTopLevel(target);
      provider.refresh();
    }),
    vscode.commands.registerCommand('verilog.openModuleFromExplorer', (location?: vscode.Location) => {
      void openLocation(location);
    }),
    vscode.commands.registerCommand('verilog.openInstanceFromExplorer', (location?: vscode.Location) => {
      void openLocation(location);
    }),
    vscode.commands.registerCommand('verilog.showHierarchyFromModule', async (arg?: unknown) => {
      const module = isModuleItem(arg) ? arg.payload.module : undefined;
      if (!module?.name) {
        return;
      }
      const instances = await api.getInstancesOfModule(module.name);
      const first = Array.isArray(instances) ? instances[0] : undefined;
      if (first?.instPath) {
        provider.focusHierarchy(first.instPath);
      }
    }),
    vscode.commands.registerCommand('verilog.findModuleReferencesFromExplorer', async (location?: vscode.Location) => {
      if (!location) {
        return;
      }
      const references = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeReferenceProvider',
        location.uri,
        location.range.start
      );
      await vscode.commands.executeCommand('editor.action.showReferences', location.uri, location.range.start, references ?? []);
    }),
    vscode.commands.registerCommand('verilog.instantiateModuleFromExplorer', async (arg?: unknown) => {
      const module = isModuleItem(arg) ? arg.payload.module : undefined;
      if (!module?.name) {
        return false;
      }
      return instantiationService.instantiateModule(module.name);
    }),
  ];
}

function isHdlExplorerEnabled(): boolean {
  return vscode.workspace.getConfiguration('verilog.hdlExplorer').get('enabled', true);
}

function isModuleItem(input: unknown): input is HdlExplorerItem & { payload: { kind: 'module' } } {
  return input instanceof HdlExplorerItem && input.payload.kind === 'module';
}

async function openLocation(location: vscode.Location | undefined): Promise<void> {
  if (!location) {
    return;
  }
  const document = await vscode.workspace.openTextDocument(location.uri);
  await vscode.window.showTextDocument(document, { selection: location.range });
}
