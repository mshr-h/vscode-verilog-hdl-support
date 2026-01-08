// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { Logger } from '../logger';

// Mock LogOutputChannel for testing
class MockOutputChannel {
  public messages: { level: string; message: string }[] = [];

  trace(message: string): void {
    this.messages.push({ level: 'trace', message });
  }
  info(message: string): void {
    this.messages.push({ level: 'info', message });
  }
  debug(message: string): void {
    this.messages.push({ level: 'debug', message });
  }
  warn(message: string): void {
    this.messages.push({ level: 'warn', message });
  }
  error(message: string): void {
    this.messages.push({ level: 'error', message });
  }
  show(): void {
    // no-op for testing
  }
}

suite('Logger', () => {
  test('logs messages at different levels', () => {
    const mockChannel = new MockOutputChannel();
    const logger = new Logger('Test', mockChannel as never);

    logger.trace('trace message');
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    assert.strictEqual(mockChannel.messages.length, 5);
    assert.strictEqual(mockChannel.messages[0].level, 'trace');
    assert.strictEqual(mockChannel.messages[0].message, 'trace message');
    assert.strictEqual(mockChannel.messages[1].level, 'debug');
    assert.strictEqual(mockChannel.messages[2].level, 'info');
    assert.strictEqual(mockChannel.messages[3].level, 'warn');
    assert.strictEqual(mockChannel.messages[4].level, 'error');
  });

  test('child logger adds prefix to messages', () => {
    const mockChannel = new MockOutputChannel();
    const parentLogger = new Logger('Parent', mockChannel as never);
    const childLogger = parentLogger.getChild('Child');

    childLogger.info('child message');

    assert.strictEqual(mockChannel.messages.length, 1);
    assert.ok(
      mockChannel.messages[0].message.includes('[Child]'),
      'Child message should include child name prefix'
    );
    assert.ok(
      mockChannel.messages[0].message.includes('child message'),
      'Child message should include the message content'
    );
  });

  test('nested child loggers add multiple prefixes', () => {
    const mockChannel = new MockOutputChannel();
    const parentLogger = new Logger('Parent', mockChannel as never);
    const childLogger = parentLogger.getChild('Child');
    const grandchildLogger = childLogger.getChild('Grandchild');

    grandchildLogger.info('nested message');

    assert.strictEqual(mockChannel.messages.length, 1);
    const message = mockChannel.messages[0].message;
    assert.ok(message.includes('[Grandchild]'), 'Should include grandchild prefix');
    assert.ok(message.includes('[Child]'), 'Should include child prefix');
  });

  test('logs data as JSON when provided', () => {
    const mockChannel = new MockOutputChannel();
    const logger = new Logger('Test', mockChannel as never);

    const testData = { key: 'value', count: 42 };
    logger.info('message with data', testData);

    assert.strictEqual(mockChannel.messages.length, 1);
    const message = mockChannel.messages[0].message;
    assert.ok(message.includes('message with data'), 'Should include message');
    assert.ok(message.includes('"key":"value"'), 'Should include JSON data');
    assert.ok(message.includes('"count":42'), 'Should include JSON data');
  });

  test('show delegates to parent channel', () => {
    let showCalled = false;
    const mockChannel = new MockOutputChannel();
    mockChannel.show = () => {
      showCalled = true;
    };

    const logger = new Logger('Test', mockChannel as never);
    logger.show();

    assert.ok(showCalled, 'show() should be called on parent channel');
  });

  test('child logger show delegates to parent', () => {
    let showCalled = false;
    const mockChannel = new MockOutputChannel();
    mockChannel.show = () => {
      showCalled = true;
    };

    const parentLogger = new Logger('Parent', mockChannel as never);
    const childLogger = parentLogger.getChild('Child');
    childLogger.show();

    assert.ok(showCalled, 'show() should propagate through parent chain');
  });
});
