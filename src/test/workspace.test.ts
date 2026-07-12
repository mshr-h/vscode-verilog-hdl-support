// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as path from 'path';
import {
  getWorkingDirectoryForPath,
  resolvePathForWorkspaceRoot,
} from '../utils/workspace';
import { buildIcarusArgs } from '../linter/IcarusLinter';
import { buildVerilatorArgs } from '../linter/VerilatorLinter';
import { buildXvlogArgs } from '../linter/XvlogLinter';

suite('Workspace path helpers', () => {
  const root = path.parse(process.cwd()).root;
  const repoA = path.join(root, 'repo', 'a');
  const repoB = path.join(root, 'repo', 'b');
  const documentPath = path.join(repoB, 'src', 'top.sv');

  test('resolves relative include paths against the document workspace root', () => {
    assert.strictEqual(
      resolvePathForWorkspaceRoot('rtl/include', repoB),
      path.join(repoB, 'rtl', 'include')
    );
    assert.notStrictEqual(
      resolvePathForWorkspaceRoot('rtl/include', repoB),
      path.join(repoA, 'rtl', 'include')
    );
  });

  test('returns absolute include paths unchanged', () => {
    const includePath = path.join(root, 'vendor', 'include');

    assert.strictEqual(resolvePathForWorkspaceRoot(includePath, repoB), includePath);
  });

  test('uses workspace root as cwd when runAtFileLocation is false', () => {
    assert.strictEqual(getWorkingDirectoryForPath(documentPath, repoB, false), repoB);
  });

  test('uses document directory as cwd when runAtFileLocation is true', () => {
    assert.strictEqual(
      getWorkingDirectoryForPath(documentPath, repoB, true),
      path.dirname(documentPath)
    );
  });

  test('falls back to document directory and raw relative paths outside a workspace', () => {
    assert.strictEqual(
      getWorkingDirectoryForPath(documentPath, undefined, false),
      path.dirname(documentPath)
    );
    assert.strictEqual(resolvePathForWorkspaceRoot('rtl/include', undefined), 'rtl/include');
  });

  test('passes document-root-resolved include paths to linter argument builders', () => {
    const includePath = resolvePathForWorkspaceRoot('rtl/include', repoB);

    assert.deepStrictEqual(
      buildIcarusArgs({
        languageId: 'verilog',
        standards: new Map<string, string>(),
        includePaths: [includePath],
        customArguments: '',
        documentPath,
      }),
      ['-t', 'null', '-I', includePath, documentPath]
    );
    assert.ok(
      buildVerilatorArgs({
        languageId: 'verilog',
        docFolder: path.dirname(documentPath),
        includePaths: [includePath],
        customArguments: '',
        documentPath,
      }).includes(`-I${includePath}`)
    );
    assert.deepStrictEqual(
      buildXvlogArgs({
        languageId: 'verilog',
        includePaths: [includePath],
        customArguments: '',
        documentPath,
      }),
      ['-nolog', '-i', includePath, documentPath]
    );
  });
});
