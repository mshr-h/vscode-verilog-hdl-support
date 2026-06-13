// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { InstanceScanner } from '../hierarchy/InstanceScanner';

suite('InstanceScanner', () => {
  test('detects simple instance', () => {
    const instances = scan([
      'module top;',
      '  foo u_foo (',
      '    .clk(clk)',
      '  );',
      'endmodule',
    ].join('\n'));

    assert.strictEqual(instances.length, 1);
    assert.strictEqual(instances[0]?.moduleName, 'foo');
    assert.strictEqual(instances[0]?.instanceName, 'u_foo');
    assert.strictEqual(instances[0]?.parentModuleName, 'top');
    assert.deepStrictEqual(instances[0]?.portConnections, ['clk']);
    assert.strictEqual(instances[0]?.moduleNameRange.start.line, 1);
    assert.strictEqual(instances[0]?.moduleNameRange.start.character, 2);
    assert.strictEqual(instances[0]?.portConnectionRecords[0]?.name, 'clk');
    assert.strictEqual(instances[0]?.portConnectionRecords[0]?.range.start.line, 2);
    assert.strictEqual(instances[0]?.portConnectionRecords[0]?.range.start.character, 4);
  });

  test('detects parameterized instance', () => {
    const instances = scan([
      'module top;',
      '  foo #(',
      '    .WIDTH(32)',
      '  ) u_foo (',
      '    .clk(clk)',
      '  );',
      'endmodule',
    ].join('\n'));

    assert.strictEqual(instances.length, 1);
    assert.deepStrictEqual(instances[0]?.parameterOverrides, ['WIDTH']);
    assert.deepStrictEqual(instances[0]?.portConnections, ['clk']);
    assert.strictEqual(instances[0]?.parameterOverrideConnections[0]?.name, 'WIDTH');
    assert.strictEqual(instances[0]?.parameterOverrideConnections[0]?.range.start.line, 2);
    assert.strictEqual(instances[0]?.parameterOverrideConnections[0]?.range.start.character, 4);
  });

  test('detects inline parameterized instance', () => {
    const instances = scan('module top; foo #(.WIDTH(32)) u_foo (.clk(clk)); endmodule');

    assert.strictEqual(instances.length, 1);
    assert.strictEqual(instances[0]?.moduleName, 'foo');
    assert.strictEqual(instances[0]?.instanceName, 'u_foo');
  });

  test('detects multiline instance', () => {
    const instances = scan([
      'module top;',
      '  foo',
      '  #(',
      '    .WIDTH(32)',
      '  )',
      '  u_foo',
      '  (',
      '    .clk(clk)',
      '  );',
      'endmodule',
    ].join('\n'));

    assert.strictEqual(instances.length, 1);
    assert.strictEqual(instances[0]?.moduleName, 'foo');
    assert.strictEqual(instances[0]?.instanceName, 'u_foo');
  });

  test('avoids declaration false positives', () => {
    const instances = scan([
      'module top(input logic clk);',
      'endmodule',
      'interface bus_if;',
      'endinterface',
      'package pkg;',
      'endpackage',
      'class c;',
      'endclass',
    ].join('\n'));

    assert.deepStrictEqual(instances, []);
  });

  test('avoids function task class package false positives inside module', () => {
    const instances = scan([
      'module top;',
      '  function void f();',
      '  endfunction',
      '  task t();',
      '  endtask',
      '  class inner;',
      '  endclass',
      '  package p;',
      '  endpackage',
      'endmodule',
    ].join('\n'));

    assert.deepStrictEqual(instances, []);
  });

  test('avoids procedural keyword false positives and malformed input does not throw', () => {
    assert.doesNotThrow(() => scan('module top; if (ready) begin foo <= bar; end module '));
    const instances = scan([
      'module top;',
      '  always_ff @(posedge clk) begin',
      '    if (rst) value <= 0;',
      '  end',
      '  and primitive_gate(out, a, b);',
      'endmodule',
    ].join('\n'));

    assert.deepStrictEqual(instances, []);
  });
});

function scan(text: string): ReturnType<InstanceScanner['scan']> {
  return new InstanceScanner().scan(text, vscode.Uri.file('/workspace/top.sv'), 'unit');
}
