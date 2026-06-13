// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { ProjectService } from '../project/ProjectService';
import type { CompileUnit, ProjectSnapshot, SourceFileRef } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { SemanticDiagnosticService, type SemanticDiagnosticSink } from '../semantic/SemanticDiagnosticService';
import { SemanticIndex } from '../semantic/SemanticIndex';
import type { ModuleRecord, ParameterRecord, PortRecord, SymbolRecord } from '../semantic/SymbolRecords';

class FakeSemanticDiagnosticSink implements SemanticDiagnosticSink {
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

  allDiagnostics(): vscode.Diagnostic[] {
    return [...this.diagnostics.values()].flat();
  }
}

suite('SemanticDiagnosticService', () => {
  let previousMacroSetting: boolean | undefined;
  let previousMaxFiles: number | undefined;

  setup(() => {
    const config = vscode.workspace.getConfiguration();
    previousMacroSetting = config.get<boolean>('verilog.semanticDiagnostics.unresolvedMacros.enabled');
    previousMaxFiles = config.get<number>('verilog.semanticDiagnostics.maxFiles');
  });

  teardown(async () => {
    const config = vscode.workspace.getConfiguration();
    await config.update(
      'verilog.semanticDiagnostics.unresolvedMacros.enabled',
      previousMacroSetting,
      vscode.ConfigurationTarget.Global
    );
    await config.update(
      'verilog.semanticDiagnostics.maxFiles',
      previousMaxFiles,
      vscode.ConfigurationTarget.Global
    );
  });

  test('reports unresolved module instances and clears after refresh', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', [
      'module top;',
      '  missing u_missing ();',
      'endmodule',
    ].join('\n'));
    const sink = new FakeSemanticDiagnosticSink();
    let index = new SemanticIndex(1, []);
    const service = createService(createSnapshot(root, [createCompileUnit(root, 'unit', [topUri])]), () => index, sink);

    await service.refresh('test');
    assertDiagnostic(sink, 'unresolved-module', 'Unresolved module instance: missing');

    index = new SemanticIndex(2, [createModuleRecord('missing', 'unit')]);
    await service.refresh('fixed');
    assert.strictEqual(sink.allDiagnostics().length, 0);
    assert.ok(sink.clearCalls >= 2);
    service.dispose();
  });

  test('does not report resolved modules', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', 'module top; child u_child (); endmodule');
    const sink = new FakeSemanticDiagnosticSink();
    const service = createService(
      createSnapshot(root, [createCompileUnit(root, 'unit', [topUri])]),
      () => new SemanticIndex(1, [createModuleRecord('child', 'unit')]),
      sink
    );

    await service.refresh('test');

    assert.strictEqual(sink.allDiagnostics().length, 0);
    service.dispose();
  });

  test('reports unknown named ports and parameters', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', [
      'module top;',
      '  child #(',
      '    .BAD_PARAM(1)',
      '  ) u_child (',
      '    .clk(clk),',
      '    .bad_port(sig)',
      '  );',
      'endmodule',
    ].join('\n'));
    const child = createModuleRecord('child', 'unit', {
      ports: [createPortRecord('clk', 'unit')],
      parameters: [createParameterRecord('WIDTH', 'unit')],
    });
    const sink = new FakeSemanticDiagnosticSink();
    const service = createService(
      createSnapshot(root, [createCompileUnit(root, 'unit', [topUri])]),
      () => new SemanticIndex(1, [child]),
      sink
    );

    await service.refresh('test');

    assertDiagnostic(sink, 'unknown-port', "Unknown port 'bad_port' on module 'child'");
    assertDiagnostic(sink, 'unknown-parameter', "Unknown parameter 'BAD_PARAM' on module 'child'");
    assert.ok(!sink.allDiagnostics().some((diagnostic) => diagnostic.message.includes("'clk'")));
    service.dispose();
  });

  test('does not report known named ports and parameters', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', [
      'module top;',
      '  child #(.WIDTH(8)) u_child (.clk(clk));',
      'endmodule',
    ].join('\n'));
    const child = createModuleRecord('child', 'unit', {
      ports: [createPortRecord('clk', 'unit')],
      parameters: [createParameterRecord('WIDTH', 'unit')],
    });
    const sink = new FakeSemanticDiagnosticSink();
    const service = createService(
      createSnapshot(root, [createCompileUnit(root, 'unit', [topUri])]),
      () => new SemanticIndex(1, [child]),
      sink
    );

    await service.refresh('test');

    assert.strictEqual(sink.allDiagnostics().length, 0);
    service.dispose();
  });

  test('reports unresolved includes and clears when the include becomes resolvable', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', '`include "defs.svh"\nmodule top; endmodule\n');
    const includeDir = vscode.Uri.file(path.join(root, 'include'));
    fs.mkdirSync(includeDir.fsPath);
    const sink = new FakeSemanticDiagnosticSink();
    const service = createService(
      createSnapshot(root, [createCompileUnit(root, 'unit', [topUri], { includeDirs: [includeDir] })]),
      () => new SemanticIndex(1, []),
      sink
    );

    await service.refresh('missing');
    assertDiagnostic(sink, 'unresolved-include', 'Unresolved include: defs.svh');

    fs.writeFileSync(path.join(includeDir.fsPath, 'defs.svh'), '`define SIM\n');
    await service.refresh('fixed');
    assert.strictEqual(sink.allDiagnostics().length, 0);
    service.dispose();
  });

  test('duplicate module names use preferred compile unit context', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', 'module top; child u_child (.b(sig)); endmodule');
    const unitA = createCompileUnit(root, 'unitA', [topUri], { name: 'unit A' });
    const unitB = createCompileUnit(root, 'unitB', [topUri], { name: 'unit B' });
    const childA = createModuleRecord('child', 'unitA', { ports: [createPortRecord('a', 'unitA')] });
    const childB = createModuleRecord('child', 'unitB', { ports: [createPortRecord('b', 'unitB')] });
    const sink = new FakeSemanticDiagnosticSink();
    const service = createService(
      createSnapshot(root, [unitA, unitB], { activeTargetId: 'unitB' }),
      () => new SemanticIndex(1, [childA, childB]),
      sink
    );

    await service.refresh('test');

    assert.strictEqual(sink.allDiagnostics().length, 0);
    service.dispose();
  });

  test('unresolved macro diagnostics are disabled by default and informational when enabled', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', 'module top; assign value = `MISSING; endmodule');
    const sink = new FakeSemanticDiagnosticSink();
    const service = createService(
      createSnapshot(root, [createCompileUnit(root, 'unit', [topUri])]),
      () => new SemanticIndex(1, []),
      sink
    );

    await vscode.workspace.getConfiguration().update(
      'verilog.semanticDiagnostics.unresolvedMacros.enabled',
      false,
      vscode.ConfigurationTarget.Global
    );
    await service.refresh('disabled');
    assert.strictEqual(sink.allDiagnostics().length, 0);

    await vscode.workspace.getConfiguration().update(
      'verilog.semanticDiagnostics.unresolvedMacros.enabled',
      true,
      vscode.ConfigurationTarget.Global
    );
    await service.refresh('enabled');
    const diagnostic = assertDiagnostic(sink, 'unresolved-macro', 'Unresolved macro: MISSING');
    assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Information);
    service.dispose();
  });

  test('project and source macros suppress unresolved macro diagnostics', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', 'module top; assign a = `PROJECT_DEF; assign b = `SOURCE_DEF; endmodule');
    const compileUnit = createCompileUnit(root, 'unit', [topUri], {
      defines: {
        PROJECT_DEF: { name: 'PROJECT_DEF', value: true, source: 'settings' },
      },
    });
    const sourceMacro = createSymbolRecord('SOURCE_DEF', 'macro', 'unit');
    const sink = new FakeSemanticDiagnosticSink();
    const service = createService(
      createSnapshot(root, [compileUnit]),
      () => new SemanticIndex(1, [sourceMacro]),
      sink
    );

    await vscode.workspace.getConfiguration().update(
      'verilog.semanticDiagnostics.unresolvedMacros.enabled',
      true,
      vscode.ConfigurationTarget.Global
    );
    await service.refresh('test');

    assert.strictEqual(sink.allDiagnostics().length, 0);
    service.dispose();
  });

  test('max file guard clears and skips diagnostics', async () => {
    const root = createTempRoot();
    const topUri = writeFile(root, 'top.sv', 'module top; missing u_missing (); endmodule');
    const sink = new FakeSemanticDiagnosticSink();
    const service = createService(
      createSnapshot(root, [createCompileUnit(root, 'unit', [topUri])]),
      () => new SemanticIndex(1, []),
      sink
    );

    await service.refresh('initial');
    assertDiagnostic(sink, 'unresolved-module', 'Unresolved module instance: missing');

    await vscode.workspace.getConfiguration().update(
      'verilog.semanticDiagnostics.maxFiles',
      0,
      vscode.ConfigurationTarget.Global
    );
    await service.refresh('guard');

    assert.strictEqual(sink.allDiagnostics().length, 0);
    service.dispose();
  });
});

function createService(
  snapshot: ProjectSnapshot,
  getIndex: () => SemanticIndex,
  sink: FakeSemanticDiagnosticSink
): SemanticDiagnosticService {
  const projectEmitter = new vscode.EventEmitter<ProjectSnapshot>();
  const indexEmitter = new vscode.EventEmitter<SemanticIndex>();
  const projectService = {
    getSnapshot: () => snapshot,
    onDidChangeSnapshot: projectEmitter.event,
  } as unknown as ProjectService;
  const indexService = {
    getIndex,
    onDidChangeIndex: indexEmitter.event,
  } as unknown as IndexService;
  return new SemanticDiagnosticService(projectService, indexService, sink, undefined, false);
}

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'verilog-semantic-diagnostics-'));
}

function writeFile(root: string, relativePath: string, content: string): vscode.Uri {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return vscode.Uri.file(filePath);
}

function createSnapshot(
  root: string,
  compileUnits: CompileUnit[],
  options: { activeTargetId?: string } = {}
): ProjectSnapshot {
  return {
    version: 1,
    workspaceRoot: vscode.Uri.file(root),
    activeTargetId: options.activeTargetId ?? '',
    compileUnits,
    diagnostics: [],
  };
}

function createCompileUnit(
  root: string,
  id: string,
  files: vscode.Uri[],
  options: Partial<Pick<CompileUnit, 'name' | 'includeDirs' | 'defines'>> = {}
): CompileUnit {
  return {
    id,
    name: options.name ?? id,
    root: vscode.Uri.file(root),
    files: files.map((uri, order): SourceFileRef => ({
      uri,
      languageId: 'systemverilog',
      kind: 'source',
      order,
    })),
    includeDirs: options.includeDirs ?? [],
    defines: options.defines ?? {},
    topModules: [],
    source: { type: 'settings' },
  };
}

function createModuleRecord(
  name: string,
  compileUnitId: string,
  options: { ports?: PortRecord[]; parameters?: ParameterRecord[] } = {}
): ModuleRecord {
  return {
    ...createSymbolRecord(name, 'module', compileUnitId),
    kind: 'module',
    ports: options.ports ?? [],
    parameters: options.parameters ?? [],
  };
}

function createPortRecord(name: string, compileUnitId: string): PortRecord {
  return {
    ...createSymbolRecord(name, 'port', compileUnitId),
    kind: 'port',
  };
}

function createParameterRecord(name: string, compileUnitId: string): ParameterRecord {
  return {
    ...createSymbolRecord(name, 'parameter', compileUnitId),
    kind: 'parameter',
  };
}

function createSymbolRecord(
  name: string,
  kind: SymbolRecord['kind'],
  compileUnitId: string
): SymbolRecord {
  const range = new vscode.Range(0, 0, 0, name.length);
  return {
    id: `${compileUnitId}:${kind}:${name}`,
    name,
    kind,
    uri: vscode.Uri.file(`/workspace/${compileUnitId}/${name}.sv`),
    range,
    selectionRange: range,
    compileUnitId,
  };
}

function assertDiagnostic(
  sink: FakeSemanticDiagnosticSink,
  code: string,
  message: string
): vscode.Diagnostic {
  const diagnostic = sink.allDiagnostics().find((candidate) =>
    candidate.code === code && candidate.message === message
  );
  assert.ok(diagnostic, `Expected diagnostic ${code}: ${message}`);
  assert.strictEqual(diagnostic.source, 'verilog.semantic');
  return diagnostic;
}
