// SPDX-License-Identifier: MIT
import {
  configure,
  getLogger as getLogTapeLogger,
  reset,
  type Logger,
} from '@logtape/logtape';
import { createVSCodeSink, type VSCodeSink } from './logtape-vscode-sink';

export const ROOT_LOGGER_CATEGORY = 'Verilog';

let vscodeSink: VSCodeSink | undefined;
let configured = false;

/**
 * Initializes LogTape with the VS Code sink. Safe to call multiple times.
 */
export async function bootstrapLogging(): Promise<void> {
  if (configured) {
    return;
  }
  vscodeSink = createVSCodeSink(ROOT_LOGGER_CATEGORY);
  await configure({
    sinks: { vscode: vscodeSink },
    filters: {},
    loggers: [{ category: [ROOT_LOGGER_CATEGORY], level: 'debug', sinks: ['vscode'] }],
  });
  configured = true;
}

/**
 * Disposes logging resources and resets LogTape configuration.
 */
export async function disposeLogging(): Promise<void> {
  await reset();
  vscodeSink?.dispose();
  vscodeSink = undefined;
  configured = false;
}

/**
 * Returns a LogTape logger for the extension with the given category suffixes.
 *
 * @param category - Category suffixes to append to the root logger category.
 *                   Use hierarchical categories for consistent organization.
 * @returns A LogTape Logger instance for structured logging.
 *
 * @example
 * // In a class (use hierarchical categories):
 * class LintManager {
 *   private readonly logger = getExtensionLogger('Linter', 'Manager');
 *   // Output: [Linter/Manager] message
 * }
 *
 * @example
 * // For providers:
 * class VerilogHoverProvider {
 *   private readonly logger = getExtensionLogger('Provider', 'Hover');
 *   // Output: [Provider/Hover] message
 * }
 *
 * @example
 * // In a top-level function (use lazy evaluation to avoid initialization issues):
 * const logger = () => getExtensionLogger('Command', 'ModuleInstantiation');
 * // Output: [Command/ModuleInstantiation] message
 *
 * @example
 * // Root logger (no category suffix):
 * const logger = getExtensionLogger();
 * // Output: message (no prefix)
 */
export function getExtensionLogger(...category: string[]): Logger {
  return getLogTapeLogger([ROOT_LOGGER_CATEGORY, ...category]);
}
