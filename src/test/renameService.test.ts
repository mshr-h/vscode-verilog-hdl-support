// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ReferenceService } from '../hdl/ReferenceService';
import { RenameError, RenameService } from '../hdl/RenameService';
import { FileContextResolver } from '../project/FileContextResolver';
import type { ProjectService } from '../project/ProjectService';
import type { CompileUnit, MacroDefine, ProjectSnapshot, SourceFileRef } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';

suite('RenameService', () => {
  test('module declaration rename updates declaration and instantiations', async () => {
    const root = createTempRoot();
    const childUri = writeFile(root, 'child.sv', 'module child; endmodule\n');
    const topUri = writeFile(root, 'top.sv', [
      'module top;',
      '  child u0 ();',
      '  child #(.WIDTH(1)) u1 ();',
      'endmodule',
    ].join('\n'));
    const child = createModuleRecord('child', 'unit', childUri, new vscode.Range(0, 7, 0, 12));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [childUri, topUri])]), [child]);
    const document = await vscode.workspace.openTextDocument(childUri);

    const edit = await service.provideRenameEdits(
      document,
      new vscode.Position(0, 8),
      'new_child',
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(formatWorkspaceEdit(edit), [
      `${childUri.fsPath}:0:7-0:12=new_child`,
      `${topUri.fsPath}:1:2-1:7=new_child`,
      `${topUri.fsPath}:2:2-2:7=new_child`,
    ]);
  });

  test('module instantiation type rename updates declaration and instantiations', async () => {
    const root = createTempRoot();
    const childUri = writeFile(root, 'child.sv', 'module child; endmodule\n');
    const topUri = writeFile(root, 'top.sv', 'module top; child u0 (); child u1 (); endmodule\n');
    const child = createModuleRecord('child', 'unit', childUri, new vscode.Range(0, 7, 0, 12));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [childUri, topUri])]), [child]);
    const document = await vscode.workspace.openTextDocument(topUri);

    const prepared = await service.prepareRename(
      document,
      new vscode.Position(0, 14),
      new vscode.CancellationTokenSource().token
    );
    const edit = await service.provideRenameEdits(
      document,
      new vscode.Position(0, 14),
      'renamed_child',
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(prepared, {
      range: new vscode.Range(0, 12, 0, 17),
      placeholder: 'child',
    });
    assert.deepStrictEqual(formatWorkspaceEdit(edit), [
      `${childUri.fsPath}:0:7-0:12=renamed_child`,
      `${topUri.fsPath}:0:12-0:17=renamed_child`,
      `${topUri.fsPath}:0:25-0:30=renamed_child`,
    ]);
  });

  test('duplicate module names in another compile unit are not edited', async () => {
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

    const edit = await service.provideRenameEdits(
      document,
      new vscode.Position(0, 14),
      'unit_b_child',
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(formatWorkspaceEdit(edit), [
      `${childBUri.fsPath}:0:7-0:12=unit_b_child`,
      `${topUri.fsPath}:0:12-0:17=unit_b_child`,
    ]);
  });

  test('invalid module names are rejected', async () => {
    const root = createTempRoot();
    const childUri = writeFile(root, 'child.sv', 'module child; endmodule\n');
    const child = createModuleRecord('child', 'unit', childUri, new vscode.Range(0, 7, 0, 12));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [childUri])]), [child]);
    const document = await vscode.workspace.openTextDocument(childUri);

    await assert.rejects(
      () => service.provideRenameEdits(
        document,
        new vscode.Position(0, 8),
        '1bad',
        new vscode.CancellationTokenSource().token
      ),
      RenameError
    );
  });

  test('macro definition rename updates source define and usages', async () => {
    const root = createTempRoot();
    const defsUri = writeFile(root, 'defs.svh', '`define FOO 1\n');
    const topUri = writeFile(root, 'top.sv', 'module top; assign x = `FOO; assign y = `FOO(); endmodule\n');
    const macro = createSymbolRecord('FOO', 'macro', 'unit', defsUri, new vscode.Range(0, 8, 0, 11));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [defsUri, topUri])]), [macro]);
    const document = await vscode.workspace.openTextDocument(defsUri);

    const edit = await service.provideRenameEdits(
      document,
      new vscode.Position(0, 9),
      'BAR',
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(formatWorkspaceEdit(edit), [
      `${defsUri.fsPath}:0:8-0:11=BAR`,
      `${topUri.fsPath}:0:24-0:27=BAR`,
      `${topUri.fsPath}:0:41-0:44=BAR`,
    ]);
  });

  test('macro usage rename updates source define and other usages', async () => {
    const root = createTempRoot();
    const defsUri = writeFile(root, 'defs.svh', '`define FOO 1\n');
    const topUri = writeFile(root, 'top.sv', 'module top; assign x = `FOO; assign y = `FOO(); endmodule\n');
    const macro = createSymbolRecord('FOO', 'macro', 'unit', defsUri, new vscode.Range(0, 8, 0, 11));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [defsUri, topUri])]), [macro]);
    const document = await vscode.workspace.openTextDocument(topUri);

    const prepared = await service.prepareRename(
      document,
      new vscode.Position(0, 25),
      new vscode.CancellationTokenSource().token
    );
    const edit = await service.provideRenameEdits(
      document,
      new vscode.Position(0, 25),
      'BAR',
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(prepared, {
      range: new vscode.Range(0, 24, 0, 27),
      placeholder: 'FOO',
    });
    assert.deepStrictEqual(formatWorkspaceEdit(edit), [
      `${defsUri.fsPath}:0:8-0:11=BAR`,
      `${topUri.fsPath}:0:24-0:27=BAR`,
      `${topUri.fsPath}:0:41-0:44=BAR`,
    ]);
  });

  test('backtick-prefixed macro new names are rejected', async () => {
    const root = createTempRoot();
    const defsUri = writeFile(root, 'defs.svh', '`define FOO 1\n');
    const macro = createSymbolRecord('FOO', 'macro', 'unit', defsUri, new vscode.Range(0, 8, 0, 11));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [defsUri])]), [macro]);
    const document = await vscode.workspace.openTextDocument(defsUri);

    await assert.rejects(
      () => service.provideRenameEdits(
        document,
        new vscode.Position(0, 9),
        '`BAR',
        new vscode.CancellationTokenSource().token
      ),
      /without the leading backtick/
    );
  });

  test('directive keywords and unsupported targets do not prepare rename', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', [
      '`ifdef FOO',
      '`endif',
      'module top(input clk);',
      '  logic sig;',
      'endmodule',
    ].join('\n'));
    const top = createModuleRecord('top', 'unit', topUri, new vscode.Range(2, 7, 2, 10));
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [topUri])]), [top]);
    const document = await vscode.workspace.openTextDocument(topUri);

    const directive = await service.prepareRename(
      document,
      new vscode.Position(0, 2),
      new vscode.CancellationTokenSource().token
    );
    const signal = await service.prepareRename(
      document,
      new vscode.Position(3, 9),
      new vscode.CancellationTokenSource().token
    );

    assert.strictEqual(directive, undefined);
    assert.strictEqual(signal, undefined);
  });

  test('project macro without source definition is rejected', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', 'module top; assign x = `PROJECT_MACRO; endmodule\n');
    const defines: Record<string, MacroDefine> = {
      PROJECT_MACRO: {
        name: 'PROJECT_MACRO',
        value: true,
        source: 'filelist',
      },
    };
    const service = createService(
      createSnapshot(root, [createCompileUnit(root, 'unit', [topUri], { defines })]),
      []
    );
    const document = await vscode.workspace.openTextDocument(topUri);

    const prepared = await service.prepareRename(
      document,
      new vscode.Position(0, 25),
      new vscode.CancellationTokenSource().token
    );

    assert.strictEqual(prepared, undefined);
    await assert.rejects(
      () => service.provideRenameEdits(
        document,
        new vscode.Position(0, 25),
        'RENAMED',
        new vscode.CancellationTokenSource().token
      ),
      /source-defined macros/
    );
  });
});

function createService(snapshot: ProjectSnapshot, symbols: SymbolRecord[]): RenameService {
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
  const referenceService = new ReferenceService(projectService, indexService);
  return new RenameService(projectService, indexService, referenceService);
}

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-rename-'));
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
      languageId: 'systemverilog',
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

function formatWorkspaceEdit(edit: vscode.WorkspaceEdit | undefined): string[] {
  assert.ok(edit);
  return edit.entries().flatMap(([uri, edits]) =>
    edits.map((textEdit) =>
      `${uri.fsPath}:${textEdit.range.start.line}:${textEdit.range.start.character}-${textEdit.range.end.line}:${textEdit.range.end.character}=${textEdit.newText}`
    )
  );
}
