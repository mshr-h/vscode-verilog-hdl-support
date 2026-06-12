// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { CtagsManager } from '../ctags';
import { CompletionService } from '../hdl/CompletionService';
import type { ProjectService } from '../project/ProjectService';
import type { FileContext } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, SymbolRecord } from '../semantic/SymbolRecords';

suite('CompletionService', () => {
  test('completes module names from project index', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'my_',
    });
    const service = createCompletionService([
      createModuleRecord('my_module'),
    ]);

    const items = await service.provideCompletionItems(
      document,
      new vscode.Position(0, 3),
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
    );

    const item = items.find((completionItem) => completionItem.label === 'my_module');
    assert.ok(item, 'Expected project module completion');
    assert.strictEqual(item.kind, vscode.CompletionItemKind.Module);
  });

  test('completes macros after backtick', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '`',
    });
    const service = createCompletionService([
      createSymbolRecord('PROJECT_MACRO', 'macro'),
    ]);

    const items = await service.provideCompletionItems(
      document,
      new vscode.Position(0, 1),
      {
        triggerKind: vscode.CompletionTriggerKind.TriggerCharacter,
        triggerCharacter: '`',
      }
    );

    const item = items.find((completionItem) => completionItem.label === 'PROJECT_MACRO');
    assert.ok(item, 'Expected project macro completion');
    assert.strictEqual(item.kind, vscode.CompletionItemKind.Constant);
  });

  test('completes include paths from current directory and include dirs', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'completion-include-'));
    const src = path.join(root, 'src');
    const inc = path.join(root, 'inc');
    fs.mkdirSync(src);
    fs.mkdirSync(inc);
    fs.writeFileSync(path.join(src, 'local.svh'), '');
    fs.writeFileSync(path.join(inc, 'shared.svh'), '');
    fs.mkdirSync(path.join(inc, 'nested'));
    const documentPath = path.join(src, 'top.sv');
    fs.writeFileSync(documentPath, '`include "');
    const document = await vscode.workspace.openTextDocument(documentPath);
    const context: FileContext = {
      file: vscode.Uri.file(documentPath),
      compileUnitId: 'unit',
      includeDirs: [vscode.Uri.file(inc)],
      defines: {},
    };
    const service = createCompletionService([], context);

    const items = await service.provideCompletionItems(
      document,
      new vscode.Position(0, 10),
      {
        triggerKind: vscode.CompletionTriggerKind.TriggerCharacter,
        triggerCharacter: '"',
      }
    );

    assert.ok(items.some((item) => item.label === 'local.svh'));
    assert.ok(items.some((item) => item.label === 'shared.svh'));
    assert.ok(items.some((item) => item.label === 'nested/'));
  });

  test('preserves ctags completion fallback', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'logic fallback_sig;',
    });
    const service = createCompletionService([], undefined, {
      getSymbols: async () => [
        {
          name: 'fallback_sig',
          type: 'net',
          startPosition: new vscode.Position(0, 0),
          endPosition: new vscode.Position(0, 19),
          parentScope: '',
          parentType: '',
          isValid: true,
        },
      ],
    } as unknown as CtagsManager);

    const items = await service.provideCompletionItems(
      document,
      new vscode.Position(0, 0),
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
    );

    const item = items.find((completionItem) => completionItem.label === 'fallback_sig');
    assert.ok(item, 'Expected ctags fallback completion');
    assert.strictEqual(item.kind, vscode.CompletionItemKind.Variable);
  });
});

function createCompletionService(
  symbols: SymbolRecord[],
  context?: FileContext,
  ctagsManager: CtagsManager = { getSymbols: async () => [] } as unknown as CtagsManager
): CompletionService {
  const projectService = {
    getPreferredFileContext: () => context,
  } as unknown as ProjectService;
  const indexService = {
    getIndex: () => new SemanticIndex(1, symbols),
  } as unknown as IndexService;
  return new CompletionService(projectService, indexService, ctagsManager);
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
