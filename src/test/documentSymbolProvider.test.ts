// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { VerilogDocumentSymbolProvider } from '../providers/DocumentSymbolProvider';
import { CtagsManager, Symbol } from '../ctags';
import { createLogger } from '../logger';

suite('DocumentSymbolProvider', () => {
  test('provides document symbols for module', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module top;', 'wire sig;', 'endmodule'].join('\n'),
    });

    const symbols = [
      new Symbol('top', 'module', '', 0, '', '', 2, true),
      new Symbol('sig', 'net', '', 1, 'top', 'module', 1, true),
    ];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('DocumentSymbolTest');
    const provider = new VerilogDocumentSymbolProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const result = await provider.provideDocumentSymbols(document, tokenSource.token);

    assert.ok(result.length > 0, 'Expected at least one top-level symbol');
    const topSymbol = result.find((s) => s.name === 'top');
    assert.ok(topSymbol, 'Expected top module symbol');
    assert.strictEqual(topSymbol?.kind, vscode.SymbolKind.Module);
  });

  test('builds hierarchical symbol structure', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: [
        'module top;',
        '  wire a;',
        '  function void foo();',
        '  endfunction',
        'endmodule',
      ].join('\n'),
    });

    const symbols = [
      new Symbol('top', 'module', '', 0, '', '', 4, true),
      new Symbol('a', 'net', '', 1, 'top', 'module', 1, true),
      new Symbol('foo', 'function', '', 2, 'top', 'module', 3, true),
    ];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('DocumentSymbolHierarchyTest');
    const provider = new VerilogDocumentSymbolProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const result = await provider.provideDocumentSymbols(document, tokenSource.token);

    // Should have one top-level symbol (module top)
    assert.strictEqual(result.length, 1, 'Expected one top-level symbol');
    assert.strictEqual(result[0].name, 'top');

    // Children should be nested under module
    assert.ok(result[0].children.length >= 1, 'Expected children under module');
  });

  test('handles empty symbols list', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '// empty file',
    });

    const ctagsManager = {
      getSymbols: async () => [],
    } as unknown as CtagsManager;

    const logger = createLogger('DocumentSymbolEmptyTest');
    const provider = new VerilogDocumentSymbolProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const result = await provider.provideDocumentSymbols(document, tokenSource.token);

    assert.strictEqual(result.length, 0, 'Expected no symbols for empty file');
  });

  test('isContainer returns correct values for symbol kinds', () => {
    const ctagsManager = {} as unknown as CtagsManager;
    const logger = createLogger('IsContainerTest');
    const provider = new VerilogDocumentSymbolProvider(logger, ctagsManager);

    // Container types should return true
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Module), true);
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Function), true);
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Class), true);
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Interface), true);
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Struct), true);

    // Non-container types should return false
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Variable), false);
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Constant), false);
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Property), false);
    assert.strictEqual(provider.isContainer(vscode.SymbolKind.Event), false);
  });

  test('handles multiple modules', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module a; endmodule', 'module b; endmodule'].join('\n'),
    });

    const symbols = [
      new Symbol('a', 'module', '', 0, '', '', 0, true),
      new Symbol('b', 'module', '', 1, '', '', 1, true),
    ];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('DocumentSymbolMultiModuleTest');
    const provider = new VerilogDocumentSymbolProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const result = await provider.provideDocumentSymbols(document, tokenSource.token);

    assert.strictEqual(result.length, 2, 'Expected two top-level modules');
    assert.ok(
      result.find((s) => s.name === 'a'),
      'Expected module a'
    );
    assert.ok(
      result.find((s) => s.name === 'b'),
      'Expected module b'
    );
  });
});
