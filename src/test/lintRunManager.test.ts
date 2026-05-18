// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import LintRunManager from '../linter/LintRunManager';

suite('LintRunManager', () => {
  test('beginRun creates generation 1', () => {
    const manager = new LintRunManager();
    const owner = vscode.Uri.file('/tmp/top.v');
    const run = manager.beginRun('iverilog', owner);

    assert.strictEqual(run.generation, 1);
    assert.strictEqual(run.isCurrent(), true);
    assert.strictEqual(manager.isCurrent(run), true);
  });

  test('beginRun again for same source and owner cancels previous run', () => {
    const manager = new LintRunManager();
    const owner = vscode.Uri.file('/tmp/top.v');
    const first = manager.beginRun('iverilog', owner);
    const second = manager.beginRun('iverilog', owner);

    assert.strictEqual(first.isCurrent(), false);
    assert.strictEqual(first.cancellationToken.isCancellationRequested, true);
    assert.strictEqual(second.isCurrent(), true);
    assert.ok(second.generation > first.generation);
  });

  test('different owner does not cancel current run', () => {
    const manager = new LintRunManager();
    const first = manager.beginRun('iverilog', vscode.Uri.file('/tmp/top1.v'));
    const second = manager.beginRun('iverilog', vscode.Uri.file('/tmp/top2.v'));

    assert.strictEqual(first.isCurrent(), true);
    assert.strictEqual(second.isCurrent(), true);
  });

  test('different source does not cancel current run', () => {
    const manager = new LintRunManager();
    const owner = vscode.Uri.file('/tmp/top.v');
    const first = manager.beginRun('iverilog', owner);
    const second = manager.beginRun('verilator', owner);

    assert.strictEqual(first.isCurrent(), true);
    assert.strictEqual(second.isCurrent(), true);
  });

  test('finishRun only clears the current handle', () => {
    const manager = new LintRunManager();
    const owner = vscode.Uri.file('/tmp/top.v');
    const first = manager.beginRun('iverilog', owner);
    const second = manager.beginRun('iverilog', owner);

    manager.finishRun(first);

    assert.strictEqual(second.isCurrent(), true);
    manager.finishRun(second);
    assert.strictEqual(second.isCurrent(), false);
  });

  test('cancelSource cancels only matching source', () => {
    const manager = new LintRunManager();
    const owner = vscode.Uri.file('/tmp/top.v');
    const iverilogRun = manager.beginRun('iverilog', owner);
    const verilatorRun = manager.beginRun('verilator', owner);

    manager.cancelSource('iverilog');

    assert.strictEqual(iverilogRun.isCurrent(), false);
    assert.strictEqual(iverilogRun.cancellationToken.isCancellationRequested, true);
    assert.strictEqual(verilatorRun.isCurrent(), true);
  });

  test('cancelOwner cancels all sources for that owner', () => {
    const manager = new LintRunManager();
    const owner = vscode.Uri.file('/tmp/top.v');
    const otherOwner = vscode.Uri.file('/tmp/other.v');
    const iverilogRun = manager.beginRun('iverilog', owner);
    const verilatorRun = manager.beginRun('verilator', owner);
    const otherRun = manager.beginRun('iverilog', otherOwner);

    manager.cancelOwner(owner);

    assert.strictEqual(iverilogRun.isCurrent(), false);
    assert.strictEqual(verilatorRun.isCurrent(), false);
    assert.strictEqual(otherRun.isCurrent(), true);
  });

  test('cancelAll cancels every active run', () => {
    const manager = new LintRunManager();
    const first = manager.beginRun('iverilog', vscode.Uri.file('/tmp/top1.v'));
    const second = manager.beginRun('verilator', vscode.Uri.file('/tmp/top2.v'));

    manager.cancelAll();

    assert.strictEqual(first.isCurrent(), false);
    assert.strictEqual(second.isCurrent(), false);
    assert.strictEqual(first.cancellationToken.isCancellationRequested, true);
    assert.strictEqual(second.cancellationToken.isCancellationRequested, true);
  });
});
