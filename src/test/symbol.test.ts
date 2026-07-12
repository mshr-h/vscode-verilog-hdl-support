// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { Symbol } from '../ctags';

suite('Symbol', () => {
  test('constructor sets correct default values', () => {
    const symbol = new Symbol('test', 'module', '/^module test;/', 5, '', '', undefined, undefined);

    assert.strictEqual(symbol.name, 'test');
    assert.strictEqual(symbol.type, 'module');
    assert.strictEqual(symbol.pattern, '/^module test;/');
    assert.strictEqual(symbol.startPosition.line, 5);
    assert.strictEqual(symbol.startPosition.character, 0);
    assert.strictEqual(symbol.parentScope, '');
    assert.strictEqual(symbol.parentType, '');
    assert.strictEqual(symbol.isValid, false);
    // endPosition should default to startLine when not provided
    assert.strictEqual(symbol.endPosition.line, 5);
  });

  test('constructor with endLine and isValid', () => {
    const symbol = new Symbol('sig', 'net', '/^wire sig;/', 10, 'top', 'module', 15, true);

    assert.strictEqual(symbol.name, 'sig');
    assert.strictEqual(symbol.startPosition.line, 10);
    assert.strictEqual(symbol.endPosition.line, 15);
    assert.strictEqual(symbol.parentScope, 'top');
    assert.strictEqual(symbol.parentType, 'module');
    assert.strictEqual(symbol.isValid, true);
  });

  test('setEndPosition updates position and validity', () => {
    const symbol = new Symbol('test', 'module', '', 0, '', '', undefined, false);

    assert.strictEqual(symbol.isValid, false);
    assert.strictEqual(symbol.endPosition.line, 0);

    symbol.setEndPosition(10);

    assert.strictEqual(symbol.endPosition.line, 10);
    assert.strictEqual(symbol.isValid, true);
  });

  test('getDocumentSymbol returns correct SymbolKind for module', () => {
    const symbol = new Symbol('mymodule', 'module', '', 0, '', '', 10, true);
    const docSymbol = symbol.getDocumentSymbol();

    assert.strictEqual(docSymbol.name, 'mymodule');
    assert.strictEqual(docSymbol.kind, vscode.SymbolKind.Module);
    assert.strictEqual(docSymbol.detail, 'module');
  });

  test('getDocumentSymbol returns correct SymbolKind for function', () => {
    const symbol = new Symbol('myfunc', 'function', '', 5, 'top', 'module', 15, true);
    const docSymbol = symbol.getDocumentSymbol();

    assert.strictEqual(docSymbol.name, 'myfunc');
    assert.strictEqual(docSymbol.kind, vscode.SymbolKind.Function);
  });

  test('getSymbolKind maps all types correctly', () => {
    const testCases: [string, vscode.SymbolKind][] = [
      ['constant', vscode.SymbolKind.Constant],
      ['parameter', vscode.SymbolKind.Constant],
      ['event', vscode.SymbolKind.Event],
      ['function', vscode.SymbolKind.Function],
      ['module', vscode.SymbolKind.Module],
      ['net', vscode.SymbolKind.Variable],
      ['port', vscode.SymbolKind.Boolean],
      ['register', vscode.SymbolKind.Variable],
      ['task', vscode.SymbolKind.Function],
      ['block', vscode.SymbolKind.Module],
      ['class', vscode.SymbolKind.Class],
      ['enum', vscode.SymbolKind.Enum],
      ['interface', vscode.SymbolKind.Interface],
      ['modport', vscode.SymbolKind.Boolean],
      ['package', vscode.SymbolKind.Package],
      ['program', vscode.SymbolKind.Module],
      ['prototype', vscode.SymbolKind.Function],
      ['property', vscode.SymbolKind.Property],
      ['struct', vscode.SymbolKind.Struct],
      ['typedef', vscode.SymbolKind.TypeParameter],
      ['unknown_type', vscode.SymbolKind.Variable], // default case
    ];

    for (const [typeName, expectedKind] of testCases) {
      const result = Symbol.getSymbolKind(typeName);
      assert.strictEqual(
        result,
        expectedKind,
        `Expected ${typeName} to map to ${vscode.SymbolKind[expectedKind]}`
      );
    }
  });

  test('isContainer returns true for container types', () => {
    const containerTypes = [
      'function',
      'module',
      'task',
      'block',
      'class',
      'covergroup',
      'enum',
      'interface',
      'package',
      'program',
      'struct',
    ];

    for (const type of containerTypes) {
      assert.strictEqual(
        Symbol.isContainer(type),
        true,
        `Expected ${type} to be a container`
      );
    }
  });

  test('isContainer returns false for non-container types', () => {
    const nonContainerTypes = [
      'constant',
      'parameter',
      'event',
      'net',
      'port',
      'register',
      'modport',
      'prototype',
      'typedef',
      'property',
      'assert',
    ];

    for (const type of nonContainerTypes) {
      assert.strictEqual(
        Symbol.isContainer(type),
        false,
        `Expected ${type} to not be a container`
      );
    }
  });

  test('isContainer returns false for unknown types', () => {
    assert.strictEqual(Symbol.isContainer('unknown'), false);
    assert.strictEqual(Symbol.isContainer(''), false);
  });
});
