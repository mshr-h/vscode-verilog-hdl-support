// SPDX-License-Identifier: MIT
import GenericExternalLinter from './GenericExternalLinter';
import LinterDiagnosticManager from './LinterDiagnosticManager';
import LintRunManager from './LintRunManager';
import { getLinterSpec, type LinterExecutionSpec } from '../tools/metadata';
export {
  buildXvlogArgs,
  parseXvlogDiagnostics,
  type BuildXvlogArgsOptions,
} from './genericLintParsers';

function getSpec(): LinterExecutionSpec {
  const spec = getLinterSpec('xvlog');
  if (!spec) {
    throw new Error('Missing xvlog linter spec');
  }
  return spec;
}

export default class XvlogLinter extends GenericExternalLinter {
  constructor(diagnosticManager: LinterDiagnosticManager, runManager: LintRunManager) {
    super(getSpec(), diagnosticManager, runManager);
  }
}
