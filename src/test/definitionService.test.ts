// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { CtagsManager } from '../ctags';
import { DefinitionService } from '../hdl/DefinitionService';
import type { ProjectService } from '../project/ProjectService';
import type { FileContext } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord } from '../semantic/SymbolRecords';

suite('DefinitionService', () => {
  test('resolves module definitions across workspace by module name', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'other_module u_other();',
    });
    const moduleUri = vscode.Uri.file('/workspace/rtl/not_the_module_name.sv');
    const moduleRecord = createModuleRecord('other_module', moduleUri);
    const service = createDefinitionService(new SemanticIndex(1, [moduleRecord]));

    const result = await service.provideDefinition(document, new vscode.Position(0, 2));

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.targetUri.fsPath, moduleUri.fsPath);
    assert.strictEqual(result[0]?.targetSelectionRange?.start.character, 7);
  });

  test('resolves include definitions from current file directory', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-def-'));
    const topPath = path.join(root, 'top.sv');
    const includePath = path.join(root, 'defs.svh');
    fs.writeFileSync(topPath, '`include "defs.svh"\n');
    fs.writeFileSync(includePath, '`define SIM\n');
    const document = await vscode.workspace.openTextDocument(topPath);
    const service = createDefinitionService(new SemanticIndex(1, []));

    const result = await service.provideDefinition(document, new vscode.Position(0, 11));

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.targetUri.fsPath, includePath);
    assert.strictEqual(result[0]?.targetSelectionRange?.start.line, 0);
  });

  test('resolves include definitions from preferred file context include dirs', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-def-'));
    const src = path.join(root, 'src');
    const inc = path.join(root, 'inc');
    fs.mkdirSync(src);
    fs.mkdirSync(inc);
    const topPath = path.join(src, 'top.sv');
    const includePath = path.join(inc, 'defs.svh');
    fs.writeFileSync(topPath, '`include "defs.svh"\n');
    fs.writeFileSync(includePath, '`define SIM\n');
    const document = await vscode.workspace.openTextDocument(topPath);
    const context: FileContext = {
      file: vscode.Uri.file(topPath),
      compileUnitId: 'unit',
      includeDirs: [vscode.Uri.file(inc)],
      defines: {},
    };
    const service = createDefinitionService(new SemanticIndex(1, []), context);

    const result = await service.provideDefinition(document, new vscode.Position(0, 11));

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.targetUri.fsPath, includePath);
  });

  test('falls back to ctags when project index has no definition', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'assign sig = 1;',
    });
    const targetRange = new vscode.Range(0, 7, 0, 10);
    const fallbackLinks: vscode.DefinitionLink[] = [
      {
        targetUri: document.uri,
        targetRange,
        targetSelectionRange: targetRange,
      },
    ];
    let fallbackCalled = false;
    const service = createDefinitionService(
      new SemanticIndex(1, []),
      undefined,
      {
        findSymbol: async () => {
          fallbackCalled = true;
          return fallbackLinks;
        },
      } as unknown as CtagsManager
    );

    const result = await service.provideDefinition(document, new vscode.Position(0, 8));

    assert.strictEqual(fallbackCalled, true);
    assert.deepStrictEqual(result, fallbackLinks);
  });
});

function createDefinitionService(
  index: SemanticIndex,
  context?: FileContext,
  ctagsManager: CtagsManager = { findSymbol: async () => [] } as unknown as CtagsManager
): DefinitionService {
  const projectService = {
    getPreferredFileContext: () => context,
  } as unknown as ProjectService;
  const indexService = {
    getIndex: () => index,
  } as unknown as IndexService;
  return new DefinitionService(projectService, indexService, ctagsManager);
}

function createModuleRecord(name: string, uri: vscode.Uri): ModuleRecord {
  const selectionRange = new vscode.Range(0, 7, 0, 7 + name.length);
  return {
    id: `unit:${name}`,
    name,
    kind: 'module',
    uri,
    range: new vscode.Range(0, 0, 1, 0),
    selectionRange,
    compileUnitId: 'unit',
    ports: [],
    parameters: [],
  };
}
