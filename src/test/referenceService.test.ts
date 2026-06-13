// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ReferenceService } from '../hdl/ReferenceService';
import { FileContextResolver } from '../project/FileContextResolver';
import type { ProjectService } from '../project/ProjectService';
import type { CompileUnit, ProjectSnapshot, SourceFileRef } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';

suite('ReferenceService', () => {
  let previousMaxFiles: number | undefined;

  setup(() => {
    previousMaxFiles = vscode.workspace.getConfiguration().get<number>('verilog.references.maxFiles');
  });

  teardown(async () => {
    await vscode.workspace.getConfiguration().update(
      'verilog.references.maxFiles',
      previousMaxFiles,
      vscode.ConfigurationTarget.Global
    );
  });

  test('module declaration returns module instantiations', async () => {
    const root = createTempRoot();
    const childUri = writeFile(root, 'child.sv', 'module child; endmodule\n');
    const topUri = writeFile(root, 'top.sv', [
      'module top;',
      '  child u0 ();',
      '  child u1 ();',
      'endmodule',
    ].join('\n'));
    const child = createModuleRecord('child', 'unit', childUri, new vscode.Range(0, 7, 0, 12));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [childUri, topUri])]), [child]);
    const document = await vscode.workspace.openTextDocument(childUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 8),
      { includeDeclaration: false },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references.map(formatLocation), [
      `${topUri.fsPath}:1:2-1:7`,
      `${topUri.fsPath}:2:2-2:7`,
    ]);
  });

  test('module instantiation type returns declaration and other instantiations', async () => {
    const root = createTempRoot();
    const childUri = writeFile(root, 'child.sv', 'module child; endmodule\n');
    const topUri = writeFile(root, 'top.sv', [
      'module top;',
      '  child u0 ();',
      '  child u1 ();',
      'endmodule',
    ].join('\n'));
    const child = createModuleRecord('child', 'unit', childUri, new vscode.Range(0, 7, 0, 12));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [childUri, topUri])]), [child]);
    const document = await vscode.workspace.openTextDocument(topUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(1, 4),
      { includeDeclaration: true },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references.map(formatLocation), [
      `${childUri.fsPath}:0:7-0:12`,
      `${topUri.fsPath}:1:2-1:7`,
      `${topUri.fsPath}:2:2-2:7`,
    ]);
  });

  test('includeDeclaration false omits module declaration', async () => {
    const root = createTempRoot();
    const childUri = writeFile(root, 'child.sv', 'module child; endmodule\n');
    const topUri = writeFile(root, 'top.sv', 'module top; child u0 (); endmodule\n');
    const child = createModuleRecord('child', 'unit', childUri, new vscode.Range(0, 7, 0, 12));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [childUri, topUri])]), [child]);
    const document = await vscode.workspace.openTextDocument(topUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 13),
      { includeDeclaration: false },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references.map(formatLocation), [`${topUri.fsPath}:0:12-0:17`]);
  });

  test('duplicate module names prefer active compile unit', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', 'module top; child u0 (); endmodule\n');
    const childAUri = writeFile(root, 'a/child.sv', 'module child; endmodule\n');
    const childBUri = writeFile(root, 'b/child.sv', 'module child; endmodule\n');
    const unitA = createCompileUnit(root, 'unitA', [topUri, childAUri]);
    const unitB = createCompileUnit(root, 'unitB', [topUri, childBUri]);
    const childA = createModuleRecord('child', 'unitA', childAUri, new vscode.Range(0, 7, 0, 12));
    const childB = createModuleRecord('child', 'unitB', childBUri, new vscode.Range(0, 7, 0, 12));
    const service = createService(
      createSnapshot(root, [unitA, unitB], { activeTargetId: 'unitB' }),
      [childA, childB]
    );
    const document = await vscode.workspace.openTextDocument(topUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 13),
      { includeDeclaration: true },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references.map(formatLocation), [
      `${childBUri.fsPath}:0:7-0:12`,
      `${topUri.fsPath}:0:12-0:17`,
    ]);
  });

  test('macro definition returns macro usages', async () => {
    const root = createTempRoot();
    const defsUri = writeFile(root, 'defs.svh', '`define FOO 1\n');
    const topUri = writeFile(root, 'top.sv', 'module top; assign a = `FOO; assign b = `FOO(); endmodule\n');
    const macro = createSymbolRecord('FOO', 'macro', 'unit', defsUri, new vscode.Range(0, 8, 0, 11));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [defsUri, topUri])]), [macro]);
    const document = await vscode.workspace.openTextDocument(defsUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 9),
      { includeDeclaration: false },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references.map(formatLocation), [
      `${topUri.fsPath}:0:24-0:27`,
      `${topUri.fsPath}:0:41-0:44`,
    ]);
  });

  test('macro usage returns definition and other usages', async () => {
    const root = createTempRoot();
    const defsUri = writeFile(root, 'defs.svh', '`define FOO 1\n');
    const topUri = writeFile(root, 'top.sv', 'module top; assign a = `FOO; assign b = `FOO(); endmodule\n');
    const macro = createSymbolRecord('FOO', 'macro', 'unit', defsUri, new vscode.Range(0, 8, 0, 11));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [defsUri, topUri])]), [macro]);
    const document = await vscode.workspace.openTextDocument(topUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 24),
      { includeDeclaration: true },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references.map(formatLocation), [
      `${defsUri.fsPath}:0:8-0:11`,
      `${topUri.fsPath}:0:24-0:27`,
      `${topUri.fsPath}:0:41-0:44`,
    ]);
  });

  test('directive keywords are ignored as macro references', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', '`ifdef FOO\n`endif\nmodule top; endmodule\n');
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [topUri])]), []);
    const document = await vscode.workspace.openTextDocument(topUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 2),
      { includeDeclaration: true },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references, []);
  });

  test('include path returns include occurrences resolving to the same file', async () => {
    const root = createTempRoot();
    const incDir = path.join(root, 'inc');
    fs.mkdirSync(incDir);
    const defsUri = writeFile(root, 'inc/defs.svh', '`define FOO\n');
    const topUri = writeFile(root, 'top.sv', '`include "defs.svh"\nmodule top; endmodule\n');
    const subUri = writeFile(root, 'sub/sub.sv', '`include "../inc/defs.svh"\nmodule sub; endmodule\n');
    const compileUnit = createCompileUnit(root, 'unit', [topUri, subUri, defsUri], {
      includeDirs: [vscode.Uri.file(incDir)],
    });
    const service = createService(createSnapshot(root, [compileUnit]), []);
    const document = await vscode.workspace.openTextDocument(topUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 12),
      { includeDeclaration: true },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references.map(formatLocation), [
      `${subUri.fsPath}:0:10-0:25`,
      `${topUri.fsPath}:0:10-0:18`,
    ]);
  });

  test('typedef exact-name references work in active compile unit', async () => {
    const root = createTempRoot();
    const pkgUri = writeFile(root, 'pkg.sv', 'typedef logic [3:0] nibble_t;\n');
    const topUri = writeFile(root, 'top.sv', 'module top; nibble_t n; endmodule\n');
    const typedef = createSymbolRecord('nibble_t', 'typedef', 'unit', pkgUri, new vscode.Range(0, 20, 0, 28));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [pkgUri, topUri])]), [typedef]);
    const document = await vscode.workspace.openTextDocument(topUri);

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 13),
      { includeDeclaration: true },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(references.map(formatLocation), [
      `${pkgUri.fsPath}:0:20-0:28`,
      `${topUri.fsPath}:0:12-0:20`,
    ]);
  });

  test('cancellation token is respected', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', 'module top; child u0 (); endmodule\n');
    const childUri = writeFile(root, 'child.sv', 'module child; endmodule\n');
    const child = createModuleRecord('child', 'unit', childUri, new vscode.Range(0, 7, 0, 12));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [topUri, childUri])]), [child]);
    const document = await vscode.workspace.openTextDocument(topUri);
    const tokenSource = new vscode.CancellationTokenSource();
    tokenSource.cancel();

    const references = await service.provideReferences(
      document,
      new vscode.Position(0, 13),
      { includeDeclaration: true },
      tokenSource.token
    );

    assert.deepStrictEqual(references, []);
  });
});

function createService(snapshot: ProjectSnapshot, symbols: SymbolRecord[]): ReferenceService {
  const index = new SemanticIndex(snapshot.version, symbols);
  const projectEmitter = new vscode.EventEmitter<ProjectSnapshot>();
  const indexEmitter = new vscode.EventEmitter<SemanticIndex>();
  const projectService = {
    getSnapshot: () => snapshot,
    getPreferredFileContext: (uri: vscode.Uri) => new FileContextResolver(snapshot).getPreferredFileContext(uri),
    onDidChangeSnapshot: projectEmitter.event,
  } as unknown as ProjectService;
  const indexService = {
    getIndex: () => index,
    onDidChangeIndex: indexEmitter.event,
  } as unknown as IndexService;
  return new ReferenceService(projectService, indexService);
}

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-references-'));
}

function writeFile(root: string, relativePath: string, content: string): vscode.Uri {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return vscode.Uri.file(filePath);
}

function createSnapshot(
  root: string,
  compileUnits: CompileUnit[],
  options: { activeTargetId?: string } = {}
): ProjectSnapshot {
  return {
    version: 1,
    workspaceRoot: vscode.Uri.file(root),
    activeTargetId: options.activeTargetId ?? '',
    compileUnits,
    diagnostics: [],
  };
}

function createCompileUnit(
  root: string,
  id: string,
  files: vscode.Uri[],
  options: Partial<Pick<CompileUnit, 'name' | 'includeDirs' | 'defines'>> = {}
): CompileUnit {
  return {
    id,
    name: options.name ?? id,
    root: vscode.Uri.file(root),
    files: files.map((uri, order): SourceFileRef => ({
      uri,
      languageId: uri.fsPath.endsWith('.svh') ? 'systemverilog' : 'systemverilog',
      kind: uri.fsPath.endsWith('.svh') ? 'include' : 'source',
      order,
    })),
    includeDirs: options.includeDirs ?? [],
    defines: options.defines ?? {},
    topModules: [],
    source: { type: 'settings' },
  };
}

function createModuleRecord(
  name: string,
  compileUnitId: string,
  uri: vscode.Uri,
  selectionRange: vscode.Range
): ModuleRecord {
  return {
    ...createSymbolRecord(name, 'module', compileUnitId, uri, selectionRange),
    kind: 'module',
    ports: [],
    parameters: [],
  };
}

function createSymbolRecord(
  name: string,
  kind: SymbolRecord['kind'],
  compileUnitId: string,
  uri: vscode.Uri,
  selectionRange: vscode.Range
): SymbolRecord {
  return {
    id: `${compileUnitId}:${kind}:${name}:${uri.fsPath}`,
    name,
    kind,
    uri,
    range: selectionRange,
    selectionRange,
    compileUnitId,
  };
}

function formatLocation(location: vscode.Location): string {
  return `${location.uri.fsPath}:${location.range.start.line}:${location.range.start.character}-${location.range.end.line}:${location.range.end.character}`;
}
