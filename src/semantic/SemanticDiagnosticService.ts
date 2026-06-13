// SPDX-License-Identifier: MIT
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { InstanceScanner } from '../hierarchy/InstanceScanner';
import type { ModuleInstanceRecord, NamedConnectionRecord } from '../hierarchy/HierarchyTypes';
import { getExtensionLogger } from '../logging';
import { FileContextResolver } from '../project/FileContextResolver';
import type { ProjectService } from '../project/ProjectService';
import type { CompileUnit, FileContext, ProjectSnapshot } from '../project/ProjectTypes';
import type { IndexService } from './IndexService';
import type { SemanticIndex } from './SemanticIndex';
import type { ModuleRecord } from './SymbolRecords';

const logger = getExtensionLogger('Semantic', 'Diagnostics');
const SEMANTIC_DIAGNOSTIC_SOURCE = 'verilog.semantic';
const REFRESH_DEBOUNCE_MS = 300;

const MACRO_DIRECTIVES = new Set([
  'begin_keywords',
  'celldefine',
  'default_nettype',
  'define',
  'else',
  'elsif',
  'end_keywords',
  'endcelldefine',
  'endif',
  'ifdef',
  'ifndef',
  'include',
  'line',
  'nounconnected_drive',
  'pragma',
  'resetall',
  'timescale',
  'undef',
  'undefineall',
  'unconnected_drive',
]);

export interface SemanticDiagnosticSink {
  set(uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]): void;
  clear(): void;
  dispose(): void;
}

interface SemanticDiagnosticSettings {
  enabled: boolean;
  unresolvedModules: boolean;
  unknownPorts: boolean;
  unknownParameters: boolean;
  unresolvedIncludes: boolean;
  unresolvedMacros: boolean;
  maxFiles: number;
}

interface IncludeOccurrence {
  includeText: string;
  range: vscode.Range;
}

interface MacroOccurrence {
  name: string;
  range: vscode.Range;
}

export class SemanticDiagnosticService implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly scanner: InstanceScanner;
  private refreshTimer: NodeJS.Timeout | undefined;
  private refreshSerial = 0;

  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService,
    private readonly sink: SemanticDiagnosticSink = vscode.languages.createDiagnosticCollection('verilog-semantic'),
    scanner = new InstanceScanner(),
    autoRefresh = true
  ) {
    this.scanner = scanner;
    this.disposables.push(
      projectService.onDidChangeSnapshot(() => this.scheduleRefresh('project-changed')),
      indexService.onDidChangeIndex(() => this.scheduleRefresh('index-changed'))
    );
    if (autoRefresh) {
      this.scheduleRefresh('activation');
    }
  }

  async refresh(reason = 'manual'): Promise<void> {
    const serial = this.refreshSerial + 1;
    this.refreshSerial = serial;
    const settings = getSemanticDiagnosticSettings();
    if (!settings.enabled) {
      this.sink.clear();
      return;
    }

    const snapshot = this.projectService.getSnapshot();
    const fileCount = countCompileUnitFiles(snapshot);
    if (fileCount > settings.maxFiles) {
      logger.warn('Skipping Verilog semantic diagnostics because the project is too large', {
        reason,
        files: fileCount,
        maxFiles: settings.maxFiles,
      });
      this.sink.clear();
      return;
    }

    logger.debug('Refreshing Verilog semantic diagnostics', {
      reason,
      version: snapshot.version,
      files: fileCount,
    });

    const diagnosticsByUri = new Map<string, { uri: vscode.Uri; diagnostics: vscode.Diagnostic[] }>();
    const index = this.indexService.getIndex();
    const contextResolver = new FileContextResolver(snapshot);

    for (const entry of getUniqueProjectFiles(snapshot)) {
      try {
        const text = await fs.readFile(entry.uri.fsPath, 'utf8');
        if (serial !== this.refreshSerial) {
          return;
        }
        const context = contextResolver.getPreferredFileContext(entry.uri) ?? createFallbackContext(entry.uri, entry.compileUnit);
        this.collectFileDiagnostics(
          text,
          entry.uri,
          context.compileUnitId,
          context,
          index,
          settings,
          diagnosticsByUri
        );
      } catch (error) {
        logger.debug('Skipping unreadable file during semantic diagnostics', {
          file: entry.uri.fsPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (serial !== this.refreshSerial) {
      return;
    }
    this.sink.clear();
    for (const entry of diagnosticsByUri.values()) {
      this.sink.set(entry.uri, entry.diagnostics);
    }
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.sink.dispose();
  }

  private scheduleRefresh(reason: string): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      void this.refresh(reason);
    }, REFRESH_DEBOUNCE_MS);
  }

  private collectFileDiagnostics(
    text: string,
    uri: vscode.Uri,
    compileUnitId: string,
    context: FileContext,
    index: SemanticIndex,
    settings: SemanticDiagnosticSettings,
    diagnosticsByUri: Map<string, { uri: vscode.Uri; diagnostics: vscode.Diagnostic[] }>
  ): void {
    const instances = this.scanner.scan(text, uri, compileUnitId);
    for (const instance of instances) {
      this.collectInstanceDiagnostics(instance, index, settings, diagnosticsByUri);
    }

    if (settings.unresolvedIncludes) {
      for (const occurrence of scanIncludeOccurrences(text)) {
        if (!index.resolveInclude(occurrence.includeText, context)) {
          addDiagnostic(diagnosticsByUri, uri, {
            range: occurrence.range,
            message: `Unresolved include: ${occurrence.includeText.slice(1, -1)}`,
            code: 'unresolved-include',
            severity: vscode.DiagnosticSeverity.Warning,
          });
        }
      }
    }

    if (settings.unresolvedMacros) {
      for (const occurrence of scanMacroOccurrences(text)) {
        if (!isMacroResolved(occurrence.name, context, index)) {
          addDiagnostic(diagnosticsByUri, uri, {
            range: occurrence.range,
            message: `Unresolved macro: ${occurrence.name}`,
            code: 'unresolved-macro',
            severity: vscode.DiagnosticSeverity.Information,
          });
        }
      }
    }
  }

  private collectInstanceDiagnostics(
    instance: ModuleInstanceRecord,
    index: SemanticIndex,
    settings: SemanticDiagnosticSettings,
    diagnosticsByUri: Map<string, { uri: vscode.Uri; diagnostics: vscode.Diagnostic[] }>
  ): void {
    const moduleRecord = index.findBestModule(instance.moduleName, instance.compileUnitId);
    if (!moduleRecord) {
      if (settings.unresolvedModules) {
        addDiagnostic(diagnosticsByUri, instance.uri, {
          range: instance.moduleNameRange,
          message: `Unresolved module instance: ${instance.moduleName}`,
          code: 'unresolved-module',
          severity: vscode.DiagnosticSeverity.Warning,
        });
      }
      return;
    }

    if (settings.unknownPorts) {
      this.collectUnknownConnections(
        instance,
        moduleRecord,
        instance.portConnectionRecords,
        new Set(moduleRecord.ports.map((port) => port.name)),
        'unknown-port',
        (name) => `Unknown port '${name}' on module '${moduleRecord.name}'`,
        diagnosticsByUri
      );
    }

    if (settings.unknownParameters) {
      this.collectUnknownConnections(
        instance,
        moduleRecord,
        instance.parameterOverrideConnections,
        new Set(moduleRecord.parameters.map((parameter) => parameter.name)),
        'unknown-parameter',
        (name) => `Unknown parameter '${name}' on module '${moduleRecord.name}'`,
        diagnosticsByUri
      );
    }
  }

  private collectUnknownConnections(
    instance: ModuleInstanceRecord,
    _moduleRecord: ModuleRecord,
    connections: readonly NamedConnectionRecord[],
    knownNames: Set<string>,
    code: string,
    message: (name: string) => string,
    diagnosticsByUri: Map<string, { uri: vscode.Uri; diagnostics: vscode.Diagnostic[] }>
  ): void {
    for (const connection of connections) {
      if (!knownNames.has(connection.name)) {
        addDiagnostic(diagnosticsByUri, instance.uri, {
          range: connection.range,
          message: message(connection.name),
          code,
          severity: vscode.DiagnosticSeverity.Warning,
        });
      }
    }
  }
}

function addDiagnostic(
  diagnosticsByUri: Map<string, { uri: vscode.Uri; diagnostics: vscode.Diagnostic[] }>,
  uri: vscode.Uri,
  input: { range: vscode.Range; message: string; code: string; severity: vscode.DiagnosticSeverity }
): void {
  const diagnostic = new vscode.Diagnostic(input.range, input.message, input.severity);
  diagnostic.source = SEMANTIC_DIAGNOSTIC_SOURCE;
  diagnostic.code = input.code;
  const key = uri.toString();
  const entry = diagnosticsByUri.get(key) ?? { uri, diagnostics: [] };
  entry.diagnostics.push(diagnostic);
  diagnosticsByUri.set(key, entry);
}

function countCompileUnitFiles(snapshot: ProjectSnapshot): number {
  return snapshot.compileUnits.reduce((sum, compileUnit) => sum + compileUnit.files.length, 0);
}

function getUniqueProjectFiles(snapshot: ProjectSnapshot): Array<{ uri: vscode.Uri; compileUnit: CompileUnit }> {
  const files = new Map<string, { uri: vscode.Uri; compileUnit: CompileUnit }>();
  for (const compileUnit of snapshot.compileUnits) {
    for (const file of compileUnit.files) {
      const key = file.uri.toString();
      if (!files.has(key)) {
        files.set(key, { uri: file.uri, compileUnit });
      }
    }
  }
  return [...files.values()];
}

function createFallbackContext(file: vscode.Uri, compileUnit: CompileUnit): FileContext {
  return {
    file,
    compileUnitId: compileUnit.id,
    includeDirs: compileUnit.includeDirs.slice(),
    defines: { ...compileUnit.defines },
  };
}

function isMacroResolved(name: string, context: FileContext, index: SemanticIndex): boolean {
  return Boolean(
    context.defines[name] ??
    index.findSymbolsByName(name, { compileUnitId: context.compileUnitId, kinds: ['macro'] })[0] ??
    index.findSymbolsByName(name, { kinds: ['macro'] })[0]
  );
}

function getSemanticDiagnosticSettings(): SemanticDiagnosticSettings {
  const config = vscode.workspace.getConfiguration();
  return {
    enabled: config.get<boolean>('verilog.semanticDiagnostics.enabled', true),
    unresolvedModules: config.get<boolean>('verilog.semanticDiagnostics.unresolvedModules.enabled', true),
    unknownPorts: config.get<boolean>('verilog.semanticDiagnostics.unknownPorts.enabled', true),
    unknownParameters: config.get<boolean>('verilog.semanticDiagnostics.unknownParameters.enabled', true),
    unresolvedIncludes: config.get<boolean>('verilog.semanticDiagnostics.unresolvedIncludes.enabled', true),
    unresolvedMacros: config.get<boolean>('verilog.semanticDiagnostics.unresolvedMacros.enabled', false),
    maxFiles: config.get<number>('verilog.semanticDiagnostics.maxFiles', 1000),
  };
}

export function scanIncludeOccurrences(text: string): IncludeOccurrence[] {
  const masked = maskComments(text);
  const lineStarts = computeLineStarts(text);
  const occurrences: IncludeOccurrence[] = [];
  for (const match of masked.matchAll(/`include\s+(["<])([^">]+)[">]/g)) {
    const open = match[1] ?? '"';
    const includePath = match[2] ?? '';
    const matchOffset = match.index ?? 0;
    const pathOffsetInMatch = match[0].indexOf(includePath);
    const pathOffset = matchOffset + pathOffsetInMatch;
    const close = open === '<' ? '>' : '"';
    occurrences.push({
      includeText: `${open}${includePath}${close}`,
      range: new vscode.Range(
        positionFromOffset(lineStarts, pathOffset),
        positionFromOffset(lineStarts, pathOffset + includePath.length)
      ),
    });
  }
  return occurrences;
}

export function scanMacroOccurrences(text: string): MacroOccurrence[] {
  const masked = maskCommentsAndStrings(text);
  const lineStarts = computeLineStarts(text);
  const occurrences: MacroOccurrence[] = [];
  for (const match of masked.matchAll(/`([A-Za-z_][A-Za-z0-9_$]*)/g)) {
    const name = match[1] ?? '';
    if (MACRO_DIRECTIVES.has(name)) {
      continue;
    }
    const nameOffset = (match.index ?? 0) + 1;
    occurrences.push({
      name,
      range: new vscode.Range(
        positionFromOffset(lineStarts, nameOffset),
        positionFromOffset(lineStarts, nameOffset + name.length)
      ),
    });
  }
  return occurrences;
}

function maskComments(text: string): string {
  let result = '';
  let index = 0;
  while (index < text.length) {
    const ch = text[index] ?? '';
    const next = text[index + 1] ?? '';
    if (ch === '/' && next === '/') {
      result += '  ';
      index += 2;
      while (index < text.length && text[index] !== '\n') {
        result += ' ';
        index += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      result += '  ';
      index += 2;
      while (index < text.length) {
        const blockCh = text[index] ?? '';
        const blockNext = text[index + 1] ?? '';
        if (blockCh === '*' && blockNext === '/') {
          result += '  ';
          index += 2;
          break;
        }
        result += blockCh === '\n' ? '\n' : ' ';
        index += 1;
      }
      continue;
    }
    result += ch;
    index += 1;
  }
  return result;
}

function maskCommentsAndStrings(text: string): string {
  const withoutComments = maskComments(text);
  let result = '';
  let index = 0;
  while (index < withoutComments.length) {
    const ch = withoutComments[index] ?? '';
    if (ch === '"') {
      result += ' ';
      index += 1;
      while (index < withoutComments.length) {
        const stringCh = withoutComments[index] ?? '';
        result += stringCh === '\n' ? '\n' : ' ';
        if (stringCh === '\\' && index + 1 < withoutComments.length) {
          result += withoutComments[index + 1] === '\n' ? '\n' : ' ';
          index += 2;
          continue;
        }
        index += 1;
        if (stringCh === '"') {
          break;
        }
      }
      continue;
    }
    result += ch;
    index += 1;
  }
  return result;
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}

function positionFromOffset(lineStarts: number[], offset: number): vscode.Position {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = lineStarts[mid] ?? 0;
    if (value <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const line = Math.max(0, high);
  return new vscode.Position(line, offset - (lineStarts[line] ?? 0));
}

export function getIncludeSearchDirs(context: FileContext): string[] {
  return [
    path.dirname(context.file.fsPath),
    ...context.includeDirs.map((dir) => dir.fsPath),
  ];
}
