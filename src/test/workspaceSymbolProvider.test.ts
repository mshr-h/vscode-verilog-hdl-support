// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { VerilogWorkspaceSymbolProvider } from '../providers/WorkspaceSymbolProvider';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { SymbolRecord, SymbolRecordKind } from '../semantic/SymbolRecords';

suite('WorkspaceSymbolProvider', () => {
  test('maps project index records to workspace symbols', async () => {
    const provider = createProvider([
      createSymbol('top', 'module'),
      createSymbol('pkg', 'package'),
      createSymbol('SIM', 'macro'),
      createSymbol('ifc', 'interface'),
      createSymbol('klass', 'class'),
      createSymbol('word_t', 'typedef'),
      createSymbol('clk', 'port'),
    ]);

    const result = await provider.provideWorkspaceSymbols('', new vscode.CancellationTokenSource().token);

    assert.ok(result);
    assert.deepStrictEqual(result.map((symbol) => symbol.name), [
      'top',
      'pkg',
      'SIM',
      'ifc',
      'klass',
      'word_t',
    ]);
    assert.strictEqual(result[0]?.kind, vscode.SymbolKind.Module);
    assert.strictEqual(result[1]?.kind, vscode.SymbolKind.Package);
    assert.strictEqual(result[2]?.kind, vscode.SymbolKind.Constant);
  });

  test('filters workspace symbols by query', async () => {
    const provider = createProvider([
      createSymbol('uart_rx', 'module'),
      createSymbol('spi_rx', 'module'),
      createSymbol('uart_pkg', 'package'),
    ]);

    const result = await provider.provideWorkspaceSymbols('uart', new vscode.CancellationTokenSource().token);

    assert.ok(result);
    assert.deepStrictEqual(result.map((symbol) => symbol.name), ['uart_rx', 'uart_pkg']);
  });

  test('returns empty results for empty index', async () => {
    const provider = createProvider([]);

    const result = await provider.provideWorkspaceSymbols('', new vscode.CancellationTokenSource().token);

    assert.deepStrictEqual(result, []);
  });
});

function createProvider(symbols: SymbolRecord[]): VerilogWorkspaceSymbolProvider {
  return new VerilogWorkspaceSymbolProvider({
    getIndex: () => new SemanticIndex(1, symbols),
  } as unknown as IndexService);
}

function createSymbol(name: string, kind: SymbolRecordKind): SymbolRecord {
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
