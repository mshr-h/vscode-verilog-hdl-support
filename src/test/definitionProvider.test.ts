// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { VerilogDefinitionProvider } from '../providers/DefinitionProvider';
import { CtagsManager } from '../ctags';
import { END_OF_LINE } from '../constants';

suite('DefinitionProvider', () => {
  test('returns definition links for found symbol', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module top;', 'wire sig;', 'assign sig = 1;', 'endmodule'].join('\n'),
    });

    const targetRange = new vscode.Range(
      new vscode.Position(1, 0),
      new vscode.Position(1, END_OF_LINE)
    );
    const definitionLinks: vscode.DefinitionLink[] = [
      {
        targetUri: document.uri,
        targetRange,
        targetSelectionRange: targetRange,
      },
    ];

    const ctagsManager = {
      findSymbol: async () => definitionLinks,
    } as unknown as CtagsManager;

    const provider = new VerilogDefinitionProvider(ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();

    // Position on 'sig' in the assign statement
    const result = await provider.provideDefinition(
      document,
      new vscode.Position(2, 7),
      tokenSource.token
    );

    assert.ok(result, 'Expected definition result');
    assert.strictEqual(result?.length, 1, 'Expected one definition');
    assert.strictEqual(result?.[0].targetUri.toString(), document.uri.toString());
  });

  test('returns empty array when no symbol found', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });

    const ctagsManager = {
      findSymbol: async () => [],
    } as unknown as CtagsManager;

    const provider = new VerilogDefinitionProvider(ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();

    const result = await provider.provideDefinition(
      document,
      new vscode.Position(0, 0),
      tokenSource.token
    );

    assert.ok(result, 'Expected result array');
    assert.strictEqual(result?.length, 0, 'Expected no definitions');
  });

  test('returns multiple definitions for overloaded symbol', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module a; wire x; endmodule', 'module b; wire x; endmodule'].join('\n'),
    });

    const range1 = new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 16));
    const range2 = new vscode.Range(new vscode.Position(1, 10), new vscode.Position(1, 16));

    const definitionLinks: vscode.DefinitionLink[] = [
      {
        targetUri: document.uri,
        targetRange: range1,
        targetSelectionRange: range1,
      },
      {
        targetUri: document.uri,
        targetRange: range2,
        targetSelectionRange: range2,
      },
    ];

    const ctagsManager = {
      findSymbol: async () => definitionLinks,
    } as unknown as CtagsManager;

    const provider = new VerilogDefinitionProvider(ctagsManager);
    const tokenSource = new vscode.CancellationTokenSource();

    const result = await provider.provideDefinition(
      document,
      new vscode.Position(0, 12),
      tokenSource.token
    );

    assert.ok(result, 'Expected definition result');
    assert.strictEqual(result?.length, 2, 'Expected two definitions');
  });
});
