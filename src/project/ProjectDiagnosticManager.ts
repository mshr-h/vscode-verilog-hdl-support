// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ProjectService } from './ProjectService';
import type { ProjectDiagnostic, ProjectSnapshot } from './ProjectTypes';

export interface ProjectDiagnosticSink {
  set(uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]): void;
  clear(): void;
  dispose(): void;
}

export class ProjectDiagnosticManager implements vscode.Disposable {
  private readonly disposable: vscode.Disposable;

  constructor(
    projectService: ProjectService,
    private readonly sink: ProjectDiagnosticSink = vscode.languages.createDiagnosticCollection('verilog-project')
  ) {
    this.disposable = projectService.onDidChangeSnapshot((snapshot) => this.publish(snapshot));
    this.publish(projectService.getSnapshot());
  }

  publish(snapshot: ProjectSnapshot): void {
    this.sink.clear();
    for (const entry of groupProjectDiagnostics(snapshot.diagnostics).values()) {
      this.sink.set(entry.uri, entry.diagnostics);
    }
  }

  dispose(): void {
    this.disposable.dispose();
    this.sink.dispose();
  }
}

export interface ProjectDiagnosticEntry {
  uri: vscode.Uri;
  diagnostics: vscode.Diagnostic[];
}

export function groupProjectDiagnostics(
  projectDiagnostics: readonly ProjectDiagnostic[]
): Map<string, ProjectDiagnosticEntry> {
  const grouped = new Map<string, ProjectDiagnosticEntry>();
  for (const projectDiagnostic of projectDiagnostics) {
    if (!projectDiagnostic.location) {
      continue;
    }
    const uri = projectDiagnostic.location.uri;
    const key = uri.toString();
    const entry = grouped.get(key) ?? { uri, diagnostics: [] };
    entry.diagnostics.push(toVsCodeDiagnostic(projectDiagnostic));
    grouped.set(key, entry);
  }
  return grouped;
}

function toVsCodeDiagnostic(projectDiagnostic: ProjectDiagnostic): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    projectDiagnostic.location?.range ?? new vscode.Range(0, 0, 0, 0),
    projectDiagnostic.message,
    toVsCodeSeverity(projectDiagnostic.severity)
  );
  diagnostic.source = projectDiagnostic.source;
  diagnostic.code = projectDiagnostic.code;
  return diagnostic;
}

function toVsCodeSeverity(severity: ProjectDiagnostic['severity']): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
  }
}
