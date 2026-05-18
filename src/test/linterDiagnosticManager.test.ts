// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import LinterDiagnosticManager, {
  type DiagnosticMap,
  type DiagnosticSink,
} from '../linter/LinterDiagnosticManager';

class FakeDiagnosticSink implements DiagnosticSink {
  readonly diagnostics = new Map<string, readonly vscode.Diagnostic[]>();
  readonly setCalls: string[] = [];
  readonly deleteCalls: string[] = [];
  clearCalls = 0;
  disposeCalls = 0;

  set(uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]): void {
    this.diagnostics.set(uri.toString(), diagnostics);
    this.setCalls.push(uri.toString());
  }

  delete(uri: vscode.Uri): void {
    this.diagnostics.delete(uri.toString());
    this.deleteCalls.push(uri.toString());
  }

  clear(): void {
    this.diagnostics.clear();
    this.clearCalls++;
  }

  dispose(): void {
    this.disposeCalls++;
  }
}

function diagnostic(message: string): vscode.Diagnostic {
  return new vscode.Diagnostic(
    new vscode.Range(0, 0, 0, 1),
    message,
    vscode.DiagnosticSeverity.Error
  );
}

function mapFor(entries: Array<[vscode.Uri, vscode.Diagnostic[]]>): DiagnosticMap {
  const diagnosticsByUri: DiagnosticMap = new Map();
  for (const [uri, diagnostics] of entries) {
    diagnosticsByUri.set(uri.toString(), { uri, diagnostics });
  }
  return diagnosticsByUri;
}

suite('LinterDiagnosticManager', () => {
  test('replaceRunDiagnostics stores diagnostics', () => {
    const sink = new FakeDiagnosticSink();
    const manager = new LinterDiagnosticManager(sink);
    const uri = vscode.Uri.file('/tmp/a.v');
    const diagnostics = [diagnostic('a')];

    manager.replaceRunDiagnostics('iverilog', uri, mapFor([[uri, diagnostics]]));

    assert.deepStrictEqual(sink.diagnostics.get(uri.toString()), diagnostics);
    assert.deepStrictEqual(sink.setCalls, [uri.toString()]);
  });

  test('replaceRunDiagnostics clears stale target files from the same owner', () => {
    const sink = new FakeDiagnosticSink();
    const manager = new LinterDiagnosticManager(sink);
    const owner = vscode.Uri.file('/tmp/a.v');
    const dependency = vscode.Uri.file('/tmp/dep.v');
    const nextDiagnostics = [diagnostic('next')];

    manager.replaceRunDiagnostics(
      'iverilog',
      owner,
      mapFor([
        [owner, [diagnostic('owner')]],
        [dependency, [diagnostic('dependency')]],
      ])
    );
    manager.replaceRunDiagnostics('iverilog', owner, mapFor([[owner, nextDiagnostics]]));

    assert.deepStrictEqual(sink.diagnostics.get(owner.toString()), nextDiagnostics);
    assert.ok(!sink.diagnostics.has(dependency.toString()));
    assert.ok(sink.deleteCalls.includes(dependency.toString()));
  });

  test('multiple owners targeting the same file are aggregated', () => {
    const sink = new FakeDiagnosticSink();
    const manager = new LinterDiagnosticManager(sink);
    const owner1 = vscode.Uri.file('/tmp/top1.v');
    const owner2 = vscode.Uri.file('/tmp/top2.v');
    const shared = vscode.Uri.file('/tmp/shared.v');
    const diagnostic1 = diagnostic('from top1');
    const diagnostic2 = diagnostic('from top2');

    manager.replaceRunDiagnostics('iverilog', owner1, mapFor([[shared, [diagnostic1]]]));
    manager.replaceRunDiagnostics('iverilog', owner2, mapFor([[shared, [diagnostic2]]]));

    assert.deepStrictEqual(sink.diagnostics.get(shared.toString()), [diagnostic1, diagnostic2]);

    manager.clearOwner('iverilog', owner1);

    assert.deepStrictEqual(sink.diagnostics.get(shared.toString()), [diagnostic2]);
    assert.ok(!sink.deleteCalls.includes(shared.toString()));
  });

  test('multiple sources targeting the same file are aggregated', () => {
    const sink = new FakeDiagnosticSink();
    const manager = new LinterDiagnosticManager(sink);
    const uri = vscode.Uri.file('/tmp/a.v');
    const iverilogDiagnostic = diagnostic('iverilog');
    const verilatorDiagnostic = diagnostic('verilator');

    manager.replaceRunDiagnostics('iverilog', uri, mapFor([[uri, [iverilogDiagnostic]]]));
    manager.replaceRunDiagnostics('verilator', uri, mapFor([[uri, [verilatorDiagnostic]]]));

    assert.deepStrictEqual(sink.diagnostics.get(uri.toString()), [
      iverilogDiagnostic,
      verilatorDiagnostic,
    ]);

    manager.clearSource('iverilog');

    assert.deepStrictEqual(sink.diagnostics.get(uri.toString()), [verilatorDiagnostic]);
  });

  test('clearSource removes only that source', () => {
    const sink = new FakeDiagnosticSink();
    const manager = new LinterDiagnosticManager(sink);
    const uri = vscode.Uri.file('/tmp/a.v');
    const veribleDiagnostic = diagnostic('verible');

    manager.replaceRunDiagnostics('iverilog', uri, mapFor([[uri, [diagnostic('iverilog')]]]));
    manager.replaceRunDiagnostics('verible-verilog-lint', uri, mapFor([[uri, [veribleDiagnostic]]]));
    manager.clearSource('iverilog');

    assert.deepStrictEqual(sink.diagnostics.get(uri.toString()), [veribleDiagnostic]);
  });

  test('clearTargetUri removes all diagnostics for that target URI', () => {
    const sink = new FakeDiagnosticSink();
    const manager = new LinterDiagnosticManager(sink);
    const owner = vscode.Uri.file('/tmp/top.v');
    const target = vscode.Uri.file('/tmp/shared.v');

    manager.replaceRunDiagnostics('iverilog', owner, mapFor([[target, [diagnostic('a')]]]));
    manager.replaceRunDiagnostics('verilator', owner, mapFor([[target, [diagnostic('b')]]]));
    manager.clearTargetUri(target);

    assert.ok(!sink.diagnostics.has(target.toString()));
    assert.strictEqual(sink.deleteCalls[sink.deleteCalls.length - 1], target.toString());
  });

  test('clearAll clears internal state and calls collection clear', () => {
    const sink = new FakeDiagnosticSink();
    const manager = new LinterDiagnosticManager(sink);
    const uri = vscode.Uri.file('/tmp/a.v');

    manager.replaceRunDiagnostics('iverilog', uri, mapFor([[uri, [diagnostic('a')]]]));
    manager.clearAll();
    manager.replaceRunDiagnostics('verilator', uri, new Map());

    assert.strictEqual(sink.clearCalls, 1);
    assert.strictEqual(sink.diagnostics.size, 0);
  });
});

suite('Linter diagnostic publication regression', () => {
  test('linter implementations do not mutate raw diagnostic collections', () => {
    const linterDir = path.join(__dirname, '..', 'linter');
    const files = fs
      .readdirSync(linterDir)
      .filter(
        (file) =>
          file.endsWith('Linter.js') &&
          file !== 'BaseLinter.js' &&
          file !== 'LinterDiagnosticManager.js'
      );

    for (const file of files) {
      const source = fs.readFileSync(path.join(linterDir, file), 'utf8');
      assert.ok(!source.includes('diagnosticCollection.clear'), `${file} must not clear directly`);
      assert.ok(!source.includes('diagnosticCollection.set'), `${file} must not set directly`);
      assert.ok(!source.includes('diagnosticCollection.delete'), `${file} must not delete directly`);
    }
  });
});
