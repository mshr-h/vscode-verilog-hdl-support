import * as vscode from 'vscode';

/**
 * A hierarchical logger that wraps VS Code's LogOutputChannel.
 * Supports creating child loggers that prefix messages with their name.
 *
 * @example
 * ```typescript
 * const logger = createLogger('Verilog');
 * logger.info('Info message');
 * const childLogger = logger.getChild('ChildA');
 * childLogger.info('Message from child');
 * // Output:
 * // Info message
 * // [ChildA] Message from child
 * ```
 */
export class Logger {
  private name: string;
  private parentLogger: vscode.LogOutputChannel | Logger;

  /**
   * Creates a new Logger instance.
   * @param name - The name of this logger (used as prefix for child loggers)
   * @param parentLogger - The parent LogOutputChannel or Logger
   */
  constructor(name: string, parentLogger: vscode.LogOutputChannel | Logger) {
    this.name = name;
    this.parentLogger = parentLogger;
  }

  /**
   * Creates a child logger with a prefixed name.
   * @param name - The name for the child logger
   * @returns A new Logger instance that prefixes messages with [name]
   */
  getChild(name: string) {
    return new Logger(name, this);
  }

  private log(level: 'trace' | 'info' | 'debug' | 'warn' | 'error', message: string, data?: unknown): void {
    let formattedMessage =
      this.parentLogger instanceof Logger ? `[${this.name}] ${message}` : `${message}`;
    if (data) {
      formattedMessage += JSON.stringify(data);
    }
    this.parentLogger[level](formattedMessage);
  }

  /**
   * Logs a trace-level message.
   * @param message - The message to log
   * @param data - Optional data to append as JSON
   */
  trace(message: string, data?: unknown): void {
    this.log('trace', message, data);
  }

  /**
   * Logs an info-level message.
   * @param message - The message to log
   * @param data - Optional data to append as JSON
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Logs a debug-level message.
   * @param message - The message to log
   * @param data - Optional data to append as JSON
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Logs a warning-level message.
   * @param message - The message to log
   * @param data - Optional data to append as JSON
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  /**
   * Logs an error-level message.
   * @param message - The message to log
   * @param data - Optional data to append as JSON
   */
  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  /**
   * Shows the output channel in the VS Code panel.
   */
  show(): void {
    this.parentLogger.show();
  }
}

/**
 * Creates a new root Logger with a VS Code LogOutputChannel.
 * @param name - The name for the output channel
 * @returns A new Logger instance
 */
export function createLogger(name: string): Logger {
  return new Logger(name, vscode.window.createOutputChannel(name, { log: true }));
}
