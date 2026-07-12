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

async function setConfiguredLinter(linter: string): Promise<unknown> {
  const config = vscode.workspace.getConfiguration('verilog.linting');
  const previous = config.get('linter');
  await config.update('linter', linter, vscode.ConfigurationTarget.Global);
  return previous;
}

async function restoreConfiguredLinter(previous: unknown): Promise<void> {
  const config = vscode.workspace.getConfiguration('verilog.linting');
  await config.update('linter', previous, vscode.ConfigurationTarget.Global);
}

suite('LintManager', () => {
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
});
