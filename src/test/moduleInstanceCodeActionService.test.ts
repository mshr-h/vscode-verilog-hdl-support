// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { ModuleInstanceCodeActionService } from '../hdl/ModuleInstanceCodeActionService';
import type { ProjectService } from '../project/ProjectService';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, ParameterRecord, PortRecord, SymbolRecord } from '../semantic/SymbolRecords';

suite('ModuleInstanceCodeActionService', () => {
  test('fills missing ports for a simple instance', async () => {
    const { document, position } = await openDocumentAtCursor([
      'foo u_foo (',
      '  .clk(clk)|',
      ');',
    ].join('\n'));
    const service = createService([
      createModuleRecord('foo', [
        createPortRecord('clk'),
        createPortRecord('rst_n'),
        createPortRecord('data_i'),
        createPortRecord('valid_o'),
      ]),
    ]);

    const action = getAction(service, document, position, 'Verilog: Fill Missing Ports');

    assert.strictEqual(normalizeLineEndings(applyWorkspaceEdit(document, action.edit)), [
      'foo u_foo (',
      '  .clk    (clk),',
      '  .rst_n  (rst_n),',
      '  .data_i (data_i),',
      '  .valid_o(valid_o)',
      ');',
    ].join('\n'));
  });

  test('fills missing ports with an existing subset', async () => {
    const { document, position } = await openDocumentAtCursor([
      'foo u_foo (',
      '  .rst_n(reset_n)|',
      ');',
    ].join('\n'));
    const service = createService([
      createModuleRecord('foo', [
        createPortRecord('clk'),
        createPortRecord('rst_n'),
        createPortRecord('valid_o'),
      ]),
    ]);

    const action = getAction(service, document, position, 'Verilog: Fill Missing Ports');

    assert.strictEqual(normalizeLineEndings(applyWorkspaceEdit(document, action.edit)), [
      'foo u_foo (',
      '  .rst_n  (reset_n),',
      '  .clk    (clk),',
      '  .valid_o(valid_o)',
      ');',
    ].join('\n'));
  });

  test('fills missing ports when no connections exist', async () => {
    const { document, position } = await openDocumentAtCursor('foo u_foo (|);');
    const service = createService([
      createModuleRecord('foo', [
        createPortRecord('clk'),
        createPortRecord('rst_n'),
      ]),
    ]);

    const action = getAction(service, document, position, 'Verilog: Fill Missing Ports');

    assert.strictEqual(normalizeLineEndings(applyWorkspaceEdit(document, action.edit)), [
      'foo u_foo (',
      '    .clk  (clk),',
      '    .rst_n(rst_n)',
      ');',
    ].join('\n'));
  });

  test('preserves indentation for filled ports', async () => {
    const { document, position } = await openDocumentAtCursor([
      '  foo u_foo (',
      '    .clk(clk)|',
      '  );',
    ].join('\n'));
    const service = createService([
      createModuleRecord('foo', [
        createPortRecord('clk'),
        createPortRecord('rst_n'),
      ]),
    ]);

    const action = getAction(service, document, position, 'Verilog: Fill Missing Ports');

    assert.strictEqual(normalizeLineEndings(applyWorkspaceEdit(document, action.edit)), [
      '  foo u_foo (',
      '    .clk  (clk),',
      '    .rst_n(rst_n)',
      '  );',
    ].join('\n'));
  });

  test('preserves trailing comma style', async () => {
    const { document, position } = await openDocumentAtCursor([
      'foo u_foo (',
      '  .clk(clk),|',
      ');',
    ].join('\n'));
    const service = createService([
      createModuleRecord('foo', [
        createPortRecord('clk'),
        createPortRecord('rst_n'),
      ]),
    ]);

    const action = getAction(service, document, position, 'Verilog: Fill Missing Ports');

    assert.strictEqual(normalizeLineEndings(applyWorkspaceEdit(document, action.edit)), [
      'foo u_foo (',
      '  .clk  (clk),',
      '  .rst_n(rst_n),',
      ');',
    ].join('\n'));
  });

  test('fills missing parameters', async () => {
    const { document, position } = await openDocumentAtCursor([
      'foo #(',
      '  .WIDTH(32)|',
      ') u_foo ();',
    ].join('\n'));
    const service = createService([
      createModuleRecord('foo', [], [
        createParameterRecord('WIDTH'),
        createParameterRecord('DEPTH'),
      ]),
    ]);

    const action = getAction(service, document, position, 'Verilog: Fill Missing Parameters');

    assert.strictEqual(normalizeLineEndings(applyWorkspaceEdit(document, action.edit)), [
      'foo #(',
      '  .WIDTH(32),',
      '  .DEPTH(DEPTH)',
      ') u_foo ();',
    ].join('\n'));
  });

  test('does not return actions outside an instance', async () => {
    const { document, position } = await openDocumentAtCursor('assign value = si|g;');
    const service = createService([createModuleRecord('foo', [createPortRecord('clk')])]);

    assert.deepStrictEqual(service.provideCodeActions(document, new vscode.Range(position, position)), []);
  });

  test('does not return actions when module is unresolved', async () => {
    const { document, position } = await openDocumentAtCursor('foo u_foo (|);');
    const service = createService([]);

    assert.deepStrictEqual(service.provideCodeActions(document, new vscode.Range(position, position)), []);
  });

  test('does not duplicate existing ports', async () => {
    const { document, position } = await openDocumentAtCursor([
      'foo u_foo (',
      '  .clk(clk)|',
      ');',
    ].join('\n'));
    const service = createService([createModuleRecord('foo', [createPortRecord('clk')])]);

    assert.deepStrictEqual(service.provideCodeActions(document, new vscode.Range(position, position)), []);
  });

  test('disabled settings suppress actions', async () => {
    const config = vscode.workspace.getConfiguration();
    const previous = config.get('verilog.codeActions.fillMissingPorts.enabled');
    const { document, position } = await openDocumentAtCursor('foo u_foo (|);');
    const service = createService([createModuleRecord('foo', [createPortRecord('clk')])]);

    try {
      await config.update('verilog.codeActions.fillMissingPorts.enabled', false, vscode.ConfigurationTarget.Global);
      assert.deepStrictEqual(service.provideCodeActions(document, new vscode.Range(position, position)), []);
    } finally {
      await config.update('verilog.codeActions.fillMissingPorts.enabled', previous, vscode.ConfigurationTarget.Global);
    }
  });
});

async function openDocumentAtCursor(textWithCursor: string): Promise<{ document: vscode.TextDocument; position: vscode.Position }> {
  const offset = textWithCursor.indexOf('|');
  const text = textWithCursor.replace(/\|/g, '');
  const document = await vscode.workspace.openTextDocument({
    language: 'systemverilog',
    content: text,
  });
  return { document, position: document.positionAt(offset) };
}

function getAction(
  service: ModuleInstanceCodeActionService,
  document: vscode.TextDocument,
  position: vscode.Position,
  title: string
): vscode.CodeAction {
  const action = service
    .provideCodeActions(document, new vscode.Range(position, position))
    .find((codeAction) => codeAction.title === title);
  assert.ok(action, `Expected code action: ${title}`);
  assert.ok(action.edit, `Expected edit for code action: ${title}`);
  return action;
}

function applyWorkspaceEdit(document: vscode.TextDocument, edit: vscode.WorkspaceEdit | undefined): string {
  assert.ok(edit);
  const textEdits = edit.entries().find(([uri]) => uri.toString() === document.uri.toString())?.[1] ?? [];
  return textEdits
    .slice()
    .sort((a, b) => document.offsetAt(b.range.start) - document.offsetAt(a.range.start))
    .reduce((text, textEdit) => {
      const start = document.offsetAt(textEdit.range.start);
      const end = document.offsetAt(textEdit.range.end);
      return `${text.slice(0, start)}${textEdit.newText}${text.slice(end)}`;
    }, document.getText());
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function createService(symbols: SymbolRecord[]): ModuleInstanceCodeActionService {
  const projectService = {
    getPreferredFileContext: () => undefined,
  } as unknown as ProjectService;
  const indexService = {
    getIndex: () => new SemanticIndex(1, symbols),
  } as unknown as IndexService;
  return new ModuleInstanceCodeActionService(projectService, indexService);
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

function createPortRecord(name: string): PortRecord {
  return {
    ...createSymbolRecord(name, 'port'),
    kind: 'port',
  };
}

function createParameterRecord(name: string): ParameterRecord {
  return {
    ...createSymbolRecord(name, 'parameter'),
    kind: 'parameter',
  };
}

function createSymbolRecord(name: string, kind: SymbolRecord['kind']): SymbolRecord {
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
