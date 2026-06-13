// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import which from 'which';
import { instantiateModule, shouldShowParentDirectory } from '../commands/ModuleInstantiation';
import {
  buildModuleInstantiationSnippet,
  InstantiationService,
} from '../hdl/InstantiationService';
import type { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, ParameterRecord, PortRecord } from '../semantic/SymbolRecords';

suite('Module Instantiation', () => {
  test('builds project-index snippet with parameters and ports', () => {
    const snippet = buildModuleInstantiationSnippet(
      createModuleRecord('my_mod', ['WIDTH'], ['clk', 'rst_n'])
    );
    const value = snippet.value;

    assert.ok(value.includes('my_mod'));
    assert.ok(value.includes('#('));
    assert.ok(value.includes('.WIDTH'));
    assert.ok(value.includes('.clk  '), 'Snippet should align shorter port names');
    assert.ok(value.includes('.rst_n'));
    assert.ok(value.includes(');'));
  });

  test('uses project index module selection when available', async function () {
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: '',
    });
    const editor = await vscode.window.showTextDocument(document);
    const moduleRecord = createModuleRecord('idx_mod', ['WIDTH'], ['clk']);
    const service = new InstantiationService({
      getIndex: () => new SemanticIndex(1, [moduleRecord]),
    } as unknown as IndexService);
    const originalShowQuickPick = vscode.window.showQuickPick;
    let fallbackCalled = false;

    try {
      (vscode.window as any).showQuickPick = async (items: unknown) => {
        assert.ok(Array.isArray(items));
        return (items as Array<{ module: ModuleRecord }>)[0];
      };
      await service.instantiateModuleInteract(() => {
        fallbackCalled = true;
      });

      assert.strictEqual(fallbackCalled, false);
      assert.ok(editor.document.getText().includes('idx_mod'));
      assert.ok(editor.document.getText().includes('.WIDTH'));
      assert.ok(editor.document.getText().includes('.clk'));
    } finally {
      (vscode.window as any).showQuickPick = originalShowQuickPick;
    }
  });

  test('falls back when project index instantiation is disabled', async () => {
    const config = vscode.workspace.getConfiguration('verilog.instantiate');
    const previous = config.get('useProjectIndex');
    const service = new InstantiationService({
      getIndex: () => new SemanticIndex(1, [createModuleRecord('idx_mod', [], [])]),
    } as unknown as IndexService);
    let fallbackCalled = false;

    try {
      await config.update('useProjectIndex', false, vscode.ConfigurationTarget.Global);
      await service.instantiateModuleInteract(() => {
        fallbackCalled = true;
      });

      assert.strictEqual(fallbackCalled, true);
    } finally {
      await config.update('useProjectIndex', previous, vscode.ConfigurationTarget.Global);
    }
  });

  test('falls back when project index has no modules', async () => {
    const service = new InstantiationService({
      getIndex: () => new SemanticIndex(1, []),
    } as unknown as IndexService);
    let fallbackCalled = false;

    await service.instantiateModuleInteract(() => {
      fallbackCalled = true;
    });

    assert.strictEqual(fallbackCalled, true);
  });

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
      cleanupTempRoot(tempRoot);
    }
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
      await cleanupTempRootAfterEditorUse(tempRoot);
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
      await cleanupTempRootAfterEditorUse(tempRoot);
    }
  });
});

async function cleanupTempRootAfterEditorUse(tempRoot: string): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  cleanupTempRoot(tempRoot);
}

function cleanupTempRoot(tempRoot: string): void {
  try {
    fs.rmSync(tempRoot, {
      recursive: true,
      force: true,
      maxRetries: process.platform === 'win32' ? 10 : 0,
      retryDelay: 100,
    });
  } catch (err) {
    if (process.platform !== 'win32') {
      throw err;
    }
  }
}

function createModuleRecord(name: string, parameterNames: string[], portNames: string[]): ModuleRecord {
  const uri = vscode.Uri.file(`/workspace/${name}.sv`);
  const selectionRange = new vscode.Range(0, 7, 0, 7 + name.length);
  const base = {
    id: `unit:${name}`,
    name,
    uri,
    range: selectionRange,
    selectionRange,
    containerName: name,
    compileUnitId: 'unit',
  };
  return {
    ...base,
    kind: 'module',
    parameters: parameterNames.map((parameterName): ParameterRecord => ({
      ...base,
      id: `unit:${name}:parameter:${parameterName}`,
      name: parameterName,
      kind: 'parameter',
      containerName: name,
    })),
    ports: portNames.map((portName): PortRecord => ({
      ...base,
      id: `unit:${name}:port:${portName}`,
      name: portName,
      kind: 'port',
      containerName: name,
    })),
  };
}
