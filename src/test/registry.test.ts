// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import LinterDiagnosticManager from '../linter/LinterDiagnosticManager';
import LintRunManager from '../linter/LintRunManager';
import { createLinterById, getLinterQuickPickItems, getLinterSpecs } from '../linter/factory';
import { formatterSpecs, languageServerSpecs } from '../tools/metadata';

suite('External tool registry', () => {
  test('contains expected linter ids', () => {
    assert.deepStrictEqual(
      getLinterSpecs().map((spec) => spec.id).sort(),
      ['iverilog', 'modelsim', 'slang', 'verible-verilog-lint', 'verilator', 'xvlog'].sort()
    );
  });

  test('contains expected formatter ids', () => {
    assert.deepStrictEqual(
      formatterSpecs.map((spec) => spec.id).sort(),
      ['iStyle', 'verible-verilog-format', 'verilog-format'].sort()
    );
  });

  test('contains expected language server ids', () => {
    assert.deepStrictEqual(
      languageServerSpecs.map((spec) => spec.id).sort(),
      ['hdlChecker', 'rustHdl', 'svls', 'tclsp', 'veribleVerilogLs', 'veridian'].sort()
    );
  });

  test('linter factory creates known linters and returns null for unknown ids', () => {
    const diagnostics = {
      clearOwner: () => undefined,
      replaceRunDiagnostics: () => undefined,
    } as unknown as LinterDiagnosticManager;
    const runs = new LintRunManager();

    const linter = createLinterById('iverilog', diagnostics, runs);
    try {
      assert.ok(linter);
      assert.strictEqual(linter?.name, 'iverilog');
      assert.strictEqual(createLinterById('unknown', diagnostics, runs), null);
    } finally {
      linter?.dispose();
      runs.cancelAll();
    }
  });

  test('QuickPick entries are generated from registry metadata', () => {
    assert.deepStrictEqual(
      getLinterQuickPickItems().map((item) => [item.label, item.description]),
      getLinterSpecs().map((spec) => [spec.id, spec.description])
    );
  });
});
