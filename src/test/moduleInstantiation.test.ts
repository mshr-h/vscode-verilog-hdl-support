// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import * as extension from '../extension';
import { createLogger } from '../logger';
import { instantiateModule } from '../commands/ModuleInstantiation';

suite('Module Instantiation', () => {
  test('skips instantiation when ctags is disabled', async function () {
    const ctagsConfig = vscode.workspace.getConfiguration('verilog.ctags');
    const previousEnabled = ctagsConfig.get('enabled');

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ctags-inst-disabled-'));
    const tempFilePath = path.join(tempRoot, 'mod.sv');
    const source = [
      'module my_mod (input logic clk, input logic rst);',
      'endmodule',
    ].join('\n');
    fs.writeFileSync(tempFilePath, source);

    try {
      await ctagsConfig.update('enabled', false, vscode.ConfigurationTarget.Global);

      const document = await vscode.workspace.openTextDocument(tempFilePath);
      await vscode.window.showTextDocument(document);

      const snippet = await instantiateModule(tempFilePath);
      assert.strictEqual(snippet, undefined, 'Expected no snippet when ctags is disabled');
    } finally {
      await ctagsConfig.update('enabled', previousEnabled, vscode.ConfigurationTarget.Global);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('instantiates module with parameters and ports', async function () {
    const ctagsPath = which.sync('ctags', { nothrow: true }) || which.sync('uctags', { nothrow: true });
    if (!ctagsPath) {
      this.skip();
      return;
    }
    try {
      execFileSync(ctagsPath, ['--list-kinds=SystemVerilog'], { stdio: 'ignore' });
    } catch {
      this.skip();
      return;
    }

    (extension as { logger: unknown }).logger = createLogger('ModuleInstantiationTest');

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ctags-inst-'));
    const tempFilePath = path.join(tempRoot, 'mod.sv');
    const source = [
      'module my_mod #(parameter int WIDTH = 8) (input logic clk, input logic rst);',
      'endmodule',
    ].join('\n');
    fs.writeFileSync(tempFilePath, source);

    const ctagsConfig = vscode.workspace.getConfiguration('verilog.ctags');
    const previousPath = ctagsConfig.get('path');

    try {
      await ctagsConfig.update('path', ctagsPath, vscode.ConfigurationTarget.Global);

      const document = await vscode.workspace.openTextDocument(tempFilePath);
      await vscode.window.showTextDocument(document);

      const snippet = await instantiateModule(tempFilePath);
      assert.ok(snippet, 'Expected snippet to be returned');
      const value = snippet?.value ?? '';

      assert.ok(value.includes('my_mod'), 'Snippet should include module name');
      assert.ok(value.includes('#('), 'Snippet should include parameter block');
      assert.ok(value.includes('.WIDTH'), 'Snippet should include parameter mapping');
      assert.ok(value.includes('.clk'), 'Snippet should include clk mapping');
      assert.ok(value.includes('.rst'), 'Snippet should include rst mapping');
      assert.ok(value.includes(');'), 'Snippet should include closing');
    } finally {
      await ctagsConfig.update('path', previousPath, vscode.ConfigurationTarget.Global);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
