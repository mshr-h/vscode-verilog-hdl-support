// SPDX-License-Identifier: MIT
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import type { ProjectSnapshot } from '../project/ProjectTypes';
import type { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord } from '../semantic/SymbolRecords';
import type {
  HierarchyBuildOptions,
  HierarchyInstanceNode,
  HierarchyNode,
  HierarchySnapshot,
  ModuleInstanceRecord,
} from './HierarchyTypes';
import { InstanceScanner } from './InstanceScanner';

export class HierarchyBuilder {
  constructor(private readonly scanner = new InstanceScanner()) {}

  async build(
    projectSnapshot: ProjectSnapshot,
    index: SemanticIndex,
    options: HierarchyBuildOptions
  ): Promise<HierarchySnapshot> {
    if (!options.enabled || projectSnapshot.compileUnits.length === 0) {
      return createEmptyHierarchy(projectSnapshot.version);
    }

    const instances = await this.scanInstances(projectSnapshot);
    const modules = index.getAllModules();
    const instancesByParent = groupInstancesByParent(instances);
    const resolvedInstanceKeys = new Set(
      instances
        .map((instance) => index.findBestModule(instance.moduleName, instance.compileUnitId))
        .filter((moduleRecord): moduleRecord is ModuleRecord => moduleRecord !== undefined)
        .map(moduleKey)
    );
    const roots = selectRootModules(projectSnapshot, modules, resolvedInstanceKeys).map((moduleRecord) =>
      buildNode(moduleRecord, index, instancesByParent, options, 0, new Set())
    );
    const unresolvedInstances = options.showUnresolved ? findUnresolvedInstances(instances, index) : [];
    return {
      version: projectSnapshot.version,
      roots,
      unresolvedInstances,
      allInstances: instances.slice(),
    };
  }

  private async scanInstances(projectSnapshot: ProjectSnapshot): Promise<ModuleInstanceRecord[]> {
    const instances: ModuleInstanceRecord[] = [];
    for (const compileUnit of projectSnapshot.compileUnits) {
      for (const file of compileUnit.files) {
        try {
          const text = await fs.readFile(file.uri.fsPath, 'utf8');
          instances.push(...this.scanner.scan(text, file.uri, compileUnit.id));
        } catch {
          // Project loading already reports missing or unreadable files; hierarchy stays best-effort.
        }
      }
    }
    return instances;
  }
}

function buildNode(
  moduleRecord: ModuleRecord,
  index: SemanticIndex,
  instancesByParent: Map<string, ModuleInstanceRecord[]>,
  options: HierarchyBuildOptions,
  depth: number,
  visited: Set<string>
): HierarchyNode {
  const key = moduleKey(moduleRecord);
  const nextVisited = new Set(visited);
  nextVisited.add(key);
  const childInstances = instancesByParent.get(key) ?? [];
  const resolvedInstances: HierarchyInstanceNode[] = [];
  const unresolvedInstances: HierarchyInstanceNode[] = [];

  for (const instance of childInstances) {
    const resolvedModule = index.findBestModule(instance.moduleName, instance.compileUnitId);
    const instanceNode: HierarchyInstanceNode = {
      instanceName: instance.instanceName,
      moduleName: instance.moduleName,
      resolvedModule,
      location: new vscode.Location(instance.uri, instance.selectionRange),
    };
    if (!resolvedModule) {
      if (options.showUnresolved) {
        unresolvedInstances.push(instanceNode);
      }
      continue;
    }
    const childKey = moduleKey(resolvedModule);
    if (depth + 1 < options.maxDepth && !nextVisited.has(childKey)) {
      instanceNode.children = buildNode(
        resolvedModule,
        index,
        instancesByParent,
        options,
        depth + 1,
        nextVisited
      );
    }
    resolvedInstances.push(instanceNode);
  }

  return {
    moduleName: moduleRecord.name,
    module: moduleRecord,
    instances: resolvedInstances,
    unresolvedInstances,
  };
}

function selectRootModules(
  projectSnapshot: ProjectSnapshot,
  modules: ModuleRecord[],
  resolvedInstanceKeys: Set<string>
): ModuleRecord[] {
  const configuredTopModules = unique(projectSnapshot.compileUnits.flatMap((compileUnit) => compileUnit.topModules));
  if (configuredTopModules.length > 0) {
    const configured = configuredTopModules
      .map((name) => modules.find((moduleRecord) => moduleRecord.name === name))
      .filter((moduleRecord): moduleRecord is ModuleRecord => moduleRecord !== undefined);
    if (configured.length > 0) {
      return configured;
    }
  }

  const inferred = modules.filter((moduleRecord) => !resolvedInstanceKeys.has(moduleKey(moduleRecord)));
  return inferred.length > 0 ? inferred : modules.slice();
}

function groupInstancesByParent(instances: ModuleInstanceRecord[]): Map<string, ModuleInstanceRecord[]> {
  const map = new Map<string, ModuleInstanceRecord[]>();
  for (const instance of instances) {
    const key = `${instance.compileUnitId}:${instance.parentModuleName}`;
    const existing = map.get(key);
    if (existing) {
      existing.push(instance);
    } else {
      map.set(key, [instance]);
    }
  }
  return map;
}

function findUnresolvedInstances(
  instances: ModuleInstanceRecord[],
  index: SemanticIndex
): HierarchyInstanceNode[] {
  return instances
    .filter((instance) => !index.findBestModule(instance.moduleName, instance.compileUnitId))
    .map((instance) => ({
      instanceName: instance.instanceName,
      moduleName: instance.moduleName,
      location: new vscode.Location(instance.uri, instance.selectionRange),
    }));
}

function moduleKey(moduleRecord: ModuleRecord): string {
  return `${moduleRecord.compileUnitId}:${moduleRecord.name}`;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (value.length === 0 || seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

export function createEmptyHierarchy(version: number): HierarchySnapshot {
  return {
    version,
    roots: [],
    unresolvedInstances: [],
    allInstances: [],
  };
}
