// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { CtagsManager } from '../ctags';
import { CompletionService } from '../hdl/CompletionService';
import { DefinitionService } from '../hdl/DefinitionService';
import { FileContextResolver } from '../project/FileContextResolver';
import { ProjectLoader } from '../project/ProjectLoader';
import { ProjectService } from '../project/ProjectService';
import { ProjectWatcher } from '../project/ProjectWatcher';
import { buildCompileUnit } from '../project/ProjectModelMerger';
import { renderProjectStatus } from '../project/ProjectCommands';
import type { ProjectSnapshot } from '../project/ProjectTypes';
import { readProjectSettings, type ProjectSettings } from '../project/providers/SettingsProjectSourceProvider';
import { FastIndexerBackend } from '../semantic/backends/FastIndexerBackend';
import { IndexService } from '../semantic/IndexService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { SymbolRecord } from '../semantic/SymbolRecords';
import { assertSameFsPath, endsWithPathSegments, getRepositoryRoot } from './pathTestUtils';

suite('Minimal IDE Model Stabilization', () => {
  suite('ProjectService and ProjectLoader fixtures', () => {
    test('loads one configured filelist with files, include dirs, and defines', async () => {
      const root = fixtureRoot('simple-filelist');
      const snapshot = await loadFixture(root, settings({ filelists: ['files.f'] }));

      assert.strictEqual(snapshot.compileUnits.length, 1);
      assert.strictEqual(snapshot.compileUnits[0]?.files.length, 4);
      assert.ok(snapshot.compileUnits[0]?.includeDirs.some((uri) => endsWithPathSegments(uri.fsPath, 'rtl', 'include')));
      assert.strictEqual(snapshot.compileUnits[0]?.defines.SIMPLE_PROJECT?.value, true);
      assert.strictEqual(snapshot.diagnostics.length, 0);
    });

    test('loads nested filelists relative to the nested filelist location', async () => {
      const root = fixtureRoot('nested-filelist');
      const snapshot = await loadFixture(root, settings({ filelists: ['files.f'] }));

      const unit = snapshot.compileUnits[0];
      assert.ok(unit?.files.some((file) => endsWithPathSegments(file.uri.fsPath, 'rtl', 'foo.sv')));
      assert.ok(unit?.files.some((file) => endsWithPathSegments(file.uri.fsPath, 'include', 'defs.svh')));
      assert.ok(unit?.includeDirs.some((uri) => endsWithPathSegments(uri.fsPath, 'include')));
      assert.strictEqual(unit?.defines.NESTED_PROJECT?.value, true);
    });

    test('reports nested cycles and missing project paths as readable diagnostics', async () => {
      const root = fixtureRoot('malformed-filelist');
      const snapshot = await loadFixture(root, settings({ filelists: ['files.f'] }));
      const codes = snapshot.diagnostics.map((diagnostic) => diagnostic.code);
      const missingFilelist = snapshot.diagnostics.find((diagnostic) => diagnostic.code === 'missing-filelist');

      assert.ok(codes.includes('nested-filelist-cycle'));
      assert.ok(codes.includes('missing-filelist'));
      assert.ok(codes.includes('missing-include-dir'));
      assert.ok(codes.includes('missing-source-file'));
      assert.ok(snapshot.diagnostics.every((diagnostic) => diagnostic.message.length > 0));
      assertSameFsPath(missingFilelist?.location?.uri.fsPath, path.join(root, 'files.f'));
    });

    test('creates fallback auto-discovery compile unit and respects exclude patterns', async function () {
      this.timeout(10000);
      const root = fixtureRoot('no-filelist-autodiscovery');
      const snapshot = await loadFixture(root, settings({ exclude: ['**/foo.sv'] }));

      assert.strictEqual(snapshot.compileUnits[0]?.id, 'auto:workspace');
      assert.ok(snapshot.compileUnits[0]?.files.some((file) => endsWithPathSegments(file.uri.fsPath, 'top.sv')));
      assert.ok(!snapshot.compileUnits[0]?.files.some((file) => endsWithPathSegments(file.uri.fsPath, 'foo.sv')));
      assert.ok(snapshot.diagnostics.some((diagnostic) => diagnostic.code === 'fallback-discovery'));
    });

    test('respects verilog.project.enabled=false', async () => {
      const root = fixtureRoot('simple-filelist');
      const snapshot = await loadFixture(root, settings({ enabled: false, filelists: ['files.f'] }));

      assert.strictEqual(snapshot.compileUnits.length, 0);
      assert.ok(snapshot.diagnostics.some((diagnostic) => diagnostic.code === 'project-disabled'));
    });

    test('SettingsProjectSourceProvider defaults project indexing to disabled', () => {
      const projectSettings = readProjectSettings({
        get: <T>(_section: string, defaultValue: T): T => defaultValue,
      } as Pick<vscode.WorkspaceConfiguration, 'get'>);

      assert.strictEqual(projectSettings.enabled, false);
      assert.strictEqual(projectSettings.maxAutoDiscoveredFiles, 5000);
    });

    test('auto-discovery skips indexing when file count exceeds the configured limit', async function () {
      this.timeout(10000);
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-autodiscovery-limit-'));
      fs.writeFileSync(path.join(root, 'top.sv'), 'module top; endmodule\n');
      fs.writeFileSync(path.join(root, 'child.sv'), 'module child; endmodule\n');

      const snapshot = await loadFixture(root, settings({ maxAutoDiscoveredFiles: 1 }));

      assert.strictEqual(snapshot.compileUnits.length, 0);
      assert.ok(
        snapshot.diagnostics.some((diagnostic) => diagnostic.code === 'auto-discovery-file-limit-exceeded')
      );
    });

    test('auto-discovery still creates fallback compile unit under the configured limit', async function () {
      this.timeout(10000);
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-autodiscovery-small-'));
      fs.writeFileSync(path.join(root, 'top.sv'), 'module top; endmodule\n');
      fs.writeFileSync(path.join(root, 'child.sv'), 'module child; endmodule\n');

      const snapshot = await loadFixture(root, settings({ maxAutoDiscoveredFiles: 2 }));

      assert.strictEqual(snapshot.compileUnits[0]?.id, 'auto:workspace');
      assert.strictEqual(snapshot.compileUnits[0]?.files.length, 2);
      assert.ok(snapshot.diagnostics.some((diagnostic) => diagnostic.code === 'fallback-discovery'));
    });

    test('returns preferred file context by active target and no context for unrelated files', async () => {
      const root = fixtureRoot('multi-target');
      const snapshot = await loadFixture(
        root,
        settings({
          filelists: ['rtl.f', 'sim.f'],
          activeTarget: 'filelist:1:sim.f',
        })
      );
      const resolver = new FileContextResolver(snapshot);
      const rtlFile = vscode.Uri.file(path.join(root, 'rtl', 'top.sv'));

      assert.deepStrictEqual(resolver.getFileContexts(rtlFile).map((context) => context.compileUnitId), [
        'filelist:0:rtl.f',
        'filelist:1:sim.f',
      ]);
      assert.strictEqual(resolver.getPreferredFileContext(rtlFile)?.compileUnitId, 'filelist:1:sim.f');
      assert.strictEqual(resolver.getPreferredFileContext(vscode.Uri.file(path.join(root, 'outside.sv'))), undefined);
    });

    test('reports invalid active target as a project diagnostic', async () => {
      const root = fixtureRoot('simple-filelist');
      const snapshot = await loadFixture(root, settings({ filelists: ['files.f'], activeTarget: 'missing-target' }));
      const diagnostic = snapshot.diagnostics.find((candidate) => candidate.code === 'active-target-not-found');

      assert.strictEqual(diagnostic?.severity, 'warning');
      assert.ok(diagnostic?.message.includes('missing-target'));
      assert.ok(diagnostic?.message.includes('files.f'));
    });

    test('degrades to an empty diagnostic snapshot when loading throws', async () => {
      const service = new ProjectService({
        load: async () => {
          throw new Error('boom');
        },
      } as unknown as ProjectLoader);

      const snapshot = await service.reload('test failure');

      assert.strictEqual(snapshot.compileUnits.length, 0);
      assert.strictEqual(snapshot.diagnostics[0]?.code, 'project-load-failed');
      assert.ok(snapshot.diagnostics[0]?.message.includes('boom'));
      service.dispose();
    });
  });

  suite('IndexService and FastIndexer fixtures', () => {
    test('indexes modules, packages, macros, and includes across fixture files', async () => {
      const root = fixtureRoot('simple-filelist');
      const snapshot = await loadFixture(root, settings({ filelists: ['files.f'] }));
      const index = await buildIndex(snapshot);

      assert.strictEqual(index.findModules('top').length, 1);
      assert.strictEqual(index.findModules('foo_core').length, 1);
      assert.strictEqual(index.findPackages('simple_pkg').length, 1);
      assert.strictEqual(index.findMacros('SIMPLE_DEF').length, 1);
      assert.ok(index.getAllSymbols().some((symbol) => symbol.kind === 'include' && symbol.name === 'defs.svh'));
    });

    test('handles duplicate module names and returns all matches', async function () {
      this.timeout(10000);
      const root = fixtureRoot('duplicate-symbols');
      const snapshot = await loadFixture(root, settings());
      const index = await buildIndex(snapshot);

      assert.strictEqual(index.findModules('duplicate_foo').length, 2);
    });

    test('resolves includes using current file directory and include dirs', async () => {
      const root = fixtureRoot('simple-filelist');
      const snapshot = await loadFixture(root, settings({ filelists: ['files.f'] }));
      const index = await buildIndex(snapshot);
      const resolver = new FileContextResolver(snapshot);
      const topUri = vscode.Uri.file(path.join(root, 'rtl', 'top.sv'));
      const context = resolver.getPreferredFileContext(topUri);

      assert.ok(context);
      assertSameFsPath(
        index.resolveInclude('"defs.svh"', context)?.fsPath,
        path.join(root, 'rtl', 'include', 'defs.svh')
      );
    });

    test('supports full rebuild after ProjectSnapshot changes', async () => {
      const root = fixtureRoot('simple-filelist');
      const service = createStaticProjectService();
      const indexService = new IndexService(service, new FastIndexerBackend());
      const first = await loadFixture(root, settings({ filelists: ['files.f'] }));
      const second = await loadFixture(fixtureRoot('nested-filelist'), settings({ filelists: ['files.f'] }));

      await indexService.rebuild(first);
      assert.strictEqual(indexService.getIndex().findModules('foo_core').length, 1);

      await indexService.rebuild(second);
      assert.strictEqual(indexService.getIndex().findModules('foo_core').length, 0);
      assert.strictEqual(indexService.getIndex().findModules('nested_foo').length, 1);
      indexService.dispose();
    });

    test('degrades to an empty index when backend throws', async () => {
      const service = createStaticProjectService();
      const indexService = new IndexService(service, {
        build: async () => {
          throw new Error('index failed');
        },
      } as unknown as FastIndexerBackend);

      const index = await indexService.rebuild(createSnapshot('/workspace', []));

      assert.strictEqual(index.getAllSymbols().length, 0);
      assert.strictEqual(index.version, 1);
      indexService.dispose();
    });
  });

  suite('Provider fallback and project-disabled behavior', () => {
    test('DefinitionService falls back to ctags when project index has no result', async () => {
      const document = await vscode.workspace.openTextDocument({
        language: 'systemverilog',
        content: 'assign sig = 1;',
      });
      const range = new vscode.Range(0, 7, 0, 10);
      const fallback: vscode.DefinitionLink[] = [
        { targetUri: document.uri, targetRange: range, targetSelectionRange: range },
      ];
      const service = new DefinitionService(
        createProjectServiceWithContext(undefined),
        createIndexService(new SemanticIndex(1, [])),
        { findSymbol: async () => fallback } as unknown as CtagsManager
      );

      assert.deepStrictEqual(await service.provideDefinition(document, new vscode.Position(0, 8)), fallback);
    });

    test('CompletionService falls back to ctags when project index is empty', async () => {
      const document = await vscode.workspace.openTextDocument({
        language: 'systemverilog',
        content: 'logic fallback_sig;',
      });
      const service = new CompletionService(
        createProjectServiceWithContext(undefined),
        createIndexService(new SemanticIndex(1, [])),
        {
          getSymbols: async () => [
            {
              name: 'fallback_sig',
              type: 'net',
              startPosition: new vscode.Position(0, 0),
              endPosition: new vscode.Position(0, 18),
              parentScope: '',
              parentType: '',
              isValid: true,
            },
          ],
        } as unknown as CtagsManager
      );

      const items = await service.provideCompletionItems(
        document,
        new vscode.Position(0, 0),
        { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
      );

      assert.ok(items.some((item) => item.label === 'fallback_sig'));
    });
  });

  suite('Diagnostics, UX, and performance guardrails', () => {
    test('renderProjectStatus includes project summary, diagnostics, and active editor context', async () => {
      const root = fixtureRoot('simple-filelist');
      const snapshot = await loadFixture(root, settings({ filelists: ['files.f'] }));
      const document = await vscode.workspace.openTextDocument(path.join(root, 'rtl', 'top.sv'));
      await vscode.window.showTextDocument(document);
      const service = createSnapshotProjectService(snapshot);

      const report = renderProjectStatus(service);

      assert.ok(report.includes('Project enabled: yes'));
      assert.ok(report.includes(`Workspace root: ${vscode.Uri.file(root).fsPath}`));
      assert.ok(report.includes('Resolved active compile unit: files.f (filelist:0:files.f)'));
      assert.ok(report.includes('Compile units: 1'));
      assert.ok(report.includes('Files: 4'));
      assert.ok(report.includes('Include dirs:'));
      assert.ok(report.includes('Defines: SIMPLE_PROJECT'));
      assert.ok(report.includes('## Active Editor Context'));
      assert.ok(report.includes('Preferred: filelist:0:files.f'));
      assert.ok(report.includes('## Diagnostics'));
    });

    test('ProjectWatcher debounces rapid reload requests', async () => {
      const reasons: string[] = [];
      const watcher = new ProjectWatcher({
        reload: async (reason?: string) => {
          reasons.push(reason ?? '');
          return createSnapshot('/workspace', []);
        },
      } as unknown as ProjectService, { debounceMs: 5, watch: false });

      watcher.scheduleReload('first');
      watcher.scheduleReload('second');
      watcher.scheduleReload('third');
      await delay(30);

      assert.deepStrictEqual(reasons, ['third']);
      watcher.dispose();
    });

    test('ProjectWatcher creates filelist watcher only while project indexing is enabled', () => {
      let enabled = false;
      let watchersCreated = 0;
      let watchersDisposed = 0;
      let watcherEventDisposablesDisposed = 0;
      let configListener: ((event: vscode.ConfigurationChangeEvent) => void) | undefined;
      const watcher = new ProjectWatcher({
        reload: async () => createSnapshot('/workspace', []),
      } as unknown as ProjectService, {
        createFileSystemWatcher: (() => {
          watchersCreated += 1;
          const event: vscode.Event<vscode.Uri> = (_listener, _thisArgs, _disposables) => ({
            dispose: () => {
              watcherEventDisposablesDisposed += 1;
            },
          });
          return {
            ignoreCreateEvents: false,
            ignoreChangeEvents: false,
            ignoreDeleteEvents: false,
            onDidCreate: event,
            onDidChange: event,
            onDidDelete: event,
            dispose: () => {
              watchersDisposed += 1;
            },
          };
        }) as typeof vscode.workspace.createFileSystemWatcher,
        onDidChangeConfiguration: ((listener) => {
          configListener = listener;
          return { dispose: () => undefined };
        }) as typeof vscode.workspace.onDidChangeConfiguration,
        settingsProvider: {
          getSettings: () => settings({ enabled }),
        },
      });

      assert.strictEqual(watchersCreated, 0);

      enabled = true;
      configListener?.(projectConfigurationChangeEvent());
      assert.strictEqual(watchersCreated, 1);
      assert.strictEqual(watchersDisposed, 0);

      enabled = false;
      configListener?.(projectConfigurationChangeEvent());
      assert.strictEqual(watchersCreated, 1);
      assert.strictEqual(watchersDisposed, 1);
      assert.strictEqual(watcherEventDisposablesDisposed, 3);

      watcher.dispose();
      assert.strictEqual(watchersDisposed, 1);
    });

    test('auto-discovery excludes large ignored directories before indexing', async function () {
      this.timeout(10000);
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-large-workspace-'));
      fs.mkdirSync(path.join(root, 'rtl'), { recursive: true });
      fs.mkdirSync(path.join(root, 'build'), { recursive: true });
      for (let i = 0; i < 30; i += 1) {
        fs.writeFileSync(path.join(root, 'build', `skip_${i}.sv`), `module skip_${i}; endmodule\n`);
      }
      fs.writeFileSync(path.join(root, 'rtl', 'keep.sv'), 'module keep; endmodule\n');
      const snapshot = await loadFixture(root, settings({ exclude: ['**/build/**'] }));
      const index = await buildIndex(snapshot);

      assert.strictEqual(snapshot.compileUnits[0]?.files.length, 1);
      assert.strictEqual(index.findModules('keep').length, 1);
      assert.strictEqual(index.getAllModules().some((moduleRecord) => moduleRecord.name.startsWith('skip_')), false);
    });
  });
});

function fixtureRoot(name: string): string {
  return path.join(getRepositoryRoot(), 'test', 'fixtures', 'hdl-projects', name);
}

function settings(overrides: Partial<ProjectSettings> = {}): ProjectSettings {
  return {
    enabled: true,
    filelists: [],
    activeTarget: '',
    topModules: [],
    includeDirs: [],
    defines: {},
    exclude: ['**/.git/**', '**/node_modules/**', '**/build/**', '**/sim/**'],
    maxAutoDiscoveredFiles: 5000,
    ...overrides,
  };
}

async function loadFixture(root: string, projectSettings: ProjectSettings): Promise<ProjectSnapshot> {
  const loader = new ProjectLoader(
    { getSettings: () => projectSettings },
    undefined,
    () => [{ uri: vscode.Uri.file(root), name: path.basename(root), index: 0 }]
  );
  return loader.load(1);
}

async function buildIndex(snapshot: ProjectSnapshot): Promise<SemanticIndex> {
  return new SemanticIndex(snapshot.version, await new FastIndexerBackend().build(snapshot));
}

function createStaticProjectService(): ProjectService {
  return {
    onDidChangeSnapshot: () => ({ dispose: () => undefined }),
  } as unknown as ProjectService;
}

function createIndexService(index: SemanticIndex): IndexService {
  return {
    getIndex: () => index,
  } as unknown as IndexService;
}

function createProjectServiceWithContext(context: ReturnType<FileContextResolver['getPreferredFileContext']>): ProjectService {
  return {
    getPreferredFileContext: () => context,
  } as unknown as ProjectService;
}

function createSnapshotProjectService(snapshot: ProjectSnapshot): ProjectService {
  const resolver = new FileContextResolver(snapshot);
  return {
    getSnapshot: () => snapshot,
    getFileContexts: (uri: vscode.Uri) => resolver.getFileContexts(uri),
    getPreferredFileContext: (uri: vscode.Uri) => resolver.getPreferredFileContext(uri),
  } as unknown as ProjectService;
}

function createSnapshot(workspaceRoot: string, symbols: SymbolRecord[]): ProjectSnapshot {
  const root = vscode.Uri.file(workspaceRoot);
  const files = symbols.length === 0
    ? []
    : [{ resolvedPath: symbols[0]?.uri.fsPath ?? path.join(workspaceRoot, 'empty.sv'), kind: 'source' as const }];
  return {
    version: 1,
    workspaceRoot: root,
    activeTargetId: '',
    compileUnits: [
      buildCompileUnit({
        id: 'unit',
        name: 'unit',
        root,
        files,
        includeDirs: [],
        defines: [],
        settingsIncludeDirs: [],
        settingsDefines: {},
        source: { type: 'settings' },
      }),
    ],
    diagnostics: [],
  };
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function projectConfigurationChangeEvent(): vscode.ConfigurationChangeEvent {
  return {
    affectsConfiguration: (section: string) => section === 'verilog.project',
  };
}
