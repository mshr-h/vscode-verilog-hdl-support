// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { LogRecord, Sink } from '@logtape/logtape';

/**
 * A VS Code OutputChannel that can be used as a LogTape sink.
 * Provides the show() method to reveal the output panel.
 */
export interface VSCodeSink extends Sink {
  /** Reveals the output channel in the VS Code panel. */
  show(): void;
  /** Disposes the output channel. */
  dispose(): void;
}

/**
 * Formats a LogTape log record's message parts into a single string.
 * @param record - The log record to format
 * @returns The formatted message string
 */
function formatMessage(record: LogRecord): string {
  return record.message
    .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
    .join('');
}

/**
 * Formats structured properties from a log record.
 * @param properties - The properties object from the log record
 * @returns The formatted properties string, or empty string if no properties
 */
function formatProperties(properties: Record<string, unknown>): string {
  const keys = Object.keys(properties);
  if (keys.length === 0) {
    return '';
  }
  const formatted = keys
    .map((key) => {
      const value = properties[key];
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      return `${key}=${valueStr}`;
    })
    .join(' ');
  return ` {${formatted}}`;
}

/**
 * Formats the category prefix for log messages.
 * Skips the root category (first element) and wraps remaining categories in brackets.
 * @param category - The category array from the log record
 * @returns The formatted category prefix string
 */
function formatCategoryPrefix(category: readonly string[]): string {
  if (category.length <= 1) {
    return '';
  }
  return `[${category.slice(1).join('/')}]`;
}

/**
 * Creates a LogTape sink that writes to a VS Code LogOutputChannel.
 * The sink supports all log levels including fatal (mapped to error).
 *
 * @param channelName - The name for the VS Code output channel
 * @returns A VSCodeSink that can be used with LogTape's configure()
 *
 * @example
 * ```typescript
 * import { configure } from '@logtape/logtape';
 * import { createVSCodeSink } from './logtape-vscode-sink';
 *
 * const vscodeChannel = createVSCodeSink('Verilog');
 * await configure({
 *   sinks: { vscode: vscodeChannel },
 *   loggers: [{ category: ['Verilog'], lowestLevel: 'debug', sinks: ['vscode'] }],
 * });
 * ```
 */
export function createVSCodeSink(channelName: string): VSCodeSink {
  const channel = vscode.window.createOutputChannel(channelName, { log: true });

  const sink = ((record: LogRecord) => {
    const categoryPrefix = formatCategoryPrefix(record.category);
    const message = formatMessage(record);
    const properties = formatProperties(record.properties);
    const formattedMessage = categoryPrefix
      ? `${categoryPrefix} ${message}${properties}`
      : `${message}${properties}`;

    switch (record.level) {
      case 'debug':
        channel.debug(formattedMessage);
        break;
      case 'info':
        channel.info(formattedMessage);
        break;
      case 'warning':
        channel.warn(formattedMessage);
        break;
      case 'error':
        channel.error(formattedMessage);
        break;
      case 'fatal':
        // VS Code LogOutputChannel doesn't have a fatal level, use error
        channel.error(`[FATAL] ${formattedMessage}`);
        break;
    }
  }) as VSCodeSink;

  sink.show = () => channel.show();
  sink.dispose = () => channel.dispose();

  return sink;
}
