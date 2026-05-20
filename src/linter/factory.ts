// SPDX-License-Identifier: MIT
import type * as vscode from 'vscode';
import BaseLinter from './BaseLinter';
import GenericExternalLinter from './GenericExternalLinter';
import SlangLinter from './SlangLinter';
import VerilatorLinter from './VerilatorLinter';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager from './LintRunManager';
import { linterSpecs, type LinterExecutionSpec } from '../tools/metadata';

type LinterConstructor = new (
  diagnosticManager: LinterDiagnosticManager,
  runManager: LintRunManager
) => BaseLinter;

const linterConstructors = new Map<string, LinterConstructor>([
  ['verilator', VerilatorLinter],
  ['slang', SlangLinter],
]);

export function getLinterSpecs(): readonly LinterExecutionSpec[] {
  return linterSpecs;
}

export function createLinterById(
  id: string,
  diagnosticManager: LinterDiagnosticManager,
  runManager: LintRunManager
): BaseLinter | null {
  const spec = linterSpecs.find((candidate) => candidate.id === id);
  if (!spec) {
    return null;
  }
  if (spec.executionMode === 'generic') {
    return new GenericExternalLinter(spec, diagnosticManager, runManager);
  }
  const Linter = linterConstructors.get(id);
  return Linter ? new Linter(diagnosticManager, runManager) : null;
}

export function getLinterQuickPickItems(): vscode.QuickPickItem[] {
  return linterSpecs.map((spec) => ({
    label: spec.id,
    description: spec.description,
  }));
}
