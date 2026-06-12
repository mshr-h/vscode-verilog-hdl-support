// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { HierarchyBuilder } from '../hierarchy/HierarchyBuilder';
import type { HierarchyBuildOptions } from '../hierarchy/HierarchyTypes';
import type { ProjectSnapshot } from '../project/ProjectTypes';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord } from '../semantic/SymbolRecords';

suite('HierarchyBuilder', () => {
  test('builds simple top child tree', async () => {
    const root = createTempProject({
      'top.sv': [
        'module top;',
        '  child u_child (.clk(clk));',
        'endmodule',
        'module child(input logic clk);',
        'endmodule',
      ].join('\n'),
    });
    const topUri = vscode.Uri.file(path.join(root, 'top.sv'));
    const snapshot = createSnapshot(root, [{ uri: topUri, compileUnitId: 'unit' }]);
    const index = new SemanticIndex(1, [
      createModuleRecord('top', topUri, 'unit'),
      createModuleRecord('child', topUri, 'unit'),
    ]);

    const hierarchy = await new HierarchyBuilder().build(snapshot, index, defaultOptions());

    assert.deepStrictEqual(hierarchy.roots.map((node) => node.moduleName), ['top']);
    assert.strictEqual(hierarchy.roots[0]?.instances[0]?.instanceName, 'u_child');
    assert.strictEqual(hierarchy.roots[0]?.instances[0]?.children?.moduleName, 'child');
  });

  test('handles unresolved instance', async () => {
    const root = createTempProject({
      'top.sv': 'module top; missing u_missing (); endmodule',
    });
    const topUri = vscode.Uri.file(path.join(root, 'top.sv'));
    const snapshot = createSnapshot(root, [{ uri: topUri, compileUnitId: 'unit' }]);
    const index = new SemanticIndex(1, [createModuleRecord('top', topUri, 'unit')]);

    const hierarchy = await new HierarchyBuilder().build(snapshot, index, defaultOptions());

    assert.strictEqual(hierarchy.roots[0]?.unresolvedInstances[0]?.instanceName, 'u_missing');
    assert.strictEqual(hierarchy.unresolvedInstances[0]?.moduleName, 'missing');
  });

  test('handles duplicate module names with compile unit preference', async () => {
    const root = createTempProject({
      'a.sv': 'module child; endmodule',
      'b.sv': 'module top; child u_child (); endmodule module child; endmodule',
    });
    const aUri = vscode.Uri.file(path.join(root, 'a.sv'));
    const bUri = vscode.Uri.file(path.join(root, 'b.sv'));
    const snapshot = createSnapshot(root, [
      { uri: aUri, compileUnitId: 'unitA' },
      { uri: bUri, compileUnitId: 'unitB' },
    ]);
    const childA = createModuleRecord('child', aUri, 'unitA');
    const top = createModuleRecord('top', bUri, 'unitB');
    const childB = createModuleRecord('child', bUri, 'unitB');
    const index = new SemanticIndex(1, [childA, top, childB]);

    const hierarchy = await new HierarchyBuilder().build(snapshot, index, defaultOptions());

    assert.strictEqual(hierarchy.roots.find((node) => node.moduleName === 'top')?.instances[0]?.resolvedModule, childB);
  });

  test('handles recursive cyclic hierarchy safely and respects maxDepth', async () => {
    const root = createTempProject({
      'cycle.sv': [
        'module a;',
        '  b u_b ();',
        'endmodule',
        'module b;',
        '  a u_a ();',
        'endmodule',
      ].join('\n'),
    });
    const uri = vscode.Uri.file(path.join(root, 'cycle.sv'));
    const snapshot = createSnapshot(root, [{ uri, compileUnitId: 'unit' }], ['a']);
    const index = new SemanticIndex(1, [
      createModuleRecord('a', uri, 'unit'),
      createModuleRecord('b', uri, 'unit'),
    ]);

    const hierarchy = await new HierarchyBuilder().build(snapshot, index, { ...defaultOptions(), maxDepth: 2 });

    const child = hierarchy.roots[0]?.instances[0]?.children;
    assert.strictEqual(hierarchy.roots[0]?.moduleName, 'a');
    assert.strictEqual(child?.moduleName, 'b');
    assert.strictEqual(child?.instances[0]?.children, undefined);
  });

  test('infers top modules and honors configured topModules', async () => {
    const root = createTempProject({
      'design.sv': [
        'module inferred;',
        '  child u_child ();',
        'endmodule',
        'module configured;',
        'endmodule',
        'module child;',
        'endmodule',
      ].join('\n'),
    });
    const uri = vscode.Uri.file(path.join(root, 'design.sv'));
    const modules = [
      createModuleRecord('inferred', uri, 'unit'),
      createModuleRecord('configured', uri, 'unit'),
      createModuleRecord('child', uri, 'unit'),
    ];
    const index = new SemanticIndex(1, modules);

    const inferred = await new HierarchyBuilder().build(
      createSnapshot(root, [{ uri, compileUnitId: 'unit' }]),
      index,
      defaultOptions()
    );
    const configured = await new HierarchyBuilder().build(
      createSnapshot(root, [{ uri, compileUnitId: 'unit' }], ['configured']),
      index,
      defaultOptions()
    );

    assert.deepStrictEqual(inferred.roots.map((node) => node.moduleName), ['inferred', 'configured']);
    assert.deepStrictEqual(configured.roots.map((node) => node.moduleName), ['configured']);
  });

  test('returns empty hierarchy when disabled, project empty, or file unreadable', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hierarchy-empty-'));
    const missingUri = vscode.Uri.file(path.join(root, 'missing.sv'));
    const builder = new HierarchyBuilder();
    const disabled = await builder.build(createSnapshot(root, [{ uri: missingUri, compileUnitId: 'unit' }]), new SemanticIndex(1, []), {
      ...defaultOptions(),
      enabled: false,
    });
    const empty = await builder.build(createSnapshot(root, []), new SemanticIndex(1, []), defaultOptions());
    const unreadable = await builder.build(
      createSnapshot(root, [{ uri: missingUri, compileUnitId: 'unit' }]),
      new SemanticIndex(1, []),
      defaultOptions()
    );

    assert.deepStrictEqual(disabled.roots, []);
    assert.deepStrictEqual(empty.roots, []);
    assert.deepStrictEqual(unreadable.allInstances, []);
  });
});

function createTempProject(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hierarchy-project-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return root;
}

function createSnapshot(
  root: string,
  files: Array<{ uri: vscode.Uri; compileUnitId: string }>,
  topModules: string[] = []
): ProjectSnapshot {
  const compileUnitIds = [...new Set(files.map((file) => file.compileUnitId))];
  return {
    version: 1,
    workspaceRoot: vscode.Uri.file(root),
    activeTargetId: '',
    compileUnits: compileUnitIds.map((compileUnitId) => ({
      id: compileUnitId,
      name: compileUnitId,
      root: vscode.Uri.file(root),
      files: files
        .filter((file) => file.compileUnitId === compileUnitId)
        .map((file, order) => ({
          uri: file.uri,
          languageId: 'systemverilog',
          kind: 'source',
          order,
        })),
      includeDirs: [],
      defines: {},
      topModules,
      source: { type: 'settings' },
    })),
    diagnostics: [],
  };
}

function createModuleRecord(name: string, uri: vscode.Uri, compileUnitId: string): ModuleRecord {
  const selectionRange = new vscode.Range(0, 7, 0, 7 + name.length);
  return {
    id: `${compileUnitId}:${name}`,
    name,
    kind: 'module',
    uri,
    range: selectionRange,
    selectionRange,
    compileUnitId,
    ports: [],
    parameters: [],
  };
}

function defaultOptions(): HierarchyBuildOptions {
  return {
    enabled: true,
    maxDepth: 20,
    showUnresolved: true,
  };
}
