// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { getLogger } from '@logtape/logtape';
import { ROOT_LOGGER_CATEGORY } from '../logging';
import { LogCapture } from './logTestUtils';

suite('LogTape Integration', () => {
  const logCapture = new LogCapture();

  suiteSetup(async () => {
    await logCapture.setup();
  });

  suiteTeardown(async () => {
    await logCapture.teardown();
  });

  setup(() => {
    logCapture.clear();
  });

  test('captures log messages at different levels', () => {
    const logger = getLogger([ROOT_LOGGER_CATEGORY, 'Test', 'Levels']);

    logger.debug`debug message`;
    logger.info`info message`;
    logger.warn`warn message`;
    logger.error`error message`;
    logger.fatal`fatal message`;

    const messages = logCapture.getMessages();
    assert.strictEqual(messages.length, 5);
    assert.ok(logCapture.hasLevel('debug'));
    assert.ok(logCapture.hasInfo());
    assert.ok(logCapture.hasWarning());
    assert.ok(logCapture.hasError());
    assert.ok(logCapture.hasFatal());
  });

  test('captures messages with interpolated values', () => {
    const logger = getLogger([ROOT_LOGGER_CATEGORY, 'Test', 'Interpolation']);
    const value = 42;
    const name = 'test';

    logger.info`Processing ${name} with value ${value}`;

    const messages = logCapture.getMessages();
    assert.strictEqual(messages.length, 1);
    assert.ok(messages[0].includes('Processing'));
    assert.ok(messages[0].includes('test'));
    assert.ok(messages[0].includes('42'));
  });

  test('clear() removes all captured messages', () => {
    const logger = getLogger([ROOT_LOGGER_CATEGORY, 'Test', 'Clear']);

    logger.info`first message`;
    logger.info`second message`;
    assert.strictEqual(logCapture.getMessages().length, 2);

    logCapture.clear();
    assert.strictEqual(logCapture.getMessages().length, 0);
  });

  test('hierarchical category filtering', () => {
    const parentLogger = getLogger([ROOT_LOGGER_CATEGORY, 'Parent']);
    const childLogger = getLogger([ROOT_LOGGER_CATEGORY, 'Parent', 'Child']);
    const siblingLogger = getLogger([ROOT_LOGGER_CATEGORY, 'Other']);

    parentLogger.info`parent message`;
    childLogger.info`child message`;
    siblingLogger.info`sibling message`;

    const messages = logCapture.getMessages();
    assert.strictEqual(messages.length, 3);
  });

  test('hasMessageContaining finds matching messages', () => {
    const logger = getLogger([ROOT_LOGGER_CATEGORY, 'Test', 'Contains']);

    logger.info`The quick brown fox`;
    logger.error`Something went wrong`;

    assert.ok(logCapture.hasMessageContaining('brown fox'));
    assert.ok(logCapture.hasMessageContaining('went wrong'));
    assert.ok(!logCapture.hasMessageContaining('nonexistent'));
  });
});
