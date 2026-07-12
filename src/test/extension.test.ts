// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getRepositoryRoot } from './pathTestUtils';

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

  test('extension should register verilog.openWaveform command', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('verilog.openWaveform'),
      'verilog.openWaveform command should be registered'
    );
  });

  test('extension should register verilog.doctor command', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('verilog.doctor'),
      'verilog.doctor command should be registered'
    );
  });

  test('package contributes the classic commands and settings only', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(getRepositoryRoot(), 'package.json'), 'utf8')
    ) as {
      extensionPack?: string[];
      contributes: {
        commands: Array<{ command: string }>;
        configuration: Array<{ properties: Record<string, unknown> }>;
        views?: unknown;
        menus?: unknown;
      };
    };

    assert.strictEqual(packageJson.extensionPack, undefined);
    assert.deepStrictEqual(
      packageJson.contributes.commands.map(({ command }) => command),
      [
        'verilog.instantiateModule',
        'verilog.lint',
        'verilog.doctor',
        'verilog.openFliplot',
        'verilog.openWaveform',
      ]
    );
    assert.strictEqual(packageJson.contributes.views, undefined);
    assert.strictEqual(packageJson.contributes.menus, undefined);

    const properties = Object.assign(
      {},
      ...packageJson.contributes.configuration.map(({ properties }) => properties)
    ) as Record<string, unknown>;
    for (const key of [
      'verilog.ctags.enabled',
      'verilog.ctags.path',
      'verilog.languageServer.svls.enabled',
      'verilog.languageServer.veridian.enabled',
      'verilog.languageServer.hdlChecker.enabled',
      'verilog.languageServer.veribleVerilogLs.enabled',
      'verilog.languageServer.rustHdl.enabled',
      'verilog.languageServer.tclsp.enabled',
    ]) {
      assert.ok(properties[key], `Expected classic setting ${key}`);
    }

    for (const key of Object.keys(properties)) {
      assert.ok(!key.startsWith('verilog.project.'), key);
      assert.ok(!key.startsWith('verilog.semanticDiagnostics.'), key);
      assert.ok(!key.startsWith('verilog.hierarchy.'), key);
      assert.ok(!key.startsWith('verilog.slangServer.'), key);
      assert.ok(!key.startsWith('verilog.hdlExplorer.'), key);
    }
    assert.strictEqual(properties['verilog.linting.runOnOpen'], undefined);
    assert.strictEqual(properties['verilog.linting.runOnSave'], undefined);
  });

  test('post-v1.25 runtime directories are absent', () => {
    const root = getRepositoryRoot();
    for (const directory of [
      'src/project',
      'src/semantic',
      'src/hierarchy',
      'src/filelist',
      'src/slangServer',
      'src/views',
    ]) {
      assert.ok(!fs.existsSync(path.join(root, directory)), `${directory} must be absent`);
    }
  });
});
