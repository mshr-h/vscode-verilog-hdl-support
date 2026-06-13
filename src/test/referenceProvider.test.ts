// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import type { ReferenceService } from '../hdl/ReferenceService';
import { VerilogReferenceProvider } from '../providers/ReferenceProvider';

suite('ReferenceProvider', () => {
  test('returns references from the service', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const location = new vscode.Location(document.uri, new vscode.Range(0, 7, 0, 10));
    const provider = new VerilogReferenceProvider({
      provideReferences: async () => [location],
    } as unknown as ReferenceService);

    const result = await provider.provideReferences(
      document,
      new vscode.Position(0, 8),
      { includeDeclaration: true },
      new vscode.CancellationTokenSource().token
    );

    assert.deepStrictEqual(result, [location]);
  });
});
