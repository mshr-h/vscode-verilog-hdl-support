// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
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

  test('extension should register project commands', async function () {
    this.timeout(10000);
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'Extension should be present');

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('verilog.reloadProject'));
    assert.ok(commands.includes('verilog.showProjectStatus'));
    assert.ok(commands.includes('verilog.showProjectModules'));
    assert.ok(commands.includes('verilog.refreshHierarchy'));
    assert.ok(commands.includes('verilog.refreshHdlExplorer'));
    assert.ok(commands.includes('verilog.openModuleFromExplorer'));
    assert.ok(commands.includes('verilog.openInstanceFromExplorer'));
  });

  test('package should contribute project settings', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ) as {
      contributes: { configuration: Array<{ properties: Record<string, unknown> }> };
    };
    const properties = Object.assign(
      {},
      ...packageJson.contributes.configuration.map((configuration) => configuration.properties)
    ) as Record<string, unknown>;

    const projectEnabled = properties['verilog.project.enabled'] as { default?: unknown };
    assert.ok(projectEnabled);
    assert.strictEqual(projectEnabled.default, false);
    assert.ok(properties['verilog.project.filelists']);
    assert.ok(properties['verilog.project.activeTarget']);
    assert.ok(properties['verilog.project.topModules']);
    assert.ok(properties['verilog.project.includeDirs']);
    assert.ok(properties['verilog.project.defines']);
    assert.ok(properties['verilog.project.exclude']);
    assert.ok(properties['verilog.project.maxAutoDiscoveredFiles']);
    assert.ok(properties['verilog.hierarchy.enabled']);
    assert.ok(properties['verilog.hierarchy.maxDepth']);
    assert.ok(properties['verilog.hierarchy.showUnresolved']);
    assert.ok(properties['verilog.hdlExplorer.enabled']);
    assert.ok(properties['verilog.semanticDiagnostics.enabled']);
    assert.ok(properties['verilog.semanticDiagnostics.unresolvedModules.enabled']);
    assert.ok(properties['verilog.semanticDiagnostics.unknownPorts.enabled']);
    assert.ok(properties['verilog.semanticDiagnostics.unknownParameters.enabled']);
    assert.ok(properties['verilog.semanticDiagnostics.unresolvedIncludes.enabled']);
    assert.ok(properties['verilog.semanticDiagnostics.unresolvedMacros.enabled']);
    assert.ok(properties['verilog.semanticDiagnostics.maxFiles']);
    assert.ok(properties['verilog.instantiate.useProjectIndex']);
    assert.ok(properties['verilog.preprocessor.useProjectDefines']);
    assert.ok(properties['verilog.linting.useProjectContext']);
    assert.ok(properties['verilog.linting.mode']);
    assert.ok(properties['verilog.linting.compileUnit.maxFiles']);
    assert.ok(properties['verilog.linting.compileUnit.warnBeforeLargeRun']);
    assert.ok(properties['verilog.completion.ports.enabled']);
    assert.ok(properties['verilog.completion.parameters.enabled']);
    assert.ok(properties['verilog.completion.autoConnectPorts']);
    assert.ok(properties['verilog.completion.autoConnectParameters']);
    assert.ok(properties['verilog.codeActions.fillMissingPorts.enabled']);
    assert.ok(properties['verilog.codeActions.fillMissingParameters.enabled']);
    assert.ok(properties['verilog.codeActions.alignment.enabled']);
  });

  test('package should contribute HDL Explorer view', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ) as {
      contributes: { views: { explorer: Array<{ id: string; name: string }> } };
    };

    assert.ok(packageJson.contributes.views.explorer.some((view) => view.id === 'verilog.hdlExplorer'));
  });
});
