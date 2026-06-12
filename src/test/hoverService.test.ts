// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { CtagsManager } from '../ctags';
import { HoverService } from '../hdl/HoverService';
import type { ProjectService } from '../project/ProjectService';
import type { FileContext } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, ParameterRecord, PortRecord, SymbolRecord, SymbolRecordKind } from '../semantic/SymbolRecords';

suite('HoverService', () => {
  test('shows module hover with location, parameters, and ports', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'foo u_foo();',
    });
    const service = createHoverService([
      createModuleRecord('foo', [
        createPortRecord('clk', 'input', 'logic'),
        createPortRecord('data_i', 'input', 'logic', '[WIDTH-1:0]'),
      ], [
        createParameterRecord('WIDTH', 'int', undefined, '32'),
      ]),
    ]);

    const hover = await service.provideHover(document, new vscode.Position(0, 1));
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('module foo'));
    assert.ok(markdown.includes('Defined in:'));
    assert.ok(markdown.includes('WIDTH'));
    assert.ok(markdown.includes('32'));
    assert.ok(markdown.includes('input logic clk'));
    assert.ok(markdown.includes('data_i'));
  });

  test('truncates large module port lists', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'wide u_wide();',
    });
    const ports = Array.from({ length: 25 }, (_, index) => createPortRecord(`p${index}`, 'input'));
    const service = createHoverService([createModuleRecord('wide', ports)]);

    const hover = await service.provideHover(document, new vscode.Position(0, 1));
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('p19'));
    assert.ok(!markdown.includes('p20'));
    assert.ok(markdown.includes('... and 5 more ports'));
  });

  test('shows port hover inside named instance connection', async () => {
    const { document, position } = await openDocumentAtCursor([
      'foo u_foo (',
      '  .da|ta_i(signal)',
      ');',
    ].join('\n'));
    const service = createHoverService([
      createModuleRecord('foo', [
        createPortRecord('data_i', 'input', 'logic', '[WIDTH-1:0]'),
      ]),
    ]);

    const hover = await service.provideHover(document, position);
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('port data_i'));
    assert.ok(markdown.includes('Direction: input'));
    assert.ok(markdown.includes('logic'));
    assert.ok(markdown.includes('WIDTH'));
    assert.ok(markdown.includes('Module: foo'));
  });

  test('shows parameter hover inside named parameter override', async () => {
    const { document, position } = await openDocumentAtCursor([
      'foo #(',
      '  .WI|DTH(64)',
      ') u_foo ();',
    ].join('\n'));
    const service = createHoverService([
      createModuleRecord('foo', [], [
        createParameterRecord('WIDTH', 'int', undefined, '32'),
      ]),
    ]);

    const hover = await service.provideHover(document, position);
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('parameter WIDTH'));
    assert.ok(markdown.includes('Default: 32'));
    assert.ok(markdown.includes('Type: int'));
    assert.ok(markdown.includes('Module: foo'));
  });

  test('shows macro hover from active project define', async () => {
    const { document, position } = await openDocumentAtCursor('`SI|M');
    const context: FileContext = {
      file: document.uri,
      compileUnitId: 'unit',
      includeDirs: [],
      defines: {
        SIM: {
          name: 'SIM',
          value: true,
          source: 'filelist',
        },
      },
    };
    const service = createHoverService([], context);

    const hover = await service.provideHover(document, position);
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('macro SIM'));
    assert.ok(markdown.includes('value: true'));
    assert.ok(markdown.includes('source: filelist'));
  });

  test('shows macro hover from indexed source define', async () => {
    const { document, position } = await openDocumentAtCursor('`SRC_|MACRO');
    const service = createHoverService([
      createSymbolRecord('SRC_MACRO', 'macro'),
    ]);

    const hover = await service.provideHover(document, position);
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('macro SRC_MACRO'));
    assert.ok(markdown.includes('defined at:'));
  });

  test('shows resolved include hover', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-hover-'));
    const topPath = path.join(root, 'top.sv');
    const includePath = path.join(root, 'defs.svh');
    fs.writeFileSync(topPath, '`include "defs.svh"\n');
    fs.writeFileSync(includePath, '`define SIM\n');
    const document = await vscode.workspace.openTextDocument(topPath);
    const service = createHoverService([]);

    const hover = await service.provideHover(document, new vscode.Position(0, 11));
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('include defs.svh'));
    assert.ok(markdown.includes('resolved to:'));
    assert.ok(markdown.includes('defs\\.svh'));
  });

  test('shows unresolved include hover with searched include dirs', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-hover-'));
    const src = path.join(root, 'src');
    const inc = path.join(root, 'inc');
    fs.mkdirSync(src);
    fs.mkdirSync(inc);
    const topPath = path.join(src, 'top.sv');
    fs.writeFileSync(topPath, '`include "missing.svh"\n');
    const document = await vscode.workspace.openTextDocument(topPath);
    const context: FileContext = {
      file: vscode.Uri.file(topPath),
      compileUnitId: 'unit',
      includeDirs: [vscode.Uri.file(inc)],
      defines: {},
    };
    const service = createHoverService([], context);

    const hover = await service.provideHover(document, new vscode.Position(0, 12));
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('include missing.svh'));
    assert.ok(markdown.includes('unresolved'));
    assert.ok(markdown.includes('searched include dirs:'));
    assert.ok(markdown.includes('inc'));
  });

  test('shows package hover from semantic index', async () => {
    const { document, position } = await openDocumentAtCursor('pkg|::value');
    const service = createHoverService([
      createSymbolRecord('pkg', 'package'),
    ]);

    const hover = await service.provideHover(document, position);
    const markdown = getMarkdownValue(hover);

    assert.ok(markdown.includes('package pkg'));
    assert.ok(markdown.includes('Defined in:'));
  });

  test('falls back to ctags hover when no project result exists', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'assign sig = 1;',
    });
    const targetRange = new vscode.Range(0, 0, 0, 15);
    let fallbackCalled = false;
    const service = createHoverService([], undefined, {
      findSymbol: async () => {
        fallbackCalled = true;
        return [{
          targetUri: document.uri,
          targetRange,
          targetSelectionRange: targetRange,
        }];
      },
    } as unknown as CtagsManager);

    const hover = await service.provideHover(document, new vscode.Position(0, 8));
    const markdown = getMarkdownValue(hover);

    assert.strictEqual(fallbackCalled, true);
    assert.ok(markdown.includes('assign sig = 1;'));
  });

  test('uses fallback when project context is unavailable and index is empty', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'logic fallback_sig;',
    });
    const targetRange = new vscode.Range(0, 0, 0, 19);
    let fallbackCalled = false;
    const service = createHoverService([], undefined, {
      findSymbol: async () => {
        fallbackCalled = true;
        return [{
          targetUri: document.uri,
          targetRange,
          targetSelectionRange: targetRange,
        }];
      },
    } as unknown as CtagsManager);

    const hover = await service.provideHover(document, new vscode.Position(0, 8));
    const markdown = getMarkdownValue(hover);

    assert.strictEqual(fallbackCalled, true);
    assert.ok(markdown.includes('logic fallback_sig;'));
  });
});

async function openDocumentAtCursor(
  textWithCursor: string
): Promise<{ document: vscode.TextDocument; position: vscode.Position }> {
  const offset = textWithCursor.indexOf('|');
  const text = textWithCursor.split('|').join('');
  const document = await vscode.workspace.openTextDocument({
    language: 'systemverilog',
    content: text,
  });
  return { document, position: document.positionAt(offset) };
}

function getMarkdownValue(hover: vscode.Hover | undefined): string {
  assert.ok(hover, 'Expected hover to be returned');
  const contents = Array.isArray(hover.contents) ? hover.contents : [hover.contents];
  const markdown = contents.find(
    (item): item is vscode.MarkdownString => item instanceof vscode.MarkdownString
  );
  assert.ok(markdown, 'Expected MarkdownString hover content');
  return markdown.value;
}

function createHoverService(
  symbols: SymbolRecord[],
  context?: FileContext,
  ctagsManager: CtagsManager = { findSymbol: async () => [] } as unknown as CtagsManager
): HoverService {
  const projectService = {
    getPreferredFileContext: () => context,
  } as unknown as ProjectService;
  const indexService = {
    getIndex: () => new SemanticIndex(1, symbols),
  } as unknown as IndexService;
  return new HoverService(projectService, indexService, ctagsManager);
}

function createModuleRecord(
  name: string,
  ports: PortRecord[] = [],
  parameters: ParameterRecord[] = []
): ModuleRecord {
  return {
    ...createSymbolRecord(name, 'module'),
    kind: 'module',
    ports,
    parameters,
  };
}

function createPortRecord(
  name: string,
  direction?: PortRecord['direction'],
  dataType?: string,
  width?: string
): PortRecord {
  return {
    ...createSymbolRecord(name, 'port'),
    kind: 'port',
    direction,
    dataType,
    width,
  };
}

function createParameterRecord(
  name: string,
  dataType?: string,
  width?: string,
  defaultValue?: string
): ParameterRecord {
  return {
    ...createSymbolRecord(name, 'parameter'),
    kind: 'parameter',
    dataType,
    width,
    defaultValue,
  };
}

function createSymbolRecord(name: string, kind: SymbolRecordKind): SymbolRecord {
  const selectionRange = new vscode.Range(0, 0, 0, name.length);
  return {
    id: `${kind}:${name}`,
    name,
    kind,
    uri: vscode.Uri.file(`/workspace/${name}.sv`),
    range: selectionRange,
    selectionRange,
    compileUnitId: 'unit',
  };
}
