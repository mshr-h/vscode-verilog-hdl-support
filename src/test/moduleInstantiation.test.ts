// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import {
  buildInstantiationSnippet,
  buildModuleQuickPickItems,
  instantiateModule,
  shouldShowParentDirectory,
} from '../commands/ModuleInstantiation';
import { Symbol } from '../ctags';
import type { IndexedSymbol } from '../ctagsWorkspaceIndex';

suite('Module Instantiation', () => {
  test('uses the supplied workspace root for parent navigation decisions', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ctags-inst-root-'));
    const firstRoot = path.join(tempRoot, 'first');
    const activeRoot = path.join(tempRoot, 'active');
    const activeDir = path.join(activeRoot, 'rtl');

    try {
      fs.mkdirSync(firstRoot, { recursive: true });
      fs.mkdirSync(activeDir, { recursive: true });

      assert.strictEqual(shouldShowParentDirectory(activeRoot, activeRoot), false);
      assert.strictEqual(shouldShowParentDirectory(activeDir, activeRoot), true);
      assert.strictEqual(shouldShowParentDirectory(activeDir, firstRoot), false);
      assert.strictEqual(shouldShowParentDirectory(activeDir), false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('builds instantiation snippet with aligned parameters and ports', () => {
    const snippet = buildInstantiationSnippet(
      'my_mod',
      ['clk', 'reset_n'],
      ['WIDTH'],
      '  '
    ).value;

    assert.ok(snippet.includes('my_mod '), 'Snippet should include module name');
    assert.ok(snippet.includes('#('), 'Snippet should include parameter block');
    assert.ok(snippet.includes('  .WIDTH (WIDTH )'), 'Snippet should align parameter mapping');
    assert.ok(snippet.includes('  .clk     (clk     )'), 'Snippet should align short port');
    assert.ok(snippet.includes('  .reset_n (reset_n )'), 'Snippet should include long port');
    assert.ok(snippet.endsWith(');\n'), 'Snippet should close the instantiation');
  });

  test('builds module QuickPick items with relative file descriptions', () => {
    const workspaceRoot = path.join(os.tmpdir(), 'workspace');
    const workspaceFolder = {
      uri: vscode.Uri.file(workspaceRoot),
      name: 'workspace',
      index: 0,
    };
    const moduleSymbol: IndexedSymbol = {
      uri: vscode.Uri.file(path.join(workspaceRoot, 'rtl', 'top.sv')),
      symbol: new Symbol('top', 'module', '', 0, '', '', 0, false),
    };

    const items = buildModuleQuickPickItems([moduleSymbol], workspaceFolder);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].label, 'top');
    assert.strictEqual(items[0].description, path.join('rtl', 'top.sv'));
    assert.strictEqual(items[0].moduleSymbol, moduleSymbol);
  });

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
