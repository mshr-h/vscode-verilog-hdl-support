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
});
