// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import {
  computeInactivePreprocessorRanges,
} from '../providers/InactivePreprocessorDecorationProvider';

suite('Inactive Preprocessor Ranges', () => {
  test('undefined macro makes ifdef body inactive', () => {
    const ranges = computeInactivePreprocessorRanges(
      ['`ifdef FOO', 'assign a = 1;', '`endif'].join('\n'),
      []
    );

    assert.deepStrictEqual(ranges, [{ startLine: 1, endLine: 1 }]);
  });

  test('defined macro keeps ifdef body active and else body inactive', () => {
    const ranges = computeInactivePreprocessorRanges(
      ['`ifdef FOO', 'assign a = 1;', '`else', 'assign a = 0;', '`endif'].join('\n'),
      ['FOO']
    );

    assert.deepStrictEqual(ranges, [{ startLine: 3, endLine: 3 }]);
  });

  test('ifndef treats a defined macro as inactive', () => {
    const ranges = computeInactivePreprocessorRanges(
      ['`ifndef FOO', 'assign a = 0;', '`else', 'assign a = 1;', '`endif'].join('\n'),
      ['FOO']
    );

    assert.deepStrictEqual(ranges, [{ startLine: 1, endLine: 1 }]);
  });

  test('elsif chain selects only the first true branch', () => {
    const ranges = computeInactivePreprocessorRanges(
      [
        '`ifdef FIRST',
        'assign selected = 0;',
        '`elsif SECOND',
        'assign selected = 1;',
        '`elsif THIRD',
        'assign selected = 2;',
        '`else',
        'assign selected = 3;',
        '`endif',
      ].join('\n'),
      ['SECOND', 'THIRD']
    );

    assert.deepStrictEqual(ranges, [
      { startLine: 1, endLine: 1 },
      { startLine: 5, endLine: 5 },
      { startLine: 7, endLine: 7 },
    ]);
  });

  test('define inside inactive branch does not affect later conditionals', () => {
    const ranges = computeInactivePreprocessorRanges(
      [
        '`ifdef OUTER',
        '`define INNER',
        '`endif',
        '`ifdef INNER',
        'assign a = 1;',
        '`else',
        'assign a = 0;',
        '`endif',
      ].join('\n'),
      []
    );

    assert.deepStrictEqual(ranges, [
      { startLine: 1, endLine: 1 },
      { startLine: 4, endLine: 4 },
    ]);
  });

  test('undef inside inactive branch does not affect later conditionals', () => {
    const ranges = computeInactivePreprocessorRanges(
      [
        '`ifdef OUTER',
        '`undef INNER',
        '`endif',
        '`ifdef INNER',
        'assign a = 1;',
        '`else',
        'assign a = 0;',
        '`endif',
      ].join('\n'),
      ['INNER']
    );

    assert.deepStrictEqual(ranges, [
      { startLine: 1, endLine: 1 },
      { startLine: 6, endLine: 6 },
    ]);
  });

  test('directives inside comments are ignored', () => {
    const ranges = computeInactivePreprocessorRanges(
      [
        '// `define FOO',
        '/* `define BAR */',
        '`ifdef FOO',
        'assign a = 1;',
        '`endif',
        '`ifdef BAR',
        'assign b = 1;',
        '`endif',
      ].join('\n'),
      []
    );

    assert.deepStrictEqual(ranges, [
      { startLine: 3, endLine: 3 },
      { startLine: 6, endLine: 6 },
    ]);
  });

  test('nested conditionals honor inactive parents', () => {
    const ranges = computeInactivePreprocessorRanges(
      [
        '`ifdef OUTER',
        'assign a = 1;',
        '`ifdef INNER',
        'assign b = 1;',
        '`else',
        'assign b = 0;',
        '`endif',
        '`else',
        'assign a = 0;',
        '`endif',
      ].join('\n'),
      ['INNER']
    );

    assert.deepStrictEqual(ranges, [
      { startLine: 1, endLine: 6 },
    ]);
  });
});
