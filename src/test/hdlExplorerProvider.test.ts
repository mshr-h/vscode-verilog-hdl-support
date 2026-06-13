// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  buildActiveTargetQuickPickItems,
  filterHierarchyRoots,
  formatDefineArgument,
  getRelativePath,
  HdlExplorerProvider,
} from '../views/HdlExplorerProvider';
import type { HierarchyService } from '../hierarchy/HierarchyService';
import type { HierarchySnapshot } from '../hierarchy/HierarchyTypes';
import type { ProjectService } from '../project/ProjectService';
import type { ProjectSnapshot } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';
import type { HdlExplorerItem } from '../views/HdlExplorerItems';

suite('HdlExplorerProvider', () => {
  test('produces project, module, package, hierarchy, and unresolved sections', async () => {
    const moduleRecord = createModuleRecord('top');
    const packageRecord = createSymbolRecord('pkg', 'package');
    const provider = createProvider({
      symbols: [moduleRecord, packageRecord],
      hierarchy: {
        version: 1,
        roots: [{
          moduleName: 'top',
          module: moduleRecord,
          instances: [],
          unresolvedInstances: [],
        }],
        unresolvedInstances: [{
          instanceName: 'u_missing',
          moduleName: 'missing',
          location: new vscode.Location(moduleRecord.uri, moduleRecord.selectionRange),
        }],
        allInstances: [],
      },
    });

    const root = await children(provider);

    assert.deepStrictEqual(root.map((item) => String(item.label)), [
      'HDL Project',
      'Modules',
      'Packages',
      'Hierarchy (best-effort)',
      'Unresolved Instances',
    ]);
    const projectItems = await sectionChildren(provider, root, 'HDL Project');
    assert.ok(projectItems.some((item) => item.label === 'Active Compile Unit'));
    assert.ok((await sectionChildren(provider, root, 'Modules')).some((item) => item.label === 'top'));
    assert.ok((await sectionChildren(provider, root, 'Packages')).some((item) => item.label === 'pkg'));
    assert.ok((await sectionChildren(provider, root, 'Hierarchy (best-effort)')).some((item) => item.label === 'top'));
    assert.ok((await sectionChildren(provider, root, 'Unresolved Instances')).some((item) => item.label === 'u_missing : missing'));
  });

  test('assigns stable context values to explorer items', async () => {
    const moduleRecord = createModuleRecord('top');
    const packageRecord = createSymbolRecord('pkg', 'package');
    const provider = createProvider({
      symbols: [moduleRecord, packageRecord],
      hierarchy: {
        version: 1,
        roots: [{
          moduleName: 'top',
          module: moduleRecord,
          instances: [{
            instanceName: 'u_child',
            moduleName: 'child',
            resolvedModule: createModuleRecord('child'),
            location: new vscode.Location(moduleRecord.uri, moduleRecord.selectionRange),
          }, {
            instanceName: 'u_missing',
            moduleName: 'missing',
            location: new vscode.Location(moduleRecord.uri, moduleRecord.selectionRange),
          }],
          unresolvedInstances: [],
        }],
        unresolvedInstances: [],
        allInstances: [],
      },
    });

    const root = await children(provider);
    const projectItems = await sectionChildren(provider, root, 'HDL Project');
    const compileUnits = projectItems.find((item) => item.label === 'Compile Units');
    assert.ok(compileUnits);
    const compileUnit = (await children(provider, compileUnits))[0];
    assert.ok(compileUnit);
    const compileUnitChildren = await children(provider, compileUnit);
    const filesGroup = compileUnitChildren.find((item) => item.label === 'Files');
    const includeDirsGroup = compileUnitChildren.find((item) => item.label === 'Include Dirs');
    const definesGroup = compileUnitChildren.find((item) => item.label === 'Defines');
    assert.ok(filesGroup);
    assert.ok(includeDirsGroup);
    assert.ok(definesGroup);
    const hierarchyRoot = (await sectionChildren(provider, root, 'Hierarchy (best-effort)'))[0];
    assert.ok(hierarchyRoot);
    const hierarchyChildren = await children(provider, hierarchyRoot);

    assert.strictEqual(root.find((item) => item.label === 'HDL Project')?.contextValue, 'hdlExplorer.projectRoot');
    assert.strictEqual(compileUnit.contextValue, 'hdlExplorer.compileUnit');
    assert.strictEqual((await children(provider, filesGroup))[0]?.contextValue, 'hdlExplorer.sourceFile');
    assert.strictEqual((await children(provider, includeDirsGroup))[0]?.contextValue, 'hdlExplorer.includeDir');
    assert.strictEqual((await children(provider, definesGroup))[0]?.contextValue, 'hdlExplorer.define');
    assert.strictEqual((await sectionChildren(provider, root, 'Modules'))[0]?.contextValue, 'hdlExplorer.module');
    assert.strictEqual((await sectionChildren(provider, root, 'Packages'))[0]?.contextValue, 'hdlExplorer.package');
    assert.strictEqual(hierarchyRoot.contextValue, 'hdlExplorer.hierarchyModule');
    assert.strictEqual(hierarchyChildren[0]?.contextValue, 'hdlExplorer.hierarchyInstance');
    assert.strictEqual(hierarchyChildren[1]?.contextValue, 'hdlExplorer.unresolvedInstance');
  });

  test('maps module and instance items to source locations', async () => {
    const moduleRecord = createModuleRecord('top');
    const instanceLocation = new vscode.Location(moduleRecord.uri, new vscode.Range(2, 4, 2, 11));
    const provider = createProvider({
      symbols: [moduleRecord],
      hierarchy: {
        version: 1,
        roots: [{
          moduleName: 'top',
          module: moduleRecord,
          instances: [{
            instanceName: 'u_child',
            moduleName: 'child',
            resolvedModule: createModuleRecord('child'),
            location: instanceLocation,
          }],
          unresolvedInstances: [],
        }],
        unresolvedInstances: [],
        allInstances: [],
      },
    });

    const root = await children(provider);
    const moduleItem = (await sectionChildren(provider, root, 'Modules'))[0];
    const hierarchyRoot = (await sectionChildren(provider, root, 'Hierarchy (best-effort)'))[0];
    assert.ok(hierarchyRoot);
    const instanceItem = (await children(provider, hierarchyRoot))[0];

    assert.strictEqual(moduleItem?.command?.command, 'verilog.openModuleFromExplorer');
    assert.strictEqual((moduleItem?.command?.arguments?.[0] as vscode.Location).uri.fsPath, moduleRecord.uri.fsPath);
    assert.strictEqual(instanceItem?.command?.command, 'verilog.openInstanceFromExplorer');
    assert.strictEqual(instanceItem?.command?.arguments?.[0], instanceLocation);
  });

  test('hides unresolved section when disabled', async () => {
    const config = vscode.workspace.getConfiguration();
    const previous = config.get('verilog.hierarchy.showUnresolved');
    const provider = createProvider();

    try {
      await config.update('verilog.hierarchy.showUnresolved', false, vscode.ConfigurationTarget.Global);
      const root = await children(provider);
      assert.ok(!root.some((item) => item.label === 'Unresolved Instances'));
    } finally {
      await config.update('verilog.hierarchy.showUnresolved', previous, vscode.ConfigurationTarget.Global);
    }
  });

  test('returns disabled item when HDL Explorer is disabled', async () => {
    const config = vscode.workspace.getConfiguration();
    const previous = config.get('verilog.hdlExplorer.enabled');
    const provider = createProvider();

    try {
      await config.update('verilog.hdlExplorer.enabled', false, vscode.ConfigurationTarget.Global);
      const root = await children(provider);
      assert.deepStrictEqual(root.map((item) => item.label), ['HDL Explorer disabled']);
    } finally {
      await config.update('verilog.hdlExplorer.enabled', previous, vscode.ConfigurationTarget.Global);
    }
  });

  test('filters hierarchy roots and clears the filter', async () => {
    const top = createModuleRecord('top');
    const child = createModuleRecord('child');
    const provider = createProvider({
      symbols: [top, child],
      hierarchy: {
        version: 1,
        roots: [{
          moduleName: 'top',
          module: top,
          instances: [{
            instanceName: 'u_child',
            moduleName: 'child',
            resolvedModule: child,
            location: new vscode.Location(top.uri, top.selectionRange),
            children: {
              moduleName: 'child',
              module: child,
              instances: [],
              unresolvedInstances: [],
            },
          }],
          unresolvedInstances: [],
        }],
        unresolvedInstances: [],
        allInstances: [],
      },
    });

    provider.setHierarchyRootFilter('child', 'unit');
    const filtered = await sectionChildren(provider, await children(provider), 'Hierarchy (best-effort)');
    assert.strictEqual(filtered[0]?.label, 'Filtered root');
    assert.strictEqual(filtered[1]?.label, 'child');

    provider.clearHierarchyRootFilter();
    const unfiltered = await sectionChildren(provider, await children(provider), 'Hierarchy (best-effort)');
    assert.strictEqual(unfiltered[0]?.label, 'top');
  });

  test('helper functions build active target, path, define, and hierarchy values', () => {
    const snapshot = createProjectSnapshot();
    const compileUnit = snapshot.compileUnits[0];
    assert.ok(compileUnit);
    const picks = buildActiveTargetQuickPickItems(snapshot.compileUnits);
    assert.strictEqual(picks[0]?.targetId, '');
    assert.strictEqual(picks[1]?.label, compileUnit.name);
    assert.strictEqual(picks[1]?.targetId, compileUnit.id);

    assert.strictEqual(
      getRelativePath(vscode.Uri.file('/workspace/rtl/top.sv'), vscode.Uri.file('/workspace')),
      'rtl/top.sv'
    );
    const outsideWorkspaceUri = vscode.Uri.file('/other/top.sv');
    assert.strictEqual(
      getRelativePath(outsideWorkspaceUri, vscode.Uri.file('/workspace')),
      outsideWorkspaceUri.fsPath
    );
    assert.strictEqual(formatDefineArgument('SIM', { name: 'SIM', value: true, source: 'settings' }), '+define+SIM');
    assert.strictEqual(
      formatDefineArgument('WIDTH', { name: 'WIDTH', value: '32', source: 'settings' }),
      '+define+WIDTH=32'
    );

    const top = createModuleRecord('top');
    const child = createModuleRecord('child');
    const roots = [{
      moduleName: 'top',
      module: top,
      instances: [{
        instanceName: 'u_child',
        moduleName: 'child',
        resolvedModule: child,
        location: new vscode.Location(top.uri, top.selectionRange),
        children: {
          moduleName: 'child',
          module: child,
          instances: [],
          unresolvedInstances: [],
        },
      }],
      unresolvedInstances: [],
    }];
    assert.deepStrictEqual(filterHierarchyRoots(roots).map((node) => node.moduleName), ['top']);
    assert.deepStrictEqual(filterHierarchyRoots(roots, { moduleName: 'child', compileUnitId: 'unit' }).map((node) => node.moduleName), ['child']);
  });
});

async function sectionChildren(
  provider: HdlExplorerProvider,
  root: HdlExplorerItem[],
  label: string
): Promise<HdlExplorerItem[]> {
  const section = root.find((item) => item.label === label);
  assert.ok(section, `Expected section ${label}`);
  return children(provider, section);
}

async function children(provider: HdlExplorerProvider, element?: HdlExplorerItem): Promise<HdlExplorerItem[]> {
  return await Promise.resolve(provider.getChildren(element)) ?? [];
}

function createProvider(input: {
  symbols?: SymbolRecord[];
  hierarchy?: HierarchySnapshot;
  projectSnapshot?: ProjectSnapshot;
} = {}): HdlExplorerProvider {
  const projectSnapshot = input.projectSnapshot ?? createProjectSnapshot();
  const hierarchy = input.hierarchy ?? {
    version: 1,
    roots: [],
    unresolvedInstances: [],
    allInstances: [],
  };
  const noOpEvent = (() => ({ dispose: () => undefined })) as vscode.Event<unknown>;
  return new HdlExplorerProvider(
    {
      getSnapshot: () => projectSnapshot,
      onDidChangeSnapshot: noOpEvent,
    } as unknown as ProjectService,
    {
      getIndex: () => new SemanticIndex(1, input.symbols ?? []),
      onDidChangeIndex: noOpEvent,
    } as unknown as IndexService,
    {
      getHierarchy: () => hierarchy,
      onDidChangeHierarchy: noOpEvent,
      rebuild: async () => hierarchy,
    } as unknown as HierarchyService
  );
}

function createProjectSnapshot(): ProjectSnapshot {
  const fileUri = vscode.Uri.file('/workspace/top.sv');
  return {
    version: 1,
    workspaceRoot: vscode.Uri.file('/workspace'),
    activeTargetId: 'unit',
    compileUnits: [{
      id: 'unit',
      name: 'unit',
      root: vscode.Uri.file('/workspace'),
      files: [{
        uri: fileUri,
        languageId: 'systemverilog',
        kind: 'source',
        order: 0,
      }],
      includeDirs: [vscode.Uri.file('/workspace/include')],
      defines: {
        SIM: {
          name: 'SIM',
          value: true,
          source: 'settings',
        },
      },
      topModules: [],
      source: { type: 'settings' },
    }],
    diagnostics: [],
  };
}

function createModuleRecord(name: string): ModuleRecord {
  return {
    ...createSymbolRecord(name, 'module'),
    kind: 'module',
    ports: [],
    parameters: [],
  };
}

function createSymbolRecord(name: string, kind: SymbolRecord['kind']): SymbolRecord {
  const selectionRange = new vscode.Range(0, 7, 0, 7 + name.length);
  return {
    id: `unit:${kind}:${name}`,
    name,
    kind,
    uri: vscode.Uri.file(`/workspace/${name}.sv`),
    range: selectionRange,
    selectionRange,
    compileUnitId: 'unit',
  };
}
