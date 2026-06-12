// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { scanInstanceContext } from '../semantic/InstanceContextScanner';

suite('InstanceContextScanner', () => {
  test('detects simple instance port list', () => {
    const context = scanAtCursor([
      'foo u_foo (',
      '  .cl|',
      ');',
    ].join('\n'));

    assert.strictEqual(context?.moduleName, 'foo');
    assert.strictEqual(context?.instanceName, 'u_foo');
    assert.strictEqual(context?.kind, 'ports');
  });

  test('detects parameterized instance port list', () => {
    const context = scanAtCursor([
      'foo #(',
      '  .WIDTH(32)',
      ') u_foo (',
      '  .cl|',
      ');',
    ].join('\n'));

    assert.strictEqual(context?.moduleName, 'foo');
    assert.strictEqual(context?.instanceName, 'u_foo');
    assert.strictEqual(context?.kind, 'ports');
  });

  test('detects inline parameter override', () => {
    const context = scanAtCursor('foo #(.WI|) u_foo ();');

    assert.strictEqual(context?.moduleName, 'foo');
    assert.strictEqual(context?.kind, 'parameters');
  });

  test('detects multiline parameter override', () => {
    const context = scanAtCursor([
      'foo',
      '#(',
      '  .WI|',
      ')',
      'u_foo',
      '(',
      ');',
    ].join('\n'));

    assert.strictEqual(context?.moduleName, 'foo');
    assert.strictEqual(context?.kind, 'parameters');
  });

  test('detects already connected ports', () => {
    const context = scanAtCursor([
      'foo u_foo (',
      '  .clk(clk),',
      '  .rst|',
      ');',
    ].join('\n'));

    assert.ok(context?.connectedNames.has('clk'));
    assert.strictEqual(context?.connections[0]?.expressionText, 'clk');
  });

  test('detects already overridden parameters', () => {
    const context = scanAtCursor([
      'foo #(',
      '  .WIDTH(32),',
      '  .DE|',
      ') u_foo ();',
    ].join('\n'));

    assert.ok(context?.connectedNames.has('WIDTH'));
  });

  test('returns undefined outside instance context', () => {
    const context = scanAtCursor('assign value = wi|re_sig;');

    assert.strictEqual(context, undefined);
  });

  test('returns undefined for positional instance connections', () => {
    const context = scanAtCursor('foo u_foo (cl|k);');

    assert.strictEqual(context, undefined);
  });

  test('handles malformed code safely', () => {
    assert.doesNotThrow(() => scanAtCursor('foo #(( .WIDTH(|'));
  });
});

function scanAtCursor(textWithCursor: string): ReturnType<typeof scanInstanceContext> {
  const offset = textWithCursor.indexOf('|');
  const text = textWithCursor.replace(/\|/g, '');
  return scanInstanceContext(text, offset);
}
