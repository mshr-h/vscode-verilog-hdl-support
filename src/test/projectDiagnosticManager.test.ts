// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProjectDiagnosticManager, type ProjectDiagnosticSink } from '../project/ProjectDiagnosticManager';
import type { ProjectService } from '../project/ProjectService';
import type { ProjectSnapshot } from '../project/ProjectTypes';

class FakeProjectDiagnosticSink implements ProjectDiagnosticSink {
  readonly diagnostics = new Map<string, readonly vscode.Diagnostic[]>();
  clearCalls = 0;
  disposeCalls = 0;

  set(uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]): void {
    this.diagnostics.set(uri.toString(), diagnostics);
  }

  clear(): void {
    this.diagnostics.clear();
    this.clearCalls += 1;
  }

  dispose(): void {
    this.disposeCalls += 1;
  }
}

suite('ProjectDiagnosticManager', () => {
  test('publishes location diagnostics grouped by URI and maps severity', () => {
    const sink = new FakeProjectDiagnosticSink();
    const uri = vscode.Uri.file('/workspace/files.f');
    const manager = new ProjectDiagnosticManager(createProjectService(createSnapshot()), sink);

    manager.publish({
      ...createSnapshot(),
      diagnostics: [
        {
          severity: 'error',
          message: 'missing source',
          source: 'verilog.project',
          code: 'missing-source-file',
          location: new vscode.Location(uri, new vscode.Range(1, 2, 1, 3)),
        },
        {
          severity: 'warning',
          message: 'missing include',
          source: 'verilog.project',
          code: 'missing-include-dir',
          location: new vscode.Location(uri, new vscode.Range(2, 0, 2, 1)),
        },
        {
          severity: 'info',
          message: 'unlocated info',
          source: 'verilog.project',
          code: 'project-info',
        },
      ],
    });

    const diagnostics = sink.diagnostics.get(uri.toString());
    assert.strictEqual(diagnostics?.length, 2);
    assert.strictEqual(diagnostics?.[0]?.severity, vscode.DiagnosticSeverity.Error);
    assert.strictEqual(diagnostics?.[0]?.code, 'missing-source-file');
    assert.strictEqual(diagnostics?.[1]?.severity, vscode.DiagnosticSeverity.Warning);
    assert.ok(![...sink.diagnostics.values()].flat().some((diagnostic) => diagnostic.message === 'unlocated info'));
    manager.dispose();
  });

  test('clears stale diagnostics on new snapshot', () => {
    const sink = new FakeProjectDiagnosticSink();
    const uri = vscode.Uri.file('/workspace/files.f');
    const manager = new ProjectDiagnosticManager(createProjectService(createSnapshot()), sink);

    manager.publish({
      ...createSnapshot(),
      diagnostics: [{
        severity: 'error',
        message: 'stale',
        source: 'verilog.project',
        location: new vscode.Location(uri, new vscode.Range(0, 0, 0, 1)),
      }],
    });
    assert.strictEqual(sink.diagnostics.size, 1);

    manager.publish(createSnapshot());

    assert.strictEqual(sink.diagnostics.size, 0);
    assert.ok(sink.clearCalls >= 2);
    manager.dispose();
    assert.strictEqual(sink.disposeCalls, 1);
  });
});

function createProjectService(snapshot: ProjectSnapshot): ProjectService {
  return {
    getSnapshot: () => snapshot,
    onDidChangeSnapshot: () => ({ dispose: () => undefined }),
  } as unknown as ProjectService;
}

function createSnapshot(): ProjectSnapshot {
  return {
    version: 1,
    workspaceRoot: vscode.Uri.file('/workspace'),
    activeTargetId: '',
    compileUnits: [],
    diagnostics: [],
  };
}
