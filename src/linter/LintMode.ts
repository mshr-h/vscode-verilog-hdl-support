// SPDX-License-Identifier: MIT
export type LintRunTrigger = 'automatic' | 'manual';

export interface LintRunOptions {
  trigger: LintRunTrigger;
}
