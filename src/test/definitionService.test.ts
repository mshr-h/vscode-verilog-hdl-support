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
import type { ModuleRecord, ParameterRecord, PortRecord, SymbolRecord } from '../semantic/SymbolRecords';

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

  test('resolves macro usage to indexed source define', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '`SIM\n',
    });
    const macroRecord = createSymbolRecord('SIM', 'macro', vscode.Uri.file('/workspace/defs.svh'));
    const service = createDefinitionService(new SemanticIndex(1, [macroRecord]));

    const result = await service.provideDefinition(document, new vscode.Position(0, 2));

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.targetUri.fsPath, macroRecord.uri.fsPath);
    assert.strictEqual(result[0]?.targetSelectionRange?.start.character, macroRecord.selectionRange.start.character);
  });

  test('resolves macro usage to project define location when available', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '`PROJECT_MACRO\n',
    });
    const uri = vscode.Uri.file('/workspace/files.f');
    const location = new vscode.Location(uri, new vscode.Range(3, 8, 3, 21));
    const service = createDefinitionService(
      new SemanticIndex(1, []),
      {
        file: document.uri,
        compileUnitId: 'unit',
        includeDirs: [],
        defines: {
          PROJECT_MACRO: {
            name: 'PROJECT_MACRO',
            value: true,
            source: 'filelist',
            location,
          },
        },
      }
    );

    const result = await service.provideDefinition(document, new vscode.Position(0, 3));

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.targetUri.fsPath, uri.fsPath);
    assert.deepStrictEqual(result[0]?.targetSelectionRange, location.range);
  });

  test('falls back to ctags for macro project define without location', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '`NO_LOCATION\n',
    });
    const targetRange = new vscode.Range(0, 1, 0, 12);
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
      {
        file: document.uri,
        compileUnitId: 'unit',
        includeDirs: [],
        defines: {
          NO_LOCATION: {
            name: 'NO_LOCATION',
            value: true,
            source: 'settings',
          },
        },
      },
      {
        findSymbol: async () => {
          fallbackCalled = true;
          return fallbackLinks;
        },
      } as unknown as CtagsManager
    );

    const result = await service.provideDefinition(document, new vscode.Position(0, 2));

    assert.strictEqual(fallbackCalled, true);
    assert.deepStrictEqual(result, fallbackLinks);
  });

  test('resolves named instance port to module port declaration', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: [
        'my_mod u_my_mod (',
        '  .clk(clk)',
        ');',
      ].join('\n'),
    });
    const port = createPortRecord('clk', vscode.Uri.file('/workspace/my_mod.sv'), 'unit');
    const moduleRecord = createModuleRecord('my_mod', vscode.Uri.file('/workspace/my_mod.sv'), 'unit', [port]);
    const service = createDefinitionService(new SemanticIndex(1, [moduleRecord, port]));

    const result = await service.provideDefinition(document, new vscode.Position(1, 4));

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.targetUri.fsPath, port.uri.fsPath);
    assert.deepStrictEqual(result[0]?.targetSelectionRange, port.selectionRange);
  });

  test('resolves named instance parameter to module parameter declaration', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: [
        'my_mod #(',
        '  .WIDTH(32)',
        ') u_my_mod (',
        '  .clk(clk)',
        ');',
      ].join('\n'),
    });
    const parameter = createParameterRecord('WIDTH', vscode.Uri.file('/workspace/my_mod.sv'), 'unit');
    const moduleRecord = createModuleRecord(
      'my_mod',
      vscode.Uri.file('/workspace/my_mod.sv'),
      'unit',
      [],
      [parameter]
    );
    const service = createDefinitionService(new SemanticIndex(1, [moduleRecord, parameter]));

    const result = await service.provideDefinition(document, new vscode.Position(1, 5));

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.targetUri.fsPath, parameter.uri.fsPath);
    assert.deepStrictEqual(result[0]?.targetSelectionRange, parameter.selectionRange);
  });

  test('uses preferred compile unit for duplicate module instance port lookup', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: [
        'my_mod u_my_mod (',
        '  .clk(clk)',
        ');',
      ].join('\n'),
    });
    const portA = createPortRecord('clk', vscode.Uri.file('/workspace/unitA/my_mod.sv'), 'unitA');
    const portB = createPortRecord('clk', vscode.Uri.file('/workspace/unitB/my_mod.sv'), 'unitB');
    const moduleA = createModuleRecord('my_mod', portA.uri, 'unitA', [portA]);
    const moduleB = createModuleRecord('my_mod', portB.uri, 'unitB', [portB]);
    const service = createDefinitionService(
      new SemanticIndex(1, [moduleA, portA, moduleB, portB]),
      {
        file: document.uri,
        compileUnitId: 'unitB',
        includeDirs: [],
        defines: {},
      }
    );

    const result = await service.provideDefinition(document, new vscode.Position(1, 4));

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.targetUri.fsPath, portB.uri.fsPath);
  });

  test('resolves package and typedef definitions from semantic index', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: [
        'import my_pkg::*;',
        'type_t value;',
      ].join('\n'),
    });
    const packageRecord = createSymbolRecord('my_pkg', 'package', vscode.Uri.file('/workspace/pkg.sv'));
    const typedefRecord = createSymbolRecord('type_t', 'typedef', vscode.Uri.file('/workspace/pkg.sv'));
    const service = createDefinitionService(new SemanticIndex(1, [packageRecord, typedefRecord]));

    const packageResult = await service.provideDefinition(document, new vscode.Position(0, 9));
    const typedefResult = await service.provideDefinition(document, new vscode.Position(1, 2));

    assert.strictEqual(packageResult.length, 1);
    assert.strictEqual(packageResult[0]?.targetUri.fsPath, packageRecord.uri.fsPath);
    assert.strictEqual(typedefResult.length, 1);
    assert.strictEqual(typedefResult[0]?.targetUri.fsPath, typedefRecord.uri.fsPath);
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

function createModuleRecord(
  name: string,
  uri: vscode.Uri,
  compileUnitId = 'unit',
  ports: PortRecord[] = [],
  parameters: ParameterRecord[] = []
): ModuleRecord {
  const selectionRange = new vscode.Range(0, 7, 0, 7 + name.length);
  return {
    id: `${compileUnitId}:${name}`,
    name,
    kind: 'module',
    uri,
    range: new vscode.Range(0, 0, 1, 0),
    selectionRange,
    compileUnitId,
    ports,
    parameters,
  };
}

function createPortRecord(name: string, uri: vscode.Uri, compileUnitId: string): PortRecord {
  return {
    ...createSymbolRecord(name, 'port', uri, compileUnitId, 'my_mod'),
    kind: 'port',
    direction: 'input',
  };
}

function createParameterRecord(name: string, uri: vscode.Uri, compileUnitId: string): ParameterRecord {
  return {
    ...createSymbolRecord(name, 'parameter', uri, compileUnitId, 'my_mod'),
    kind: 'parameter',
    defaultValue: '1',
  };
}

function createSymbolRecord(
  name: string,
  kind: SymbolRecord['kind'],
  uri: vscode.Uri,
  compileUnitId = 'unit',
  containerName?: string
): SymbolRecord {
  const selectionRange = new vscode.Range(0, 10, 0, 10 + name.length);
  return {
    id: `${compileUnitId}:${kind}:${name}`,
    name,
    kind,
    uri,
    range: new vscode.Range(0, 0, 1, 0),
    selectionRange,
    compileUnitId,
    containerName,
  };
}
