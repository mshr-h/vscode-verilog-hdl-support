// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import { SystemVerilogFormatProvider } from '../providers/FormatProvider';
import { createLogger } from '../logger';

suite('Formatting', () => {
  test('verible-verilog-format formats via configured binary', async function () {
    const veriblePath = which.sync('verible-verilog-format', { nothrow: true });
    if (!veriblePath) {
      this.skip();
      return;
    }

    const formatConfig = vscode.workspace.getConfiguration('verilog.formatting.systemVerilog');
    const veribleConfig = vscode.workspace.getConfiguration(
      'verilog.formatting.veribleVerilogFormatter'
    );
    const previousFormatter = formatConfig.get('formatter');
    const previousPath = veribleConfig.get('path');
    const previousArgs = veribleConfig.get('arguments');
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verible-test-'));
    const tempFilePath = path.join(tempRoot, 'input.sv');

    try {
      await formatConfig.update(
        'formatter',
        'verible-verilog-format',
        vscode.ConfigurationTarget.Global
      );
      await veribleConfig.update('path', veriblePath, vscode.ConfigurationTarget.Global);
      await veribleConfig.update('arguments', '', vscode.ConfigurationTarget.Global);

      const input = 'module   m;endmodule';
      fs.writeFileSync(tempFilePath, input);
      execFileSync(veriblePath, ['--inplace', tempFilePath]);
      const expected = fs.readFileSync(tempFilePath, 'utf8');

      const document = await vscode.workspace.openTextDocument({
        language: 'systemverilog',
        content: input,
      });

      const provider = new SystemVerilogFormatProvider(createLogger('FormatTest'));
      const tokenSource = new vscode.CancellationTokenSource();
      const edits = await provider.provideDocumentFormattingEdits(
        document,
        { insertSpaces: true, tabSize: 2 },
        tokenSource.token
      );

      assert.strictEqual(edits?.length, 1);
      assert.strictEqual(edits?.[0].newText, expected);
    } finally {
      await formatConfig.update(
        'formatter',
        previousFormatter,
        vscode.ConfigurationTarget.Global
      );
      await veribleConfig.update('path', previousPath, vscode.ConfigurationTarget.Global);
      await veribleConfig.update('arguments', previousArgs, vscode.ConfigurationTarget.Global);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
