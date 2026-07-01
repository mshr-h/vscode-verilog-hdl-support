// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import LintManager from '../linter/LintManager';
import { LogCapture } from './logTestUtils';

interface LintManagerInternals {
  linter: { name: string; dispose: () => void } | null;
  runManager: {
    cancelSource: (sourceId: string) => void;
  };
  diagnosticManager: {
    clearSource: (sourceId: string) => void;
  };
}

interface LintManagerTriggerInternals {
  lintOnOpen: (doc: vscode.TextDocument) => void;
  lintOnSave: (doc: vscode.TextDocument) => void;
}

interface FakeLinter {
  name: string;
  startLint: (doc: vscode.TextDocument, options?: unknown) => Promise<void>;
  removeFileDiagnostics: (doc: vscode.TextDocument) => void;
  dispose: () => void;
}

async function setLintConfigValue(key: string, value: unknown): Promise<unknown> {
  const config = vscode.workspace.getConfiguration('verilog.linting');
  const previous = config.inspect(key)?.globalValue;
  await config.update(key, value, vscode.ConfigurationTarget.Global);
  return previous;
}

async function restoreLintConfigValue(key: string, previous: unknown): Promise<void> {
  const config = vscode.workspace.getConfiguration('verilog.linting');
  await config.update(key, previous, vscode.ConfigurationTarget.Global);
}

async function setConfiguredLinter(linter: string): Promise<unknown> {
  return setLintConfigValue('linter', linter);
}

async function restoreConfiguredLinter(previous: unknown): Promise<void> {
  await restoreLintConfigValue('linter', previous);
}

function createVerilogDocument(): Thenable<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({
    language: 'verilog',
    content: 'module test; endmodule',
  });
}

async function createVisibleVerilogDocument(): Promise<vscode.TextDocument> {
  const document = await createVerilogDocument();
  await vscode.window.showTextDocument(document);
  return document;
}

function stubConfiguredLinter(fakeLinter: FakeLinter): () => void {
  const original = LintManager.prototype.getLinterFromString;
  LintManager.prototype.getLinterFromString = () =>
    fakeLinter as unknown as ReturnType<LintManager['getLinterFromString']>;
  return () => {
    LintManager.prototype.getLinterFromString = original;
  };
}

suite('LintManager', function () {
  this.timeout(10000);

  const logCapture = new LogCapture();

  suiteSetup(async () => {
    await logCapture.setup();
  });

  suiteTeardown(async () => {
    await logCapture.teardown();
  });

  setup(() => {
    logCapture.clear();
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('treats none as a no-op linter without invalid warning', async () => {
    const previous = await setConfiguredLinter('none');
    logCapture.clear();
    const manager = new LintManager();

    try {
      manager.configLinter();
      const internals = manager as unknown as LintManagerInternals;

      assert.strictEqual(internals.linter, null);
      assert.ok(!logCapture.hasWarning('Invalid linter name'));
    } finally {
      manager.dispose();
      await restoreConfiguredLinter(previous);
    }
  });

  test('cleans up previous linter when switching to none', async () => {
    const previous = await setConfiguredLinter('none');
    const manager = new LintManager();
    const internals = manager as unknown as LintManagerInternals;
    let cancelledSource: string | undefined;
    let clearedSource: string | undefined;
    let disposed = false;
    const originalCancelSource = internals.runManager.cancelSource.bind(internals.runManager);
    const originalClearSource = internals.diagnosticManager.clearSource.bind(
      internals.diagnosticManager
    );

    internals.runManager.cancelSource = (sourceId: string) => {
      cancelledSource = sourceId;
      originalCancelSource(sourceId);
    };
    internals.diagnosticManager.clearSource = (sourceId: string) => {
      clearedSource = sourceId;
      originalClearSource(sourceId);
    };
    internals.linter = {
      name: 'iverilog',
      dispose: () => {
        disposed = true;
      },
    };

    try {
      manager.configLinter();

      assert.strictEqual(cancelledSource, 'iverilog');
      assert.strictEqual(clearedSource, 'iverilog');
      assert.strictEqual(disposed, true);
      assert.strictEqual(internals.linter, null);
    } finally {
      manager.dispose();
      await restoreConfiguredLinter(previous);
    }
  });

  test('keeps invalid linter names as warnings', async () => {
    const previous = await setConfiguredLinter('not-a-linter');
    logCapture.clear();
    const manager = new LintManager();

    try {
      manager.configLinter();

      assert.ok(logCapture.hasWarning('Invalid linter name'));
    } finally {
      manager.dispose();
      await restoreConfiguredLinter(previous);
    }
  });

  test('skips startup linting of visible editors when runOnOpen is false', async () => {
    const previousLinter = await setConfiguredLinter('iverilog');
    const previousRunOnOpen = await setLintConfigValue('runOnOpen', false);
    const lintedDocuments: vscode.TextDocument[] = [];
    const restoreGetLinter = stubConfiguredLinter({
      name: 'iverilog',
      startLint: async (doc) => {
        lintedDocuments.push(doc);
      },
      removeFileDiagnostics: () => undefined,
      dispose: () => undefined,
    });
    await createVisibleVerilogDocument();
    const manager = new LintManager();

    try {
      assert.strictEqual(lintedDocuments.length, 0);
    } finally {
      manager.dispose();
      restoreGetLinter();
      await restoreLintConfigValue('runOnOpen', previousRunOnOpen);
      await restoreConfiguredLinter(previousLinter);
    }
  });

  test('startup linting of visible editors runs when runOnOpen is true', async () => {
    const previousLinter = await setConfiguredLinter('iverilog');
    const previousRunOnOpen = await setLintConfigValue('runOnOpen', true);
    const lintedDocuments: vscode.TextDocument[] = [];
    const restoreGetLinter = stubConfiguredLinter({
      name: 'iverilog',
      startLint: async (doc) => {
        lintedDocuments.push(doc);
      },
      removeFileDiagnostics: () => undefined,
      dispose: () => undefined,
    });
    const document = await createVisibleVerilogDocument();
    const manager = new LintManager();

    try {
      assert.ok(lintedDocuments.includes(document));
    } finally {
      manager.dispose();
      restoreGetLinter();
      await restoreLintConfigValue('runOnOpen', previousRunOnOpen);
      await restoreConfiguredLinter(previousLinter);
    }
  });

  test('startup linting of visible editors runs when runOnOpen is unset', async () => {
    const previousLinter = await setConfiguredLinter('iverilog');
    const previousRunOnOpen = await setLintConfigValue('runOnOpen', undefined);
    const lintedDocuments: vscode.TextDocument[] = [];
    const restoreGetLinter = stubConfiguredLinter({
      name: 'iverilog',
      startLint: async (doc) => {
        lintedDocuments.push(doc);
      },
      removeFileDiagnostics: () => undefined,
      dispose: () => undefined,
    });
    const document = await createVisibleVerilogDocument();
    const manager = new LintManager();

    try {
      assert.ok(lintedDocuments.includes(document));
    } finally {
      manager.dispose();
      restoreGetLinter();
      await restoreLintConfigValue('runOnOpen', previousRunOnOpen);
      await restoreConfiguredLinter(previousLinter);
    }
  });

  test('lint-on-open follows runOnOpen setting', async () => {
    const previousLinter = await setConfiguredLinter('iverilog');
    const previousRunOnOpen = await setLintConfigValue('runOnOpen', false);
    const lintedDocuments: vscode.TextDocument[] = [];
    const restoreGetLinter = stubConfiguredLinter({
      name: 'iverilog',
      startLint: async (doc) => {
        lintedDocuments.push(doc);
      },
      removeFileDiagnostics: () => undefined,
      dispose: () => undefined,
    });
    const document = await createVerilogDocument();
    const manager = new LintManager();

    try {
      (manager as unknown as LintManagerTriggerInternals).lintOnOpen(document);
      assert.strictEqual(lintedDocuments.length, 0);

      await setLintConfigValue('runOnOpen', true);
      (manager as unknown as LintManagerTriggerInternals).lintOnOpen(document);
      assert.deepStrictEqual(lintedDocuments, [document]);
    } finally {
      manager.dispose();
      restoreGetLinter();
      await restoreLintConfigValue('runOnOpen', previousRunOnOpen);
      await restoreConfiguredLinter(previousLinter);
    }
  });

  test('lint-on-save follows runOnSave setting', async () => {
    const previousLinter = await setConfiguredLinter('iverilog');
    const previousRunOnSave = await setLintConfigValue('runOnSave', false);
    const lintedDocuments: vscode.TextDocument[] = [];
    const restoreGetLinter = stubConfiguredLinter({
      name: 'iverilog',
      startLint: async (doc) => {
        lintedDocuments.push(doc);
      },
      removeFileDiagnostics: () => undefined,
      dispose: () => undefined,
    });
    const document = await createVerilogDocument();
    const manager = new LintManager();

    try {
      (manager as unknown as LintManagerTriggerInternals).lintOnSave(document);
      assert.strictEqual(lintedDocuments.length, 0);

      await setLintConfigValue('runOnSave', true);
      (manager as unknown as LintManagerTriggerInternals).lintOnSave(document);
      assert.deepStrictEqual(lintedDocuments, [document]);
    } finally {
      manager.dispose();
      restoreGetLinter();
      await restoreLintConfigValue('runOnSave', previousRunOnSave);
      await restoreConfiguredLinter(previousLinter);
    }
  });

  test('manual lint ignores automatic trigger settings', async () => {
    const previousLinter = await setConfiguredLinter('iverilog');
    const previousRunOnOpen = await setLintConfigValue('runOnOpen', false);
    const previousRunOnSave = await setLintConfigValue('runOnSave', false);
    const originalShowQuickPick = vscode.window.showQuickPick;
    const lintedDocuments: vscode.TextDocument[] = [];
    const restoreGetLinter = stubConfiguredLinter({
      name: 'iverilog',
      startLint: async (doc) => {
        lintedDocuments.push(doc);
      },
      removeFileDiagnostics: () => undefined,
      dispose: () => undefined,
    });
    const document = await createVisibleVerilogDocument();
    const manager = new LintManager();
    (vscode.window as unknown as { showQuickPick: unknown }).showQuickPick = async () => ({
      label: 'iverilog',
      description: 'Icarus Verilog',
    });

    try {
      await manager.runLintTool();

      assert.deepStrictEqual(lintedDocuments, [document]);
    } finally {
      manager.dispose();
      (vscode.window as unknown as { showQuickPick: unknown }).showQuickPick = originalShowQuickPick;
      restoreGetLinter();
      await restoreLintConfigValue('runOnSave', previousRunOnSave);
      await restoreLintConfigValue('runOnOpen', previousRunOnOpen);
      await restoreConfiguredLinter(previousLinter);
    }
  });
});
