// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  buildIcarusCompileUnitArgs,
  buildSlangCompileUnitArgs,
  buildVerilatorCompileUnitArgs,
  getCompileUnitDefineArgs,
  getCompileUnitIncludePaths,
  getCompileUnitSourcePaths,
} from '../linter/CompileUnitLintArgs';
import type { CompileUnitLintContext } from '../linter/ProjectLintContext';

suite('CompileUnitLintArgs', () => {
  test('generates Slang args with include dirs, defines, custom args, and source order', () => {
    const context = createContext();
    const includePath = context.includeDirs[0]?.fsPath;
    const firstSourcePath = context.files[0]?.uri.fsPath;
    const secondSourcePath = context.files[1]?.uri.fsPath;

    const args = buildSlangCompileUnitArgs({
      docFolder: '/workspace/rtl',
      includePaths: getCompileUnitIncludePaths(context),
      defineArgs: getCompileUnitDefineArgs(context),
      customArguments: '--flag "two words"',
      sourcePaths: getCompileUnitSourcePaths(context),
    });

    assert.deepStrictEqual(args, [
      '-I',
      '/workspace/rtl',
      '-I',
      '/workspace/inc',
      '-D',
      'SIM',
      '-D',
      'WIDTH=32',
      '--flag',
      'two words',
      firstSourcePath,
      secondSourcePath,
    ]);
    assert.strictEqual(args[3], includePath);
  });

  test('generates Verilator args with source order', () => {
    const context = createContext();
    const includePath = context.includeDirs[0]?.fsPath;
    const firstSourcePath = context.files[0]?.uri.fsPath;
    const secondSourcePath = context.files[1]?.uri.fsPath;

    const args = buildVerilatorCompileUnitArgs({
      languageId: 'systemverilog',
      docFolder: '/workspace/rtl',
      includePaths: getCompileUnitIncludePaths(context),
      defineArgs: getCompileUnitDefineArgs(context),
      customArguments: '-Wall',
      sourcePaths: getCompileUnitSourcePaths(context),
    });

    assert.deepStrictEqual(args, [
      '-sv',
      '--lint-only',
      '-I/workspace/rtl',
      `-I${includePath}`,
      '-DSIM',
      '-DWIDTH=32',
      '-Wall',
      firstSourcePath,
      secondSourcePath,
    ]);
  });

  test('generates Icarus args with standards and source order', () => {
    const context = createContext();
    const includePath = context.includeDirs[0]?.fsPath;
    const firstSourcePath = context.files[0]?.uri.fsPath;
    const secondSourcePath = context.files[1]?.uri.fsPath;
    const standards = new Map<string, string>([['systemverilog', 'SystemVerilog2012']]);

    const args = buildIcarusCompileUnitArgs({
      languageId: 'systemverilog',
      standards,
      includePaths: getCompileUnitIncludePaths(context),
      defineArgs: getCompileUnitDefineArgs(context),
      customArguments: '-Wall',
      sourcePaths: getCompileUnitSourcePaths(context),
    });

    assert.deepStrictEqual(args, [
      '-t',
      'null',
      '-g2012',
      '-I',
      includePath,
      '-D',
      'SIM',
      '-D',
      'WIDTH=32',
      '-Wall',
      firstSourcePath,
      secondSourcePath,
    ]);
  });
});

function createContext(): CompileUnitLintContext {
  const ownerDocument = {
    uri: vscode.Uri.file('/workspace/rtl/a.sv'),
  } as vscode.TextDocument;
  return {
    ownerDocument,
    fileContext: {
      file: ownerDocument.uri,
      compileUnitId: 'unit',
      includeDirs: [vscode.Uri.file('/workspace/inc')],
      defines: {},
    },
    compileUnit: {
      id: 'unit',
      name: 'unit',
      root: vscode.Uri.file('/workspace'),
      files: [
        {
          uri: vscode.Uri.file('/workspace/rtl/a.sv'),
          languageId: 'systemverilog',
          kind: 'source',
          order: 0,
        },
        {
          uri: vscode.Uri.file('/workspace/rtl/b.sv'),
          languageId: 'systemverilog',
          kind: 'source',
          order: 1,
        },
      ],
      includeDirs: [vscode.Uri.file('/workspace/inc')],
      defines: {
        SIM: { name: 'SIM', value: true, source: 'filelist' },
        WIDTH: { name: 'WIDTH', value: '32', source: 'filelist' },
      },
      topModules: [],
      source: { type: 'settings' },
    },
    includeDirs: [vscode.Uri.file('/workspace/inc')],
    defines: {
      SIM: { name: 'SIM', value: true, source: 'filelist' },
      WIDTH: { name: 'WIDTH', value: '32', source: 'filelist' },
    },
    files: [
      {
        uri: vscode.Uri.file('/workspace/rtl/a.sv'),
        languageId: 'systemverilog',
        kind: 'source',
        order: 0,
      },
      {
        uri: vscode.Uri.file('/workspace/rtl/b.sv'),
        languageId: 'systemverilog',
        kind: 'source',
        order: 1,
      },
    ],
    workspaceRoot: vscode.Uri.file('/workspace'),
  };
}
