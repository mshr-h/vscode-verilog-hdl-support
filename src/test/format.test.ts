// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import { buildVerilogFormatArgs, SystemVerilogFormatProvider } from '../providers/FormatProvider';

suite('Formatting', () => {
  test('verilog-format settings path is expanded when the file exists', () => {
    process.env.VERILOG_FORMAT_TEST_HOME = path.join(os.tmpdir(), 'format home');
    const settingsPath = path.join(
      process.env.VERILOG_FORMAT_TEST_HOME,
      '.verilog-format.properties'
    );
    const args = buildVerilogFormatArgs(
      '/tmp/input.v',
      '${env:VERILOG_FORMAT_TEST_HOME}/.verilog-format.properties',
      undefined,
      (candidate) => candidate === settingsPath
    );

    assert.deepStrictEqual(args, ['-f', '/tmp/input.v', '-s', settingsPath]);
  });

  test('verilog-format settings argument is omitted when the file is missing', () => {
    const args = buildVerilogFormatArgs(
      '/tmp/input.v',
      '~/.verilog-format.properties',
      undefined,
      () => false
    );

    assert.deepStrictEqual(args, ['-f', '/tmp/input.v']);
  });

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

      const provider = new SystemVerilogFormatProvider();
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
