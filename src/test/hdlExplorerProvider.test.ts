// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { HdlExplorerProvider } from '../views/HdlExplorerProvider';
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
    assert.ok((await sectionChildren(provider, root, 'Modules')).some((item) => item.label === 'top'));
    assert.ok((await sectionChildren(provider, root, 'Packages')).some((item) => item.label === 'pkg'));
    assert.ok((await sectionChildren(provider, root, 'Hierarchy (best-effort)')).some((item) => item.label === 'top'));
    assert.ok((await sectionChildren(provider, root, 'Unresolved Instances')).some((item) => item.label === 'u_missing : missing'));
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
