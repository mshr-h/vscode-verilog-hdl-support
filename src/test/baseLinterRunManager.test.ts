// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import BaseLinter, { type LintDecision } from '../linter/BaseLinter';
import LintManager from '../linter/LintManager';
import LinterDiagnosticManager, { type DiagnosticSink } from '../linter/LinterDiagnosticManager';
import LintRunManager, { type LintRunHandle } from '../linter/LintRunManager';
import type { LintRunOptions } from '../linter/LintMode';
import type { ProjectService } from '../project/ProjectService';

class FakeDiagnosticSink implements DiagnosticSink {
  readonly diagnostics = new Map<string, readonly vscode.Diagnostic[]>();
  readonly deleteCalls: string[] = [];

  set(uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]): void {
    this.diagnostics.set(uri.toString(), diagnostics);
  }

  delete(uri: vscode.Uri): void {
    this.diagnostics.delete(uri.toString());
    this.deleteCalls.push(uri.toString());
  }

  clear(): void {
    this.diagnostics.clear();
  }

  dispose(): void {
    // no-op
  }
}

class Deferred {
  promise: Promise<void>;
  private resolvePromise!: () => void;

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  resolve(): void {
    this.resolvePromise();
  }
}

type LintAction = (
  linter: TestLinter,
  doc: vscode.TextDocument,
  run: LintRunHandle,
  options: LintRunOptions
) => Promise<void>;

class TestLinter extends BaseLinter {
  private actions: LintAction[] = [];

  constructor(
    diagnosticManager: LinterDiagnosticManager,
    runManager: LintRunManager,
    readonly sourceId = 'test-linter',
    projectService?: ProjectService
  ) {
    super(sourceId, diagnosticManager, runManager, projectService);
  }

  queueAction(action: LintAction): void {
    this.actions.push(action);
  }

  publishMessage(doc: vscode.TextDocument, run: LintRunHandle, message: string): void {
    this.publishDocumentDiagnosticsIfCurrent(doc, run, [
      new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        message,
        vscode.DiagnosticSeverity.Error
      ),
    ]);
  }

  publishClean(doc: vscode.TextDocument, run: LintRunHandle): void {
    this.publishDocumentDiagnosticsIfCurrent(doc, run, []);
  }

  protected convertToSeverity(_severityString: string): vscode.DiagnosticSeverity {
    return vscode.DiagnosticSeverity.Error;
  }

  async decide(doc: vscode.TextDocument, options: LintRunOptions): Promise<LintDecision> {
    return this.getLintDecision(doc, options);
  }

  protected async lint(
    doc: vscode.TextDocument,
    run: LintRunHandle,
    options: LintRunOptions
  ): Promise<void> {
    const action = this.actions.shift();
    if (action) {
      await action(this, doc, run, options);
    }
  }
}

function documentFor(uri: vscode.Uri): vscode.TextDocument {
  return { uri } as vscode.TextDocument;
}

function docUri(fsPath: string): vscode.Uri {
  return vscode.Uri.file(fsPath);
}

function createHarness(sourceId?: string): {
  sink: FakeDiagnosticSink;
  runManager: LintRunManager;
  linter: TestLinter;
  doc: vscode.TextDocument;
} {
  const sink = new FakeDiagnosticSink();
  const runManager = new LintRunManager();
  const linter = new TestLinter(new LinterDiagnosticManager(sink), runManager, sourceId);
  const doc = documentFor(vscode.Uri.file('/tmp/top.v'));
  return { sink, runManager, linter, doc };
}

function createHarnessWithProject(projectService: ProjectService): {
  sink: FakeDiagnosticSink;
  runManager: LintRunManager;
  linter: TestLinter;
  doc: vscode.TextDocument;
} {
  const sink = new FakeDiagnosticSink();
  const runManager = new LintRunManager();
  const doc = documentFor(vscode.Uri.file('/tmp/a.sv'));
  const linter = new TestLinter(new LinterDiagnosticManager(sink), runManager, 'test-linter', projectService);
  return { sink, runManager, linter, doc };
}

function createProjectServiceForCompileUnit(ownerUri: vscode.Uri, fileCount: number): ProjectService {
  const files = Array.from({ length: fileCount }, (_, index) => ({
    uri: index === 0 ? ownerUri : vscode.Uri.file(`/tmp/${index}.sv`),
    languageId: 'systemverilog' as const,
    kind: 'source' as const,
    order: index,
  }));
  return {
    getPreferredFileContext: () => ({
      file: ownerUri,
      compileUnitId: 'unit',
      includeDirs: [],
      defines: {},
    }),
    getSnapshot: () => ({
      version: 1,
      workspaceRoot: vscode.Uri.file('/tmp'),
      activeTargetId: 'unit',
      compileUnits: [{
        id: 'unit',
        name: 'unit',
        root: vscode.Uri.file('/tmp'),
        files,
        includeDirs: [],
        defines: {},
        topModules: [],
        source: { type: 'settings' },
      }],
      diagnostics: [],
    }),
  } as unknown as ProjectService;
}

suite('BaseLinter run management', () => {
  test('BaseLinter.dispose is idempotent', () => {
    const { linter } = createHarness();

    assert.doesNotThrow(() => {
      linter.dispose();
      linter.dispose();
    });
  });

  test('LintManager.dispose disposes active linter', () => {
    const manager = new LintManager();
    let disposeCount = 0;
    const existingLinter = (manager as any).linter as BaseLinter | null;
    existingLinter?.dispose();
    (manager as any).linter = {
      name: 'fake-linter',
      dispose: () => {
        disposeCount++;
      },
    } as BaseLinter;

    manager.dispose();
    manager.dispose();

    assert.strictEqual(disposeCount, 1);
    assert.strictEqual((manager as any).linter, null);
  });

  test('compile-unit maxFiles guard skips automatic runs', async () => {
    const config = vscode.workspace.getConfiguration('verilog.linting');
    const compileConfig = vscode.workspace.getConfiguration('verilog.linting.compileUnit');
    const previousMode = config.get('mode');
    const previousMaxFiles = compileConfig.get('maxFiles');
    const { linter, doc } = createHarnessWithProject(createProjectServiceForCompileUnit(docUri('/tmp/a.sv'), 2));

    try {
      await config.update('mode', 'compileUnit', vscode.ConfigurationTarget.Global);
      await compileConfig.update('maxFiles', 1, vscode.ConfigurationTarget.Global);
      const decision = await linter.decide(doc, { trigger: 'automatic' });

      assert.strictEqual(decision.kind, 'skip');
    } finally {
      await config.update('mode', previousMode, vscode.ConfigurationTarget.Global);
      await compileConfig.update('maxFiles', previousMaxFiles, vscode.ConfigurationTarget.Global);
    }
  });

  test('manual compile-unit lint can bypass large-run confirmation when disabled', async () => {
    const config = vscode.workspace.getConfiguration('verilog.linting');
    const compileConfig = vscode.workspace.getConfiguration('verilog.linting.compileUnit');
    const previousMode = config.get('mode');
    const previousMaxFiles = compileConfig.get('maxFiles');
    const previousWarn = compileConfig.get('warnBeforeLargeRun');
    const { linter, doc } = createHarnessWithProject(createProjectServiceForCompileUnit(docUri('/tmp/a.sv'), 2));

    try {
      await config.update('mode', 'compileUnit', vscode.ConfigurationTarget.Global);
      await compileConfig.update('maxFiles', 1, vscode.ConfigurationTarget.Global);
      await compileConfig.update('warnBeforeLargeRun', false, vscode.ConfigurationTarget.Global);
      const decision = await linter.decide(doc, { trigger: 'manual' });

      assert.strictEqual(decision.kind, 'compileUnit');
    } finally {
      await config.update('mode', previousMode, vscode.ConfigurationTarget.Global);
      await compileConfig.update('maxFiles', previousMaxFiles, vscode.ConfigurationTarget.Global);
      await compileConfig.update('warnBeforeLargeRun', previousWarn, vscode.ConfigurationTarget.Global);
    }
  });

  test('stale run cannot publish diagnostics', async () => {
    const { sink, linter, doc } = createHarness();
    const firstDeferred = new Deferred();

    linter.queueAction(async (testLinter, ownerDoc, run) => {
      await firstDeferred.promise;
      testLinter.publishMessage(ownerDoc, run, 'old');
    });
    const firstRun = linter.startLint(doc);

    linter.queueAction(async (testLinter, ownerDoc, run) => {
      testLinter.publishMessage(ownerDoc, run, 'new');
    });
    await linter.startLint(doc);

    firstDeferred.resolve();
    await firstRun;

    const diagnostics = sink.diagnostics.get(doc.uri.toString()) ?? [];
    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].message, 'new');
  });

  test('stale run cannot publish empty diagnostics and clear newer diagnostics', async () => {
    const { sink, linter, doc } = createHarness();
    const firstDeferred = new Deferred();

    linter.queueAction(async (testLinter, ownerDoc, run) => {
      await firstDeferred.promise;
      testLinter.publishClean(ownerDoc, run);
    });
    const firstRun = linter.startLint(doc);

    linter.queueAction(async (testLinter, ownerDoc, run) => {
      testLinter.publishMessage(ownerDoc, run, 'new');
    });
    await linter.startLint(doc);

    firstDeferred.resolve();
    await firstRun;

    const diagnostics = sink.diagnostics.get(doc.uri.toString()) ?? [];
    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].message, 'new');
  });

  test('latest clean run clears previous diagnostics', async () => {
    const { sink, linter, doc } = createHarness();

    linter.queueAction(async (testLinter, ownerDoc, run) => {
      testLinter.publishMessage(ownerDoc, run, 'old');
    });
    await linter.startLint(doc);

    linter.queueAction(async (testLinter, ownerDoc, run) => {
      testLinter.publishClean(ownerDoc, run);
    });
    await linter.startLint(doc);

    assert.ok(!sink.diagnostics.has(doc.uri.toString()));
    assert.ok(sink.deleteCalls.includes(doc.uri.toString()));
  });

  test('owner cancellation prevents publish', async () => {
    const { sink, runManager, linter, doc } = createHarness();
    const deferred = new Deferred();

    linter.queueAction(async (testLinter, ownerDoc, run) => {
      await deferred.promise;
      testLinter.publishMessage(ownerDoc, run, 'cancelled');
    });
    const lintRun = linter.startLint(doc);

    runManager.cancelOwner(doc.uri);
    deferred.resolve();
    await lintRun;

    assert.ok(!sink.diagnostics.has(doc.uri.toString()));
  });

  test('source cancellation prevents publish', async () => {
    const { sink, runManager, linter, doc } = createHarness('source-to-cancel');
    const deferred = new Deferred();

    linter.queueAction(async (testLinter, ownerDoc, run) => {
      await deferred.promise;
      testLinter.publishMessage(ownerDoc, run, 'cancelled');
    });
    const lintRun = linter.startLint(doc);

    runManager.cancelSource('source-to-cancel');
    deferred.resolve();
    await lintRun;

    assert.ok(!sink.diagnostics.has(doc.uri.toString()));
  });
});
