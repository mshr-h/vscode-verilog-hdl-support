// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { VerilogCompletionItemProvider } from '../providers/CompletionItemProvider';
import { Ctags, CtagsManager, Symbol } from '../ctags';
import { getExtensionLogger } from '../logging';

suite('Ctags Parsing', () => {
  test('builds symbols from ctags output without invoking ctags binary', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: [
        'module top #(parameter int WIDTH = 8) (input logic clk);',
        'logic sig;',
        'endmodule',
      ].join('\n'),
    });
    const ctags = new Ctags(getExtensionLogger('Test', 'Ctags'), document);
    const tags = [
      'top\ttop.sv\t1;"\tmodule',
      'WIDTH\ttop.sv\t1;"\tconstant\tmodule:top\tparameter:',
      'clk\ttop.sv\t1;"\tport\tmodule:top',
      'sig\ttop.sv\t2;"\tnet\tmodule:top',
    ].join('\n');

    await ctags.buildSymbolsList(tags);

    assert.strictEqual(ctags.symbols.length, 4);
    const module = ctags.symbols.find((symbol) => symbol.name === 'top');
    const parameter = ctags.symbols.find((symbol) => symbol.name === 'WIDTH');
    const port = ctags.symbols.find((symbol) => symbol.name === 'clk');
    const net = ctags.symbols.find((symbol) => symbol.name === 'sig');

    assert.ok(module, 'Expected module symbol');
    assert.ok(parameter, 'Expected parameter symbol');
    assert.ok(port, 'Expected port symbol');
    assert.ok(net, 'Expected net symbol');
    assert.strictEqual(parameter?.type, 'parameter');
    assert.strictEqual(port?.parentScope, 'top');
    assert.strictEqual(module?.endPosition.line, 2);
    assert.strictEqual(module?.isValid, true);
  });

  test('CtagsManager.onClose disposes cached Ctags instance', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const manager = new CtagsManager();
    const ctags = manager.getCtags(document);
    ctags.symbols = [new Symbol('top', 'module', '', 0, '', '', 0, true)];

    manager.onClose(document);

    const filemap = (manager as any).filemap as Map<vscode.TextDocument, Ctags>;
    assert.strictEqual(filemap.has(document), false);
    assert.strictEqual(ctags.symbols.length, 0);
    manager.dispose();
  });

  test('CtagsManager.dispose disposes cached Ctags instances and clears filemap', async () => {
    const firstDocument = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module first; endmodule',
    });
    const secondDocument = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module second; endmodule',
    });
    const manager = new CtagsManager();
    const firstCtags = manager.getCtags(firstDocument);
    const secondCtags = manager.getCtags(secondDocument);
    firstCtags.symbols = [new Symbol('first', 'module', '', 0, '', '', 0, true)];
    secondCtags.symbols = [new Symbol('second', 'module', '', 0, '', '', 0, true)];

    manager.dispose();
    manager.dispose();

    const filemap = (manager as any).filemap as Map<vscode.TextDocument, Ctags>;
    assert.strictEqual(filemap.size, 0);
    assert.strictEqual(firstCtags.symbols.length, 0);
    assert.strictEqual(secondCtags.symbols.length, 0);
  });
});

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

    const provider = new VerilogCompletionItemProvider(ctagsManager);
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

    const provider = new VerilogCompletionItemProvider(ctagsManager);
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

    const provider = new VerilogCompletionItemProvider(ctagsManager);
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

    const provider = new VerilogCompletionItemProvider(ctagsManager);
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

    const provider = new VerilogCompletionItemProvider(ctagsManager);
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

    const provider = new VerilogCompletionItemProvider(ctagsManager);
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

suite('Ctags Module File Search', () => {
  // findFiles runs a workspace-wide ripgrep search; these tests stub it so the
  // search arguments can be checked without a workspace folder.
  async function withStubbedWorkspaceSearch(
    findFiles: (...args: unknown[]) => Promise<vscode.Uri[]>,
    body: () => Promise<void>
  ): Promise<void> {
    const workspace = vscode.workspace as any;
    const originalFindFiles = workspace.findFiles;
    const originalGetWorkspaceFolder = workspace.getWorkspaceFolder;
    const folder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file('/workspace'),
      name: 'workspace',
      index: 0,
    };
    workspace.findFiles = findFiles;
    workspace.getWorkspaceFolder = () => folder;
    try {
      await body();
    } finally {
      workspace.findFiles = originalFindFiles;
      workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
    }
  }

  function enabledManager(): CtagsManager {
    const manager = new CtagsManager();
    (manager as any).enabled = true;
    return manager;
  }

  test('findModuleFile stops at the first match and passes the request token', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const tokenSource = new vscode.CancellationTokenSource();
    const found = vscode.Uri.file('/workspace/rtl/top.sv');
    const calls: unknown[][] = [];

    await withStubbedWorkspaceSearch(
      async (...args) => {
        calls.push(args);
        return [found];
      },
      async () => {
        const manager = new CtagsManager();
        const result = await manager.findModuleFile(document, 'top', tokenSource.token);
        manager.dispose();

        assert.strictEqual(result?.toString(), found.toString());
      }
    );

    assert.strictEqual(calls.length, 1);
    const [pattern, exclude, maxResults, token] = calls[0];
    assert.strictEqual((pattern as vscode.RelativePattern).pattern, '**/top.sv');
    assert.strictEqual(exclude, undefined, 'Default excludes should still apply');
    assert.strictEqual(maxResults, 1, 'Search should stop at the first match');
    assert.strictEqual(token, tokenSource.token, 'Search should be cancellable by the request');
  });

  test('findModuleFile does not start a search for a cancelled request', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const tokenSource = new vscode.CancellationTokenSource();
    tokenSource.cancel();
    let searches = 0;

    await withStubbedWorkspaceSearch(
      async () => {
        searches++;
        return [];
      },
      async () => {
        const manager = new CtagsManager();
        const result = await manager.findModuleFile(document, 'top', tokenSource.token);
        manager.dispose();

        assert.strictEqual(result, undefined);
      }
    );

    assert.strictEqual(searches, 0);
  });

  test('findSymbol forwards the request token to the module file search', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module top;', '  sub u_sub();', 'endmodule'].join('\n'),
    });
    const tokenSource = new vscode.CancellationTokenSource();
    const manager = enabledManager();
    let searchedModule: string | undefined;
    let searchedToken: vscode.CancellationToken | undefined;
    manager.findDefinition = async () => [];
    manager.findModuleFile = async (_doc, moduleName, token) => {
      searchedModule = moduleName;
      searchedToken = token;
      return undefined;
    };

    await manager.findSymbol(document, new vscode.Position(1, 3), tokenSource.token);
    manager.dispose();

    assert.strictEqual(searchedModule, 'sub');
    assert.strictEqual(searchedToken, tokenSource.token);
  });

  test('findSymbol skips all work for an already cancelled request', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const tokenSource = new vscode.CancellationTokenSource();
    tokenSource.cancel();
    const manager = enabledManager();
    let searches = 0;
    let lookups = 0;
    manager.findDefinition = async () => {
      lookups++;
      return [];
    };
    manager.findModuleFile = async () => {
      searches++;
      return undefined;
    };

    const result = await manager.findSymbol(document, new vscode.Position(0, 8), tokenSource.token);
    manager.dispose();

    assert.deepStrictEqual(result, []);
    assert.strictEqual(searches, 0);
    assert.strictEqual(lookups, 0);
  });

  test('findSymbol does not index the module file when cancelled during the search', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const tokenSource = new vscode.CancellationTokenSource();
    const manager = enabledManager();
    const lookedUp: vscode.Uri[] = [];
    manager.findDefinition = async (doc) => {
      lookedUp.push(doc.uri);
      return [];
    };
    manager.findModuleFile = async () => {
      tokenSource.cancel();
      return vscode.Uri.file('/workspace/rtl/top.sv');
    };

    await manager.findSymbol(document, new vscode.Position(0, 8), tokenSource.token);
    manager.dispose();

    assert.deepStrictEqual(
      lookedUp.map((uri) => uri.toString()),
      [document.uri.toString()],
      'Only the current document should be indexed'
    );
  });

  test('findSymbol does not index the module file when cancelled while opening it', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const moduleDocument = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const tokenSource = new vscode.CancellationTokenSource();
    const manager = enabledManager();
    const lookedUp: vscode.Uri[] = [];
    manager.findDefinition = async (doc) => {
      lookedUp.push(doc.uri);
      return [];
    };
    manager.findModuleFile = async () => moduleDocument.uri;

    const workspace = vscode.workspace as any;
    const originalOpenTextDocument = workspace.openTextDocument;
    workspace.openTextDocument = async () => {
      tokenSource.cancel();
      return moduleDocument;
    };
    try {
      await manager.findSymbol(document, new vscode.Position(0, 8), tokenSource.token);
    } finally {
      workspace.openTextDocument = originalOpenTextDocument;
      manager.dispose();
    }

    assert.deepStrictEqual(
      lookedUp.map((uri) => uri.toString()),
      [document.uri.toString()],
      'Only the current document should be indexed'
    );
  });
});
