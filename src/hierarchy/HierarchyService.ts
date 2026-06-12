// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';
import type { ProjectService } from '../project/ProjectService';
import type { IndexService } from '../semantic/IndexService';
import { createEmptyHierarchy, HierarchyBuilder } from './HierarchyBuilder';
import type { HierarchyBuildOptions, HierarchySnapshot } from './HierarchyTypes';

const logger = getExtensionLogger('Hierarchy', 'Service');

export class HierarchyService implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<HierarchySnapshot>();
  private readonly disposables: vscode.Disposable[] = [];
  private hierarchy = createEmptyHierarchy(0);
  private rebuildSerial = 0;

  readonly onDidChangeHierarchy = this.emitter.event;

  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService,
    private readonly builder = new HierarchyBuilder()
  ) {
    this.disposables.push(
      this.indexService.onDidChangeIndex(() => {
        void this.rebuild('index-change');
      })
    );
  }

  getHierarchy(): HierarchySnapshot {
    return cloneHierarchy(this.hierarchy);
  }

  async rebuild(reason = 'unspecified'): Promise<HierarchySnapshot> {
    const serial = this.rebuildSerial + 1;
    this.rebuildSerial = serial;
    const projectSnapshot = this.projectService.getSnapshot();
    const options = getHierarchyBuildOptions();
    logger.info('Rebuilding Verilog hierarchy', {
      reason,
      version: projectSnapshot.version,
      enabled: options.enabled,
    });
    try {
      const nextHierarchy = await this.builder.build(projectSnapshot, this.indexService.getIndex(), options);
      if (serial === this.rebuildSerial) {
        this.hierarchy = nextHierarchy;
        this.emitter.fire(this.getHierarchy());
        logger.info('Rebuilt Verilog hierarchy', {
          version: nextHierarchy.version,
          roots: nextHierarchy.roots.length,
          instances: nextHierarchy.allInstances.length,
          unresolved: nextHierarchy.unresolvedInstances.length,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to rebuild Verilog hierarchy', { reason, error: message });
      if (serial === this.rebuildSerial) {
        this.hierarchy = createEmptyHierarchy(projectSnapshot.version);
        this.emitter.fire(this.getHierarchy());
      }
    }
    return this.getHierarchy();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.emitter.dispose();
  }
}

function getHierarchyBuildOptions(): HierarchyBuildOptions {
  const config = vscode.workspace.getConfiguration('verilog.hierarchy');
  return {
    enabled: config.get<boolean>('enabled', true),
    maxDepth: Math.max(1, config.get<number>('maxDepth', 20)),
    showUnresolved: config.get<boolean>('showUnresolved', true),
  };
}

function cloneHierarchy(hierarchy: HierarchySnapshot): HierarchySnapshot {
  return {
    version: hierarchy.version,
    roots: hierarchy.roots.map(cloneNode),
    unresolvedInstances: hierarchy.unresolvedInstances.map(cloneInstanceNode),
    allInstances: hierarchy.allInstances.map((instance) => ({
      ...instance,
      parameterOverrides: instance.parameterOverrides.slice(),
      portConnections: instance.portConnections.slice(),
    })),
  };
}

function cloneNode(node: HierarchySnapshot['roots'][number]): HierarchySnapshot['roots'][number] {
  return {
    moduleName: node.moduleName,
    module: node.module,
    instances: node.instances.map(cloneInstanceNode),
    unresolvedInstances: node.unresolvedInstances.map(cloneInstanceNode),
  };
}

function cloneInstanceNode(
  instance: HierarchySnapshot['unresolvedInstances'][number]
): HierarchySnapshot['unresolvedInstances'][number] {
  return {
    instanceName: instance.instanceName,
    moduleName: instance.moduleName,
    resolvedModule: instance.resolvedModule,
    location: instance.location,
    children: instance.children ? cloneNode(instance.children) : undefined,
  };
}
