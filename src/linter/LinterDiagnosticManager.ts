// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export interface DiagnosticEntry {
  uri: vscode.Uri;
  diagnostics: vscode.Diagnostic[];
}

export type DiagnosticMap = Map<string, DiagnosticEntry>;

export interface DiagnosticSink {
  set(uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]): void;
  delete(uri: vscode.Uri): void;
  clear(): void;
  dispose(): void;
}

type TargetDiagnostics = Map<string, DiagnosticEntry>;
type OwnerDiagnostics = Map<string, TargetDiagnostics>;
type SourceDiagnostics = Map<string, OwnerDiagnostics>;

export default class LinterDiagnosticManager {
  private readonly diagnosticsBySource: SourceDiagnostics = new Map();

  constructor(private readonly collection: DiagnosticSink) {}

  replaceRunDiagnostics(
    sourceId: string,
    ownerUri: vscode.Uri,
    diagnosticsByUri: DiagnosticMap
  ): void {
    const ownerKey = ownerUri.toString();
    const previousTargets = this.getOwnerTargets(sourceId, ownerKey);
    const affectedTargetUris = new Map<string, vscode.Uri>();
    previousTargets?.forEach((entry, targetKey) => {
      affectedTargetUris.set(targetKey, entry.uri);
    });
    const sourceDiagnostics = this.getOrCreateSource(sourceId);

    if (diagnosticsByUri.size === 0) {
      sourceDiagnostics.delete(ownerKey);
      if (sourceDiagnostics.size === 0) {
        this.diagnosticsBySource.delete(sourceId);
      }
    } else {
      const nextTargets: TargetDiagnostics = new Map();
      for (const entry of diagnosticsByUri.values()) {
        const targetKey = entry.uri.toString();
        nextTargets.set(targetKey, {
          uri: entry.uri,
          diagnostics: entry.diagnostics,
        });
        affectedTargetUris.set(targetKey, entry.uri);
      }
      sourceDiagnostics.set(ownerKey, nextTargets);
    }

    this.refreshTargets(affectedTargetUris);
  }

  clearOwner(sourceId: string, ownerUri: vscode.Uri): void {
    const sourceDiagnostics = this.diagnosticsBySource.get(sourceId);
    if (!sourceDiagnostics) {
      return;
    }

    const ownerKey = ownerUri.toString();
    const ownerDiagnostics = sourceDiagnostics.get(ownerKey);
    if (!ownerDiagnostics) {
      return;
    }

    const affectedTargetUris = new Map<string, vscode.Uri>();
    ownerDiagnostics.forEach((entry, targetKey) => {
      affectedTargetUris.set(targetKey, entry.uri);
    });
    sourceDiagnostics.delete(ownerKey);
    if (sourceDiagnostics.size === 0) {
      this.diagnosticsBySource.delete(sourceId);
    }
    this.refreshTargets(affectedTargetUris);
  }

  clearSource(sourceId: string): void {
    const sourceDiagnostics = this.diagnosticsBySource.get(sourceId);
    if (!sourceDiagnostics) {
      return;
    }

    const affectedTargetUris = new Map<string, vscode.Uri>();
    for (const ownerDiagnostics of sourceDiagnostics.values()) {
      ownerDiagnostics.forEach((entry, targetKey) => {
        affectedTargetUris.set(targetKey, entry.uri);
      });
    }

    this.diagnosticsBySource.delete(sourceId);
    this.refreshTargets(affectedTargetUris);
  }

  clearTargetUri(targetUri: vscode.Uri): void {
    const targetKey = targetUri.toString();

    for (const [sourceId, sourceDiagnostics] of this.diagnosticsBySource) {
      for (const [ownerKey, ownerDiagnostics] of sourceDiagnostics) {
        ownerDiagnostics.delete(targetKey);
        if (ownerDiagnostics.size === 0) {
          sourceDiagnostics.delete(ownerKey);
        }
      }
      if (sourceDiagnostics.size === 0) {
        this.diagnosticsBySource.delete(sourceId);
      }
    }

    this.collection.delete(targetUri);
  }

  clearAll(): void {
    this.diagnosticsBySource.clear();
    this.collection.clear();
  }

  dispose(): void {
    this.diagnosticsBySource.clear();
    this.collection.dispose();
  }

  private getOwnerTargets(sourceId: string, ownerKey: string): TargetDiagnostics | undefined {
    return this.diagnosticsBySource.get(sourceId)?.get(ownerKey);
  }

  private getOrCreateSource(sourceId: string): OwnerDiagnostics {
    let sourceDiagnostics = this.diagnosticsBySource.get(sourceId);
    if (!sourceDiagnostics) {
      sourceDiagnostics = new Map();
      this.diagnosticsBySource.set(sourceId, sourceDiagnostics);
    }
    return sourceDiagnostics;
  }

  private refreshTargets(targetUris: Map<string, vscode.Uri>): void {
    for (const [targetKey, fallbackUri] of targetUris) {
      const aggregate = this.collectTargetDiagnostics(targetKey);
      if (aggregate.uri && aggregate.diagnostics.length > 0) {
        this.collection.set(aggregate.uri, aggregate.diagnostics);
      } else {
        this.collection.delete(aggregate.uri ?? fallbackUri);
      }
    }
  }

  private collectTargetDiagnostics(targetKey: string): {
    uri: vscode.Uri | undefined;
    diagnostics: vscode.Diagnostic[];
  } {
    const diagnostics: vscode.Diagnostic[] = [];
    let uri: vscode.Uri | undefined;

    for (const sourceDiagnostics of this.diagnosticsBySource.values()) {
      for (const ownerDiagnostics of sourceDiagnostics.values()) {
        const entry = ownerDiagnostics.get(targetKey);
        if (!entry) {
          continue;
        }
        uri = entry.uri;
        diagnostics.push(...entry.diagnostics);
      }
    }

    return { uri, diagnostics };
  }
}
