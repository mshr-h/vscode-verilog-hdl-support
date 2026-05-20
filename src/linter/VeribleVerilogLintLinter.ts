// SPDX-License-Identifier: MIT
import GenericExternalLinter from './GenericExternalLinter';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager from './LintRunManager';
import { getLinterSpec, type LinterExecutionSpec } from '../tools/metadata';
export {
  buildVeribleVerilogLintArgs,
  parseVeribleVerilogLintDiagnostics,
  type BuildVeribleVerilogLintArgsOptions,
  type ParseVeribleVerilogLintDiagnosticsOptions,
} from './genericLintParsers';

function getSpec(): LinterExecutionSpec {
  const spec = getLinterSpec('verible-verilog-lint');
  if (!spec) {
    throw new Error('Missing verible-verilog-lint linter spec');
  }
  return spec;
}

export default class VeribleVerilogLintLinter extends GenericExternalLinter {
  constructor(diagnosticManager: LinterDiagnosticManager, runManager: LintRunManager) {
    super(getSpec(), diagnosticManager, runManager);
  }
}
