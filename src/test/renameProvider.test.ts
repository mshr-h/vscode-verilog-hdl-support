// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import type { RenameService } from '../hdl/RenameService';
import { VerilogRenameProvider } from '../providers/RenameProvider';

suite('RenameProvider', () => {
  test('returns prepare rename and edits from the service', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const range = new vscode.Range(0, 7, 0, 10);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, 'renamed');
    const provider = new VerilogRenameProvider({
      prepareRename: async () => ({ range, placeholder: 'top' }),
      provideRenameEdits: async () => edit,
    } as unknown as RenameService);

    const prepared = await provider.prepareRename(
      document,
      new vscode.Position(0, 8),
      new vscode.CancellationTokenSource().token
    );
    const result = await provider.provideRenameEdits(
      document,
      new vscode.Position(0, 8),
      'renamed',
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(prepared, { range, placeholder: 'top' });
    assert.strictEqual(result, edit);
  });
});
