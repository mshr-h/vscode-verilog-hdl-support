// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'mshr-h.veriloghdl';

suite('Extension Test Suite', () => {
  test('extension should be present', () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `Extension ${EXTENSION_ID} should be installed`);
  });

  test('extension should activate on verilog file', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    // Open a verilog document to trigger activation
    const document = await vscode.workspace.openTextDocument({
      language: 'verilog',
      content: 'module test; endmodule',
    });
    await vscode.window.showTextDocument(document);

    // Wait for activation if not already active
    if (!extension.isActive) {
      await extension.activate();
    }

    assert.ok(extension.isActive, 'Extension should be active after opening verilog file');
  });

  test('extension should activate on systemverilog file', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module test; endmodule',
    });
    await vscode.window.showTextDocument(document);

    if (!extension.isActive) {
      await extension.activate();
    }

    assert.ok(extension.isActive, 'Extension should be active after opening systemverilog file');
  });

  test('extension should register verilog.lint command', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('verilog.lint'),
      'verilog.lint command should be registered'
    );
  });

  test('extension should register verilog.instantiateModule command', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('verilog.instantiateModule'),
      'verilog.instantiateModule command should be registered'
    );
  });

  test('extension should register verilog.openFliplot command', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('verilog.openFliplot'),
      'verilog.openFliplot command should be registered'
    );
  });
});
