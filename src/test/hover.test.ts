// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { VerilogHoverProvider } from '../providers/HoverProvider';
import { CtagsManager } from '../ctags';
import { createLogger } from '../logger';

suite('Hover Provider', () => {
  test('returns hover content for symbol definition', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: ['module top;', 'endmodule'].join('\n'),
    });

    const targetRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, Number.MAX_VALUE)
    );
    const ctagsManager = {
      findSymbol: async () => [
        {
          targetUri: document.uri,
          targetRange,
          targetSelectionRange: targetRange,
        },
      ],
    } as unknown as CtagsManager;

    const provider = new VerilogHoverProvider(createLogger('HoverTest'), ctagsManager);
    const hover = await provider.provideHover(
      document,
      new vscode.Position(0, 8),
      new vscode.CancellationTokenSource().token
    );

    assert.ok(hover, 'Expected hover to be returned');
    const contents = Array.isArray(hover?.contents) ? hover?.contents : [hover?.contents];
    const markdown = contents.find(
      (item): item is vscode.MarkdownString => item instanceof vscode.MarkdownString
    );
    assert.ok(markdown, 'Expected MarkdownString hover content');
    assert.ok(markdown?.value.includes('module top'), 'Hover should include definition text');
  });
});
