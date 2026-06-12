// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import type { ModuleInstanceCodeActionService } from '../hdl/ModuleInstanceCodeActionService';
import { VerilogCodeActionProvider } from '../providers/CodeActionProvider';

suite('CodeActionProvider', () => {
  test('returns fill-missing actions from the service', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'foo u_foo ();',
    });
    const action = new vscode.CodeAction('Verilog: Fill Missing Ports', vscode.CodeActionKind.QuickFix);
    const provider = new VerilogCodeActionProvider({
      provideCodeActions: () => [action],
    } as unknown as ModuleInstanceCodeActionService);

    const actions = provider.provideCodeActions(
      document,
      new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0))
    );

    assert.deepStrictEqual(actions, [action]);
  });
});
