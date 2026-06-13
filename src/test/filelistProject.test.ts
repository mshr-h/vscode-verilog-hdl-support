// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseFilelist } from '../filelist/FilelistParser';
import { resolveFilelist } from '../filelist/FilelistResolver';
import { tokenizeFilelist } from '../filelist/FilelistTokenizer';
import { FileContextResolver } from '../project/FileContextResolver';
import { ProjectLoader } from '../project/ProjectLoader';
import { buildCompileUnit } from '../project/ProjectModelMerger';
import {
  createActiveTargetDiagnostic,
  getActiveCompileUnit,
} from '../project/ProjectTargetResolver';
import type { ProjectSnapshot } from '../project/ProjectTypes';
import type { ProjectSettings } from '../project/providers/SettingsProjectSourceProvider';

suite('FilelistTokenizer', () => {
  test('handles comments, quotes, and whitespace', () => {
    const tokens = tokenizeFilelist([
      'rtl/foo.sv // comment',
      '"path with spaces/bar.sv"',
      '# comment',
      '+define+SIM',
    ].join('\n'));

    assert.deepStrictEqual(tokens.map((token) => token.text), [
      'rtl/foo.sv',
      'path with spaces/bar.sv',
      '+define+SIM',
    ]);
  });
});

suite('FilelistParser', () => {
  test('parses files, include dirs, defines, libraries, and nested filelists', () => {
    const parsed = parseFilelist([
      'rtl/foo.sv',
      'include/defs.svh',
      '+incdir+rtl/include+tb/include',
      '+define+SIM+WIDTH=32',
      '-I rtl/inc2',
      '-Irtl/inc3',
      '-D SEP',
      '-DWIDTH2=64',
      '-f common.f',
      '-Fcommon2.f',
      '-y rtl/lib',
      '-yrtl/lib2',
      '-v rtl/lib/cell.v',
      '-vrtl/lib/cell2.v',
    ].join('\n'));

    assert.strictEqual(parsed.files.length, 2);
    assert.deepStrictEqual(parsed.includeDirs.map((ref) => ref.path), [
      'rtl/include',
      'tb/include',
      'rtl/inc2',
      'rtl/inc3',
    ]);
    assert.deepStrictEqual(parsed.defines.map((define) => [define.name, define.value]), [
      ['SIM', true],
      ['WIDTH', '32'],
      ['SEP', true],
      ['WIDTH2', '64'],
    ]);
    assert.deepStrictEqual(parsed.nestedFilelists.map((ref) => ref.path), ['common.f', 'common2.f']);
    assert.deepStrictEqual(parsed.libraryDirs.map((ref) => ref.path), ['rtl/lib', 'rtl/lib2']);
    assert.deepStrictEqual(parsed.libraryFiles.map((ref) => ref.path), [
      'rtl/lib/cell.v',
      'rtl/lib/cell2.v',
    ]);
  });
});

suite('FilelistResolver', () => {
  test('resolves nested filelists relative to their containing filelist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-filelist-'));
    fs.mkdirSync(path.join(root, 'rtl'), { recursive: true });
    fs.mkdirSync(path.join(root, 'nested', 'inc'), { recursive: true });
    fs.writeFileSync(path.join(root, 'rtl', 'top.sv'), 'module top; endmodule');
    fs.writeFileSync(path.join(root, 'nested', 'child.sv'), 'module child; endmodule');
    fs.writeFileSync(path.join(root, 'nested', 'common.f'), '+incdir+inc\nchild.sv\n');
    fs.writeFileSync(path.join(root, 'top.f'), 'rtl/top.sv\n-f nested/common.f\n');

    const resolved = resolveFilelist(path.join(root, 'top.f'));

    assert.deepStrictEqual(resolved.files.map((file) => path.basename(file.resolvedPath)), [
      'top.sv',
      'child.sv',
    ]);
    assert.strictEqual(resolved.includeDirs[0]?.resolvedPath, path.join(root, 'nested', 'inc'));
  });

  test('reports nested cycles and missing paths without failing the whole load', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-filelist-'));
    fs.writeFileSync(path.join(root, 'cycle.f'), '-f cycle.f\nmissing.sv\n+incdir+missing_inc\n');
    const resolved = resolveFilelist(path.join(root, 'cycle.f'));

    assert.ok(resolved.diagnostics.some((diagnostic) => diagnostic.code === 'nested-filelist-cycle'));
    assert.ok(resolved.diagnostics.some((diagnostic) => diagnostic.code === 'missing-source-file'));
    assert.ok(resolved.diagnostics.some((diagnostic) => diagnostic.code === 'missing-include-dir'));
  });

  test('reports missing nested filelists', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-filelist-'));
    fs.writeFileSync(path.join(root, 'top.f'), '-f missing.f\n');
    const resolved = resolveFilelist(path.join(root, 'top.f'));
    const diagnostic = resolved.diagnostics.find((candidate) => candidate.code === 'missing-filelist');

    assert.ok(diagnostic);
    assert.strictEqual(diagnostic.source, path.join(root, 'top.f'));
    assert.strictEqual(diagnostic.line, 0);
    assert.strictEqual(diagnostic.character, 3);
  });
});

suite('ProjectModelMerger', () => {
  test('deduplicates source files and lets settings defines override filelist defines', () => {
    const root = vscode.Uri.file('/workspace');
    const compileUnit = buildCompileUnit({
      id: 'unit',
      name: 'unit',
      root,
      files: [
        { resolvedPath: '/workspace/rtl/top.sv', kind: 'source' },
        { resolvedPath: '/workspace/rtl/top.sv', kind: 'source' },
      ],
      includeDirs: [{ resolvedPath: '/workspace/inc' }],
      defines: [{ name: 'WIDTH', value: '8', line: 0, character: 0 }],
      settingsIncludeDirs: ['settings_inc'],
      settingsDefines: { WIDTH: 32, SIM: true },
      source: { type: 'settings' },
    });

    assert.strictEqual(compileUnit.files.length, 1);
    assert.strictEqual(compileUnit.defines.WIDTH?.value, '32');
    assert.strictEqual(compileUnit.defines.WIDTH?.source, 'settings');
    assert.strictEqual(compileUnit.defines.SIM?.value, true);
    assert.deepStrictEqual(compileUnit.includeDirs.map((uri) => uri.fsPath), [
      path.join(root.fsPath, 'inc'),
      path.join(root.fsPath, 'settings_inc'),
    ]);
  });
});

suite('FileContextResolver', () => {
  test('uses the only compile unit when active target is empty', () => {
    const file = vscode.Uri.file('/workspace/rtl/top.sv');
    const snapshot = createSnapshot('', [
      createCompileUnit('a', 'rtl', file),
    ]);

    assert.strictEqual(getActiveCompileUnit(snapshot)?.id, 'a');
    assert.strictEqual(new FileContextResolver(snapshot).getPreferredFileContext(file)?.compileUnitId, 'a');
  });

  test('returns all contexts and prefers the active target', () => {
    const file = vscode.Uri.file('/workspace/rtl/top.sv');
    const snapshot = createSnapshot('b', [
      createCompileUnit('a', 'a', file),
      createCompileUnit('b', 'b', file),
    ]);

    const resolver = new FileContextResolver(snapshot);
    assert.deepStrictEqual(resolver.getFileContexts(file).map((context) => context.compileUnitId), ['a', 'b']);
    assert.strictEqual(resolver.getPreferredFileContext(file)?.compileUnitId, 'b');
    assert.strictEqual(resolver.getPreferredFileContext(vscode.Uri.file('/workspace/missing.sv')), undefined);
  });

  test('active target can match compile unit name', () => {
    const file = vscode.Uri.file('/workspace/rtl/top.sv');
    const snapshot = createSnapshot('sim-target', [
      createCompileUnit('rtl-id', 'rtl-target', file),
      createCompileUnit('sim-id', 'sim-target', file),
    ]);

    assert.strictEqual(getActiveCompileUnit(snapshot)?.id, 'sim-id');
    assert.strictEqual(new FileContextResolver(snapshot).getPreferredFileContext(file)?.compileUnitId, 'sim-id');
  });

  test('invalid active target creates warning diagnostic and preserves fallback context', () => {
    const file = vscode.Uri.file('/workspace/rtl/top.sv');
    const snapshot = createSnapshot('missing-target', [
      createCompileUnit('a', 'rtl', file),
      createCompileUnit('b', 'sim', file),
    ]);

    const diagnostic = createActiveTargetDiagnostic(snapshot);

    assert.strictEqual(diagnostic?.code, 'active-target-not-found');
    assert.strictEqual(diagnostic?.severity, 'warning');
    assert.ok(diagnostic?.message.includes('missing-target'));
    assert.ok(diagnostic?.message.includes('rtl (a)'));
    assert.strictEqual(new FileContextResolver(snapshot).getPreferredFileContext(file)?.compileUnitId, 'a');
  });
});

suite('ProjectLoader', () => {
  test('falls back to workspace HDL discovery when no filelists are configured', async function () {
    this.timeout(10000);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-workspace-'));
    fs.mkdirSync(path.join(root, 'build'));
    fs.writeFileSync(path.join(root, 'top.sv'), 'module top; endmodule\n');
    fs.writeFileSync(path.join(root, 'build', 'skip.sv'), 'module skip; endmodule\n');
    const settings: ProjectSettings = {
      enabled: true,
      filelists: [],
      activeTarget: '',
      topModules: [],
      includeDirs: [],
      defines: {},
      exclude: ['**/.git/**', '**/node_modules/**', '**/build/**'],
    };
    const loader = new ProjectLoader(
      { getSettings: () => settings },
      undefined,
      () => [{ uri: vscode.Uri.file(root), name: 'tmp', index: 0 }]
    );
    const snapshot = await loader.load(1);

    assert.strictEqual(snapshot.compileUnits[0]?.id, 'auto:workspace');
    assert.ok((snapshot.compileUnits[0]?.files.length ?? 0) > 0);
    assert.ok(!snapshot.compileUnits[0]?.files.some((file) => file.uri.fsPath.endsWith('skip.sv')));
  });
});

function createSnapshot(activeTargetId: string, compileUnits: ProjectSnapshot['compileUnits']): ProjectSnapshot {
  return {
    version: 1,
    workspaceRoot: vscode.Uri.file('/workspace'),
    activeTargetId,
    compileUnits,
    diagnostics: [],
  };
}

function createCompileUnit(id: string, name: string, file: vscode.Uri): ProjectSnapshot['compileUnits'][number] {
  return buildCompileUnit({
    id,
    name,
    root: vscode.Uri.file('/workspace'),
    files: [{ resolvedPath: file.fsPath, kind: 'source' }],
    includeDirs: [],
    defines: [],
    settingsIncludeDirs: [],
    settingsDefines: {},
    source: { type: 'settings' },
  });
}
