// SPDX-License-Identifier: MIT
import GenericExternalLinter from './GenericExternalLinter';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager from './LintRunManager';
import { getLinterSpec, type LinterExecutionSpec } from '../tools/metadata';
export {
  buildIcarusArgs,
  parseIcarusDiagnostics,
  type BuildIcarusArgsOptions,
} from './genericLintParsers';

function getSpec(): LinterExecutionSpec {
  const spec = getLinterSpec('iverilog');
  if (!spec) {
    throw new Error('Missing iverilog linter spec');
  }
  return spec;
}

export default class IcarusLinter extends GenericExternalLinter {
  constructor(diagnosticManager: LinterDiagnosticManager, runManager: LintRunManager) {
    super(getSpec(), diagnosticManager, runManager);
  }
}
