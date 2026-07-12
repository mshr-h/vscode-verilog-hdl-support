// SPDX-License-Identifier: MIT
import { type LogRecord, configure, reset } from '@logtape/logtape';
import { ROOT_LOGGER_CATEGORY } from '../logging';

/**
 * Test utility for capturing and inspecting log output during tests.
 * Provides a buffer sink for LogTape and helper methods for assertions.
 *
 * @example
 * ```typescript
 * import { LogCapture } from './logTestUtils';
 *
 * suite('My Test Suite', () => {
 *   const logs = new LogCapture();
 *
 *   suiteSetup(async () => await logs.setup());
 *   setup(() => logs.clear());
 *   suiteTeardown(async () => await logs.teardown());
 *
 *   test('logs error on failure', async () => {
 *     // ... test code that triggers logging
 *     assert.ok(logs.hasError('expected error message'));
 *   });
 * });
 * ```
 */
export class LogCapture {
  /** All captured log records */
  public records: LogRecord[] = [];

  /**
   * Sets up LogTape with a buffer sink for testing.
   * Call this in suiteSetup().
   */
  async setup(): Promise<void> {
    await configure({
      sinks: { test: this.records.push.bind(this.records) },
      filters: {},
      loggers: [{ category: [ROOT_LOGGER_CATEGORY], sinks: ['test'], lowestLevel: 'debug' }],
    });
  }

  /**
   * Resets LogTape configuration.
   * Call this in suiteTeardown().
   */
  async teardown(): Promise<void> {
    await reset();
  }

  /**
   * Clears all captured log records.
   * Call this in setup() before each test.
   */
  clear(): void {
    this.records.length = 0;
  }

  /**
   * Formats a log record's message into a single string.
   * @param record - The log record to format
   * @returns The formatted message string
   */
  private formatMessage(record: LogRecord): string {
    return record.message
      .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
      .join('');
  }

  /**
   * Gets all log messages as an array of strings.
   * @returns Array of formatted log messages
   */
  getMessages(): string[] {
    return this.records.map((r) => this.formatMessage(r));
  }

  /**
   * Gets log records filtered by level.
   * @param level - The log level to filter by
   * @returns Array of matching log records
   */
  getByLevel(level: 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal'): LogRecord[] {
    return this.records.filter((r) => r.level === level);
  }

  /**
   * Gets log records filtered by category prefix.
   * @param category - The category array prefix to match
   * @returns Array of matching log records
   */
  getByCategory(category: string[]): LogRecord[] {
    return this.records.filter(
      (r) =>
        r.category.length >= category.length &&
        category.every((c, i) => r.category[i] === c)
    );
  }

  /**
   * Checks if any log message contains a substring.
   * @param substring - The substring to search for (optional)
   * @returns True if any message contains the substring, or if any messages exist when no substring provided
   */
  hasMessage(substring?: string): boolean {
    if (substring === undefined) {
      return this.records.length > 0;
    }
    return this.getMessages().some((m) => m.includes(substring));
  }

  /**
   * Alias for hasMessage - checks if any log message contains a substring.
   * @param substring - The substring to search for
   * @returns True if any message contains the substring
   */
  hasMessageContaining(substring: string): boolean {
    return this.hasMessage(substring);
  }

  /**
   * Checks if any log record exists at the specified level.
   * @param level - The log level to check
   * @returns True if any log record exists at that level
   */
  hasLevel(level: 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal'): boolean {
    return this.getByLevel(level).length > 0;
  }

  /**
   * Checks if any error-level log message contains a substring.
   * @param substring - The substring to search for (optional)
   * @returns True if any error message contains the substring, or if any errors exist when no substring provided
   */
  hasError(substring?: string): boolean {
    const errors = this.getByLevel('error');
    if (substring === undefined) {
      return errors.length > 0;
    }
    return errors.some((r) => this.formatMessage(r).includes(substring));
  }

  /**
   * Checks if any warning-level log message contains a substring.
   * @param substring - The substring to search for (optional)
   * @returns True if any warning message contains the substring, or if any warnings exist when no substring provided
   */
  hasWarning(substring?: string): boolean {
    const warnings = this.getByLevel('warning');
    if (substring === undefined) {
      return warnings.length > 0;
    }
    return warnings.some((r) => this.formatMessage(r).includes(substring));
  }

  /**
   * Checks if any info-level log message contains a substring.
   * @param substring - The substring to search for (optional)
   * @returns True if any info message contains the substring, or if any infos exist when no substring provided
   */
  hasInfo(substring?: string): boolean {
    const infos = this.getByLevel('info');
    if (substring === undefined) {
      return infos.length > 0;
    }
    return infos.some((r) => this.formatMessage(r).includes(substring));
  }

  /**
   * Checks if any fatal-level log message contains a substring.
   * @param substring - The substring to search for (optional)
   * @returns True if any fatal message contains the substring, or if any fatals exist when no substring provided
   */
  hasFatal(substring?: string): boolean {
    const fatals = this.getByLevel('fatal');
    if (substring === undefined) {
      return fatals.length > 0;
    }
    return fatals.some((r) => this.formatMessage(r).includes(substring));
  }
}
