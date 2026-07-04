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

  test('extension should register slang-server commands', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('verilog.restartSlangServer'));
    assert.ok(commands.includes('verilog.showSlangServerOutput'));
    assert.ok(commands.includes('verilog.showSlangServerStatus'));
    assert.ok(commands.includes('verilog.selectSlangServerRuntime'));
    assert.ok(commands.includes('verilog.showSlangServerQuickActions'));
    assert.ok(commands.includes('verilog.configureSlangProject'));
    assert.ok(commands.includes('verilog.openSlangProjectConfig'));
    assert.ok(commands.includes('verilog.validateSlangProjectConfig'));
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

  test('extension should register only slang-backed HDL Explorer commands', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('verilog.refreshHdlExplorer'));
    assert.ok(commands.includes('verilog.setSlangBuildFile'));
    assert.ok(commands.includes('verilog.setSlangTopLevel'));
    assert.ok(commands.includes('verilog.openModuleFromExplorer'));
    assert.ok(commands.includes('verilog.instantiateModule'));
    assert.ok(commands.includes('verilog.instantiateModuleFromExplorer'));
    assert.ok(commands.includes('verilog.showHierarchyFromModule'));
    assert.ok(commands.includes('verilog.findModuleReferencesFromExplorer'));
    assert.ok(commands.includes('verilog.openInstanceFromExplorer'));

    assert.ok(!commands.includes('verilog.reloadProject'));
  });

  test('package should contribute slang settings and remove legacy settings', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(getRepositoryRoot(), 'package.json'), 'utf8')
    ) as {
      extensionPack?: string[];
      contributes: { configuration: Array<{ properties: Record<string, unknown> }> };
    };
    assert.ok(packageJson.extensionPack?.includes('ms-vscode.wasm-wasi-core'));

    const properties = Object.assign(
      {},
      ...packageJson.contributes.configuration.map((configuration) => configuration.properties)
    ) as Record<string, unknown>;

    const enabled = properties['verilog.slangServer.enabled'] as { default?: unknown };
    const runtime = properties['verilog.slangServer.runtime'] as { default?: unknown };
    assert.ok(enabled);
    assert.strictEqual(enabled.default, true);
    assert.ok(runtime);
    assert.strictEqual(runtime.default, 'auto');
    assert.ok(properties['verilog.slangServer.path']);
    assert.ok(properties['verilog.slangServer.args']);
    assert.ok(properties['verilog.slangServer.trace.server']);
    assert.ok(properties['verilog.slangServer.wasm.allowUserConfig']);
    assert.ok(properties['verilog.slangServer.wasm.logStderr']);
    assert.ok(properties['verilog.slangServer.wasm.memoryLimitMb']);
    assert.ok(properties['verilog.hdlExplorer.enabled']);
    const runOnOpen = properties['verilog.linting.runOnOpen'] as { default?: unknown };
    const runOnSave = properties['verilog.linting.runOnSave'] as { default?: unknown };
    assert.ok(runOnOpen);
    assert.strictEqual(runOnOpen.default, true);
    assert.ok(runOnSave);
    assert.strictEqual(runOnSave.default, true);

    for (const key of Object.keys(properties)) {
      assert.ok(!key.startsWith('verilog.project.'), key);
      assert.ok(!key.startsWith('verilog.semanticDiagnostics.'), key);
      assert.ok(!key.startsWith('verilog.ctags.'), key);
      assert.ok(!key.startsWith('verilog.completion.'), key);
      assert.ok(!key.startsWith('verilog.references.'), key);
      assert.ok(!key.startsWith('verilog.codeActions.'), key);
      assert.ok(!key.startsWith('verilog.instantiate.'), key);
    }
  });

  test('package should contribute HDL Explorer view', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(getRepositoryRoot(), 'package.json'), 'utf8')
    ) as {
      contributes: { views: { explorer: Array<{ id: string; name: string }> } };
    };

    assert.ok(packageJson.contributes.views.explorer.some((view) => view.id === 'verilog.hdlExplorer'));
  });

  test('package should contribute HDL Explorer context menus', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(getRepositoryRoot(), 'package.json'), 'utf8')
    ) as {
      contributes: {
        menus: {
          'view/item/context': Array<{ command: string; when: string }>;
          'view/title': Array<{ command: string; when: string; group: string }>;
        };
      };
    };

    const itemMenus = packageJson.contributes.menus['view/item/context'];
    const titleMenus = packageJson.contributes.menus['view/title'];
    assert.ok(itemMenus.some((menu) =>
      menu.command === 'verilog.openModuleFromExplorer' &&
      menu.when.includes('viewItem == hdlExplorer.module')
    ));
    assert.ok(itemMenus.some((menu) =>
      menu.command === 'verilog.setSlangTopLevel' &&
      menu.when.includes('viewItem == hdlExplorer.module')
    ));
    assert.ok(itemMenus.some((menu) =>
      menu.command === 'verilog.instantiateModuleFromExplorer' &&
      menu.when.includes('viewItem == hdlExplorer.module')
    ));
    assert.ok(itemMenus.some((menu) =>
      menu.command === 'verilog.openInstanceFromExplorer' &&
      menu.when.includes('viewItem == hdlExplorer.instance')
    ));
    assert.deepStrictEqual(
      titleMenus
        .filter((menu) => menu.when === 'view == verilog.hdlExplorer' && menu.group === 'navigation')
        .map((menu) => menu.command),
      ['verilog.refreshHdlExplorer']
    );
  });

  test('slang-backed module instantiation does not import legacy intelligence', () => {
    const source = fs.readFileSync(
      path.join(getRepositoryRoot(), 'src', 'slangServer', 'SlangModuleInstantiationService.ts'),
      'utf8'
    );
    assert.ok(!source.includes('../semantic/'));
    assert.ok(!source.includes('../project/'));
    assert.ok(!source.includes('../hdl/'));
    assert.ok(!source.includes('../ctags'));
  });
});
