// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { VerilogCompletionItemProvider } from '../providers/CompletionItemProvider';
import { Ctags, CtagsManager, dedupeDefinitionLinks, parseCtagsTagLine, Symbol } from '../ctags';
import { getExtensionLogger } from '../logging';
import { isWorkspaceLookupSymbol, WorkspaceCtagsIndex } from '../ctagsWorkspaceIndex';
import { END_OF_LINE } from '../constants';

suite('Ctags Parsing', () => {
  test('shared parser preserves symbol types, scopes, and line numbers', () => {
    const logger = getExtensionLogger('Test', 'CtagsParser');
    const moduleSymbol = parseCtagsTagLine('top\ttop.sv\t1;"\tmodule', logger);
    const parameterSymbol = parseCtagsTagLine(
      'WIDTH\ttop.sv\t2;"\tconstant\tmodule:top\tparameter:',
      logger
    );
    const portSymbol = parseCtagsTagLine('clk\ttop.sv\t3;"\tport\tmodule:top', logger);

    assert.strictEqual(moduleSymbol?.name, 'top');
    assert.strictEqual(moduleSymbol?.type, 'module');
    assert.strictEqual(moduleSymbol?.startPosition.line, 0);
    assert.strictEqual(parameterSymbol?.type, 'parameter');
    assert.strictEqual(parameterSymbol?.parentScope, 'top');
    assert.strictEqual(parameterSymbol?.startPosition.line, 1);
    assert.strictEqual(portSymbol?.type, 'port');
    assert.strictEqual(portSymbol?.parentType, 'module');
  });

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

  test('workspace lookup filter keeps unqualified results to top-level symbols', () => {
    assert.strictEqual(
      isWorkspaceLookupSymbol(new Symbol('child_module', 'module', '', 0, '', '', 0, false)),
      true
    );
    assert.strictEqual(
      isWorkspaceLookupSymbol(new Symbol('sig', 'net', '', 1, 'top', 'module', 1, false)),
      false
    );
    assert.strictEqual(
      isWorkspaceLookupSymbol(new Symbol('WIDTH', 'parameter', '', 1, 'pkg', 'package', 1, false)),
      false
    );
  });

  test('workspace lookup filter allows qualified package members', () => {
    assert.strictEqual(
      isWorkspaceLookupSymbol(
        new Symbol('PARAM', 'parameter', '', 1, 'pkg', 'package', 1, false),
        'pkg'
      ),
      true
    );
    assert.strictEqual(
      isWorkspaceLookupSymbol(
        new Symbol('PARAM', 'parameter', '', 1, 'other_pkg', 'package', 1, false),
        'pkg'
      ),
      false
    );
  });

  test('definition de-duplication removes repeated uri and line matches', () => {
    const uri = vscode.Uri.file(path.join(process.cwd(), 'top.sv'));
    const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, END_OF_LINE));
    const first = {
      targetUri: uri,
      targetRange: range,
      targetSelectionRange: range,
    };
    const second = {
      targetUri: uri,
      targetRange: range,
      targetSelectionRange: range,
    };

    assert.strictEqual(dedupeDefinitionLinks([first, second]).length, 1);
  });

  test('CtagsManager returns current-document definitions before workspace definitions', async () => {
    const documentUri = vscode.Uri.file(
      path.join(process.cwd(), 'src/test/fixtures/workspace-ctags/top.sv')
    );
    const document = await vscode.workspace.openTextDocument(documentUri);
    const manager = new CtagsManager();
    const localRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, END_OF_LINE));
    const workspaceRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, END_OF_LINE)
    );
    const workspaceUri = vscode.Uri.file(
      path.join(process.cwd(), 'src/test/fixtures/workspace-ctags/child_module.sv')
    );
    const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;

    try {
      (vscode.workspace as any).getWorkspaceFolder = () => ({
        uri: vscode.Uri.file(process.cwd()),
        name: 'vscode-verilog-hdl-support',
        index: 0,
      });
      (manager as any).enabled = true;
      manager.findDefinition = async () => [
        {
          targetUri: document.uri,
          targetRange: localRange,
          targetSelectionRange: localRange,
        },
      ];
      (manager as any).workspaceIndex = {
        findDefinitions: async () => [
          {
            targetUri: workspaceUri,
            targetRange: workspaceRange,
            targetSelectionRange: workspaceRange,
          },
        ],
        dispose: () => undefined,
      };

      const results = await manager.findSymbol(document, new vscode.Position(1, 2));

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].targetUri.toString(), document.uri.toString());
      assert.strictEqual(results[1].targetUri.toString(), workspaceUri.toString());
    } finally {
      (vscode.workspace as any).getWorkspaceFolder = originalGetWorkspaceFolder;
      manager.dispose();
    }
  });

  test('WorkspaceCtagsIndex query APIs return modules and module members', async () => {
    const folder = {
      uri: vscode.Uri.file(process.cwd()),
      name: 'vscode-verilog-hdl-support',
      index: 0,
    };
    const uri = vscode.Uri.file(path.join(process.cwd(), 'src/test/fixtures/workspace-ctags/top.sv'));
    const moduleSymbol = { uri, symbol: new Symbol('top', 'module', '', 0, '', '', 0, false) };
    const portSymbol = { uri, symbol: new Symbol('clk', 'port', '', 1, 'top', 'module', 1, false) };
    const parameterSymbol = {
      uri,
      symbol: new Symbol('WIDTH', 'parameter', '', 1, 'top', 'module', 1, false),
    };
    const index = new WorkspaceCtagsIndex(getExtensionLogger('Test', 'WorkspaceCtagsIndex'));
    const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;

    try {
      (vscode.workspace as any).getWorkspaceFolder = () => folder;
      (index as any).config.enabled = true;
      (index as any).statesByFolderUri.set(folder.uri.toString(), {
        folder,
        symbolsByName: new Map([
          ['top', [moduleSymbol]],
          ['clk', [portSymbol]],
          ['WIDTH', [parameterSymbol]],
        ]),
        filesByUri: new Map([[uri.toString(), [moduleSymbol, portSymbol, parameterSymbol]]]),
        isDirty: false,
        isBuilding: false,
        skipped: false,
      });

      const modules = await index.findTopLevelModules(folder);
      const symbols = await index.findSymbolsInFile(uri);
      const members = await index.findModuleMembers(moduleSymbol);

      assert.deepStrictEqual(modules, [moduleSymbol]);
      assert.deepStrictEqual(symbols, [moduleSymbol, portSymbol, parameterSymbol]);
      assert.deepStrictEqual(members.ports, [portSymbol.symbol]);
      assert.deepStrictEqual(members.parameters, [parameterSymbol.symbol]);
    } finally {
      (vscode.workspace as any).getWorkspaceFolder = originalGetWorkspaceFolder;
      index.dispose();
    }
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
