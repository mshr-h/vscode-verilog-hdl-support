// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { buildCompileUnit } from '../project/ProjectModelMerger';
import type { ProjectSnapshot } from '../project/ProjectTypes';
import { FastIndexerBackend } from '../semantic/backends/FastIndexerBackend';
import { FastScanner } from '../semantic/backends/FastScanner';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord } from '../semantic/SymbolRecords';

suite('FastScanner', () => {
  test('detects project symbols and basic module ports and parameters', () => {
    const uri = vscode.Uri.file('/workspace/top.sv');
    const result = new FastScanner().scan([
      '`define SIM 1',
      '`include "defs.svh"',
      'package pkg; endpackage',
      'typedef logic [3:0] nibble_t;',
      'module top #(parameter int WIDTH = 8) (input logic clk, output logic done);',
      'localparam DEPTH = 4;',
      'endmodule',
    ].join('\n'), uri, 'unit');

    assert.ok(result.symbols.some((symbol) => symbol.kind === 'macro' && symbol.name === 'SIM'));
    assert.ok(result.symbols.some((symbol) => symbol.kind === 'include' && symbol.name === 'defs.svh'));
    assert.ok(result.symbols.some((symbol) => symbol.kind === 'package' && symbol.name === 'pkg'));
    assert.ok(result.symbols.some((symbol) => symbol.kind === 'typedef' && symbol.name === 'nibble_t'));
    const moduleRecord = result.symbols.find(
      (symbol): symbol is ModuleRecord => symbol.kind === 'module' && symbol.name === 'top'
    );
    assert.ok(moduleRecord);
    assert.ok(moduleRecord.ports.some((port) => port.name === 'clk'));
    assert.ok(moduleRecord.parameters.some((parameter) => parameter.name === 'WIDTH'));
  });

  test('captures ANSI ports and parameters with simple metadata', () => {
    const result = new FastScanner().scan([
      'module foo #(',
      '  parameter int WIDTH = 32,',
      '  parameter DEPTH = 4',
      ') (',
      '  input logic clk,',
      '  input logic [WIDTH-1:0] data_i,',
      '  output logic valid_o',
      ');',
      'endmodule',
    ].join('\n'), vscode.Uri.file('/workspace/foo.sv'), 'unit');
    const moduleRecord = result.symbols.find(
      (symbol): symbol is ModuleRecord => symbol.kind === 'module' && symbol.name === 'foo'
    );

    assert.ok(moduleRecord);
    assert.deepStrictEqual(
      moduleRecord.parameters.map((parameter) => [parameter.name, parameter.dataType, parameter.defaultValue]),
      [
        ['WIDTH', 'int', '32'],
        ['DEPTH', undefined, '4'],
      ]
    );
    assert.deepStrictEqual(
      moduleRecord.ports.map((port) => [port.name, port.direction, port.dataType, port.width]),
      [
        ['clk', 'input', 'logic', undefined],
        ['data_i', 'input', 'logic', '[WIDTH-1:0]'],
        ['valid_o', 'output', 'logic', undefined],
      ]
    );
  });

  test('captures simple non-ANSI port declarations', () => {
    const result = new FastScanner().scan([
      'module foo(clk, rst_n, data_i, valid_o);',
      '  input clk;',
      '  input rst_n;',
      '  input [7:0] data_i;',
      '  output valid_o;',
      'endmodule',
    ].join('\n'), vscode.Uri.file('/workspace/foo.sv'), 'unit');
    const moduleRecord = result.symbols.find(
      (symbol): symbol is ModuleRecord => symbol.kind === 'module' && symbol.name === 'foo'
    );

    assert.ok(moduleRecord);
    assert.deepStrictEqual(
      moduleRecord.ports.map((port) => [port.name, port.direction, port.width]),
      [
        ['clk', 'input', undefined],
        ['rst_n', 'input', undefined],
        ['data_i', 'input', '[7:0]'],
        ['valid_o', 'output', undefined],
      ]
    );
  });

  test('does not throw on malformed SystemVerilog', () => {
    const result = new FastScanner().scan('module ; /* unterminated', vscode.Uri.file('/bad.sv'), 'unit');
    assert.deepStrictEqual(result.symbols, []);
  });
});

suite('FastIndexerBackend', () => {
  test('indexes symbols per file with compile unit ids', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-index-'));
    const filePath = path.join(root, 'top.sv');
    fs.writeFileSync(filePath, 'module top(input logic clk); endmodule\npackage pkg; endpackage\n');
    const snapshot: ProjectSnapshot = {
      version: 1,
      workspaceRoot: vscode.Uri.file(root),
      activeTargetId: 'unit',
      compileUnits: [
        buildCompileUnit({
          id: 'unit',
          name: 'unit',
          root: vscode.Uri.file(root),
          files: [{ resolvedPath: filePath, kind: 'source' }],
          includeDirs: [],
          defines: [],
          settingsIncludeDirs: [],
          settingsDefines: {},
          source: { type: 'settings' },
        }),
      ],
      diagnostics: [],
    };

    const symbols = await new FastIndexerBackend().build(snapshot);
    const index = new SemanticIndex(snapshot.version, symbols);

    assert.strictEqual(index.findModules('top').length, 1);
    assert.strictEqual(index.findPackages('pkg').length, 1);
    assert.ok(index.getSymbolsInFile(vscode.Uri.file(filePath)).every((symbol) => symbol.compileUnitId === 'unit'));
  });

  test('resolves includes from file directory and include directories', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-index-'));
    const src = path.join(root, 'src');
    const inc = path.join(root, 'inc');
    fs.mkdirSync(src);
    fs.mkdirSync(inc);
    fs.writeFileSync(path.join(inc, 'defs.svh'), '`define SIM\n');
    const context = {
      file: vscode.Uri.file(path.join(src, 'top.sv')),
      compileUnitId: 'unit',
      includeDirs: [vscode.Uri.file(inc)],
      defines: {},
    };

    const resolved = new SemanticIndex(1, []).resolveInclude('"defs.svh"', context);
    assert.strictEqual(resolved?.fsPath, path.join(inc, 'defs.svh'));
  });
});

suite('SemanticIndex query helpers', () => {
  test('findBestModule prefers the requested compile unit for duplicate modules', () => {
    const first = createModuleRecord('dupe', 'unitA');
    const second = createModuleRecord('dupe', 'unitB');
    const index = new SemanticIndex(1, [first, second]);

    assert.strictEqual(index.findBestModule('dupe', 'unitB'), second);
    assert.strictEqual(index.getModuleSignature('dupe', 'unitA'), first);
  });

  test('findBestModule falls back to first module when context does not match', () => {
    const first = createModuleRecord('dupe', 'unitA');
    const second = createModuleRecord('dupe', 'unitB');
    const index = new SemanticIndex(1, [first, second]);

    assert.strictEqual(index.findBestModule('dupe', 'missing'), first);
    assert.strictEqual(index.findBestModule('unknown'), undefined);
  });

  test('findSymbolsByName filters by name kind and compile unit', () => {
    const moduleRecord = createModuleRecord('shared', 'unitA');
    const macroRecord = createSymbolRecord('shared', 'macro', 'unitB');
    const packageRecord = createSymbolRecord('pkg', 'package', 'unitA');
    const index = new SemanticIndex(1, [moduleRecord, macroRecord, packageRecord]);

    assert.deepStrictEqual(index.findSymbolsByName('shared', { kinds: ['macro'] }), [macroRecord]);
    assert.deepStrictEqual(index.findSymbolsByName('shared', { compileUnitId: 'unitA' }), [moduleRecord]);
    assert.deepStrictEqual(index.findSymbolsByName('pkg', { kinds: ['package'], compileUnitId: 'unitA' }), [packageRecord]);
  });
});

function createModuleRecord(name: string, compileUnitId: string): ModuleRecord {
  return {
    ...createSymbolRecord(name, 'module', compileUnitId),
    kind: 'module',
    ports: [],
    parameters: [],
  };
}

function createSymbolRecord(
  name: string,
  kind: ModuleRecord['kind'] | 'macro' | 'package',
  compileUnitId: string
) {
  const selectionRange = new vscode.Range(0, 7, 0, 7 + name.length);
  return {
    id: `${compileUnitId}:${kind}:${name}`,
    name,
    kind,
    uri: vscode.Uri.file(`/workspace/${compileUnitId}/${name}.sv`),
    range: selectionRange,
    selectionRange,
    compileUnitId,
  };
}
