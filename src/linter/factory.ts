// SPDX-License-Identifier: MIT
import type * as vscode from 'vscode';
import BaseLinter from './BaseLinter';
import IcarusLinter from './IcarusLinter';
import ModelsimLinter from './ModelsimLinter';
import SlangLinter from './SlangLinter';
import VeribleVerilogLintLinter from './VeribleVerilogLintLinter';
import VerilatorLinter from './VerilatorLinter';
import XvlogLinter from './XvlogLinter';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager from './LintRunManager';
import { linterSpecs, type LinterSpec } from '../tools/metadata';

type LinterConstructor = new (
  diagnosticManager: LinterDiagnosticManager,
  runManager: LintRunManager
) => BaseLinter;

const linterConstructors = new Map<string, LinterConstructor>([
  ['iverilog', IcarusLinter],
  ['xvlog', XvlogLinter],
  ['modelsim', ModelsimLinter],
  ['verilator', VerilatorLinter],
  ['slang', SlangLinter],
  ['verible-verilog-lint', VeribleVerilogLintLinter],
]);

export function getLinterSpecs(): readonly LinterSpec[] {
  return linterSpecs;
}

export function createLinterById(
  id: string,
  diagnosticManager: LinterDiagnosticManager,
  runManager: LintRunManager
): BaseLinter | null {
  const Linter = linterConstructors.get(id);
  return Linter ? new Linter(diagnosticManager, runManager) : null;
}

export function getLinterQuickPickItems(): vscode.QuickPickItem[] {
  return linterSpecs.map((spec) => ({
    label: spec.id,
    description: spec.description,
  }));
}
