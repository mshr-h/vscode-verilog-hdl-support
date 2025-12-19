// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { VerilogCompletionItemProvider } from '../providers/CompletionItemProvider';
import { CtagsManager, Symbol } from '../ctags';
import { createLogger } from '../logger';

suite('Ctags Completion', () => {
  test('ctags completion items include symbols and docs', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module foo(input logic a);', 'logic bar;', 'endmodule'].join('\n'),
    });

    const symbols = [
      new Symbol('foo', 'module', '', 0, '', '', 0, true),
      new Symbol('bar', 'net', '', 1, 'foo', 'module', 1, true),
    ];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('CompletionTest');
    const provider = new VerilogCompletionItemProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const items = await provider.provideCompletionItems(
      document,
      new vscode.Position(0, 0),
      tokenSource.token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
    );

    assert.strictEqual(items.length, symbols.length);

    const fooItem = items.find((item) => item.label === 'foo');
    const barItem = items.find((item) => item.label === 'bar');

    assert.ok(fooItem, 'Expected module completion item');
    assert.ok(barItem, 'Expected net completion item');
    assert.strictEqual(fooItem?.kind, vscode.CompletionItemKind.Module);
    assert.strictEqual(barItem?.kind, vscode.CompletionItemKind.Variable);
    assert.strictEqual(fooItem?.detail, 'module');
    assert.strictEqual(barItem?.detail, 'net');

    const fooDoc = fooItem?.documentation as vscode.MarkdownString;
    const barDoc = barItem?.documentation as vscode.MarkdownString;
    assert.ok(fooDoc.value.includes('module foo'), 'Module docs should include definition');
    assert.ok(barDoc.value.includes('logic bar'), 'Net docs should include definition');
    assert.ok(barDoc.value.includes('Hierarchical Scope: foo'), 'Net docs should include scope');
  });

  test('ctags completion omits scope when unset and maps kinds', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['function int add(input int a, input int b);', 'endfunction'].join('\n'),
    });

    const symbols = [new Symbol('add', 'function', '', 0, '', '', 1, true)];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('CompletionTestKinds');
    const provider = new VerilogCompletionItemProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const items = await provider.provideCompletionItems(
      document,
      new vscode.Position(0, 0),
      tokenSource.token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
    );

    assert.strictEqual(items.length, 1);
    const addItem = items[0];
    assert.strictEqual(addItem.label, 'add');
    assert.strictEqual(addItem.kind, vscode.CompletionItemKind.Function);

    const doc = addItem.documentation as vscode.MarkdownString;
    assert.ok(doc.value.includes('function int add'), 'Function docs should include signature');
    assert.ok(!doc.value.includes('Hierarchical Scope'), 'No scope line when parent scope is empty');
  });

  test('ctags completion maps parameter and port kinds', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: [
        'module top #(parameter int WIDTH = 8) (input logic clk);',
        'endmodule',
      ].join('\n'),
    });

    const symbols = [
      new Symbol('WIDTH', 'parameter', '', 0, 'top', 'module', 0, true),
      new Symbol('clk', 'port', '', 0, 'top', 'module', 0, true),
    ];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('CompletionTestParamsPorts');
    const provider = new VerilogCompletionItemProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const items = await provider.provideCompletionItems(
      document,
      new vscode.Position(0, 0),
      tokenSource.token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
    );

    const paramItem = items.find((item) => item.label === 'WIDTH');
    const portItem = items.find((item) => item.label === 'clk');

    assert.ok(paramItem, 'Expected parameter completion item');
    assert.ok(portItem, 'Expected port completion item');
    assert.strictEqual(paramItem?.kind, vscode.CompletionItemKind.Variable);
    assert.strictEqual(portItem?.kind, vscode.CompletionItemKind.Variable);

    const paramDoc = paramItem?.documentation as vscode.MarkdownString;
    const portDoc = portItem?.documentation as vscode.MarkdownString;
    assert.ok(paramDoc.value.includes('parameter int WIDTH'), 'Parameter docs should include declaration');
    assert.ok(portDoc.value.includes('input logic clk'), 'Port docs should include declaration');
  });

  test('ctags completion maps module and interface kinds', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module m1;', 'endmodule', 'interface if1;', 'endinterface'].join('\n'),
    });

    const symbols = [
      new Symbol('m1', 'module', '', 0, '', '', 1, true),
      new Symbol('if1', 'interface', '', 2, '', '', 3, true),
    ];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('CompletionTestKinds2');
    const provider = new VerilogCompletionItemProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const items = await provider.provideCompletionItems(
      document,
      new vscode.Position(0, 0),
      tokenSource.token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
    );

    const moduleItem = items.find((item) => item.label === 'm1');
    const interfaceItem = items.find((item) => item.label === 'if1');

    assert.ok(moduleItem, 'Expected module completion item');
    assert.ok(interfaceItem, 'Expected interface completion item');
    assert.strictEqual(moduleItem?.kind, vscode.CompletionItemKind.Module);
    assert.strictEqual(interfaceItem?.kind, vscode.CompletionItemKind.Interface);
  });

  test('ctags completion includes hierarchical scopes and keeps symbol order', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module top;', 'module child;', 'endmodule', 'endmodule'].join('\n'),
    });

    const symbols = [
      new Symbol('sig', 'net', '', 0, 'top.u1', 'module', 0, true),
      new Symbol('sig', 'net', '', 1, 'top.u2', 'module', 1, true),
    ];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('CompletionTestScopesOrder');
    const provider = new VerilogCompletionItemProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const items = await provider.provideCompletionItems(
      document,
      new vscode.Position(0, 0),
      tokenSource.token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
    );

    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].label, 'sig');
    assert.strictEqual(items[1].label, 'sig');

    const firstDoc = items[0].documentation as vscode.MarkdownString;
    const secondDoc = items[1].documentation as vscode.MarkdownString;
    assert.ok(firstDoc.value.includes('Hierarchical Scope: top.u1'));
    assert.ok(secondDoc.value.includes('Hierarchical Scope: top.u2'));
  });

  test('ctags completion maps typedef, struct, and class kinds', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: [
        'typedef logic [3:0] nibble_t;',
        'typedef struct packed { logic a; } s_t;',
        'class C; endclass',
      ].join('\n'),
    });

    const symbols = [
      new Symbol('nibble_t', 'typedef', '', 0, '', '', 0, true),
      new Symbol('s_t', 'struct', '', 1, '', '', 1, true),
      new Symbol('C', 'class', '', 2, '', '', 2, true),
    ];

    const ctagsManager = {
      getSymbols: async () => symbols,
    } as unknown as CtagsManager;

    const logger = createLogger('CompletionTestTypes');
    const provider = new VerilogCompletionItemProvider(logger, ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();
    const items = await provider.provideCompletionItems(
      document,
      new vscode.Position(0, 0),
      tokenSource.token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
    );

    const typedefItem = items.find((item) => item.label === 'nibble_t');
    const structItem = items.find((item) => item.label === 's_t');
    const classItem = items.find((item) => item.label === 'C');

    assert.ok(typedefItem, 'Expected typedef completion item');
    assert.ok(structItem, 'Expected struct completion item');
    assert.ok(classItem, 'Expected class completion item');
    assert.strictEqual(typedefItem?.kind, vscode.CompletionItemKind.TypeParameter);
    assert.strictEqual(structItem?.kind, vscode.CompletionItemKind.Struct);
    assert.strictEqual(classItem?.kind, vscode.CompletionItemKind.Class);
  });
});
