import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('VerilogDocumentSymbolProvider', () => {
  test('returns symbols for simple verilog file', async () => {
    const filePath = path.resolve(__dirname, '../../../language_examples/verilog_building_block/rtl/ram_sp.v');
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    await vscode.workspace.getConfiguration('verilog').update('ctags.path', 'ctags', vscode.ConfigurationTarget.Global);

    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      document.uri
    );

    assert.ok(symbols && symbols.length > 0, 'Expected at least one document symbol');
  });
});
