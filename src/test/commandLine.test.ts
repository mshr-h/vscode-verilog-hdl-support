// SPDX-License-Identifier: MIT
import * as assert from 'assert';

import { splitCommandLineArgs } from '../utils/commandLine';

suite('Command-line utilities', () => {
  test('splits custom command-line arguments', () => {
    assert.deepStrictEqual(splitCommandLineArgs(''), []);
    assert.deepStrictEqual(splitCommandLineArgs('--foo bar'), ['--foo', 'bar']);
    assert.deepStrictEqual(splitCommandLineArgs('  -Wall   -DNAME=VALUE  '), [
      '-Wall',
      '-DNAME=VALUE',
    ]);
    assert.deepStrictEqual(
      splitCommandLineArgs('-DMSG="hello world" -I \'quoted include\' "-DNAME=foo bar"'),
      ['-DMSG=hello world', '-I', 'quoted include', '-DNAME=foo bar']
    );
    assert.deepStrictEqual(splitCommandLineArgs('-DNAME=\\"quoted\\" "unterminated value'), [
      '-DNAME="quoted"',
      'unterminated value',
    ]);
  });
});
