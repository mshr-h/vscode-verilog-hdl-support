// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { IndexService } from '../semantic/IndexService';
import { getActiveCompileUnit } from './ProjectTargetResolver';
import type { ProjectService } from './ProjectService';
import type { FileContext, ProjectDiagnostic, ProjectSnapshot } from './ProjectTypes';

let projectOutputChannel: vscode.OutputChannel | undefined;

export function registerProjectCommands(
  projectService: ProjectService,
  indexService: IndexService
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('verilog.reloadProject', async () => {
      const snapshot = await projectService.reload('command');
      vscode.window.showInformationMessage(
        `Verilog project reloaded: ${snapshot.compileUnits.length} compile unit(s), ${countFiles(snapshot)} file(s)`
      );
    }),
    vscode.commands.registerCommand('verilog.showProjectStatus', () => {
      const output = getProjectOutputChannel();
      output.clear();
      output.append(renderProjectStatus(projectService));
      output.show();
    }),
    vscode.commands.registerCommand('verilog.showProjectModules', async () => {
      const modules = indexService.getIndex().getAllModules();
      if (modules.length === 0) {
        vscode.window.showInformationMessage('Verilog project index contains no modules.');
        return;
      }
      await vscode.window.showQuickPick(
        modules.map((module) => ({
          label: module.name,
          description: module.compileUnitId,
          detail: module.uri.fsPath,
        })),
        { placeHolder: 'Project modules' }
      );
    }),
    vscode.commands.registerCommand('verilog.configureProject', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.at(0);
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('Verilog: Open a workspace folder before configuring an HDL project.');
        return;
      }

      const configTarget = vscode.ConfigurationTarget.Workspace;
      const projectConfig = vscode.workspace.getConfiguration('verilog.project', workspaceFolder.uri);
      const analysisConfig = vscode.workspace.getConfiguration('verilog.analysis', workspaceFolder.uri);

      await projectConfig.update('enabled', true, configTarget);

      const filelists = await vscode.window.showInputBox({
        title: 'Configure HDL Project',
        prompt: 'Filelists, comma-separated. Leave empty to keep automatic workspace discovery.',
        value: projectConfig.get<string[]>('filelists', []).join(', '),
      });
      if (filelists !== undefined) {
        await projectConfig.update('filelists', splitCommaList(filelists), configTarget);
      }

      const includeDirs = await vscode.window.showInputBox({
        title: 'Configure HDL Project',
        prompt: 'Include directories, comma-separated. Leave empty for none.',
        value: projectConfig.get<string[]>('includeDirs', []).join(', '),
      });
      if (includeDirs !== undefined) {
        await projectConfig.update('includeDirs', splitCommaList(includeDirs), configTarget);
      }

      const slangPath = await vscode.window.showInputBox({
        title: 'Configure HDL Project',
        prompt: 'Slang binary path. Leave empty to use "slang" from PATH.',
        value: vscode.workspace.getConfiguration('verilog.analysis.slang', workspaceFolder.uri).get<string>('path', 'slang'),
      });
      if (slangPath !== undefined) {
        await analysisConfig.update('engine', 'auto', configTarget);
        await vscode
          .workspace
          .getConfiguration('verilog.analysis.slang', workspaceFolder.uri)
          .update('path', slangPath.trim() || 'slang', configTarget);
      }

      await projectService.reload('configure project command');
      vscode.window.showInformationMessage('Verilog HDL project configuration updated.');
    }),
  ];
}

export function renderProjectStatus(projectService: ProjectService): string {
  const snapshot = projectService.getSnapshot();
  const activeCompileUnit = getActiveCompileUnit(snapshot);
  const lines: string[] = [
    '# Verilog Project Status',
    '',
    `Project enabled: ${isProjectEnabled(snapshot) ? 'yes' : 'no'}`,
    `Workspace root: ${snapshot.workspaceRoot.fsPath}`,
    `Active target: ${snapshot.activeTargetId || '(none)'}`,
    `Resolved active compile unit: ${activeCompileUnit ? `${activeCompileUnit.name} (${activeCompileUnit.id})` : '(none)'}`,
    `Compile units: ${snapshot.compileUnits.length}`,
    `Files: ${countFiles(snapshot)}`,
    '',
  ];

  for (const compileUnit of snapshot.compileUnits) {
    lines.push(`## ${compileUnit.name}`);
    lines.push(`Id: ${compileUnit.id}`);
    lines.push(`Source: ${compileUnit.source.type}${compileUnit.source.uri ? ` ${compileUnit.source.uri.fsPath}` : ''}`);
    lines.push(`Files: ${compileUnit.files.length}`);
    lines.push(`Include dirs: ${compileUnit.includeDirs.map((uri) => uri.fsPath).join(', ') || '(none)'}`);
    lines.push(`Defines: ${Object.keys(compileUnit.defines).join(', ') || '(none)'}`);
    lines.push('');
  }

  lines.push('## Active Editor Context');
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri) {
    const contexts = projectService.getFileContexts(activeUri);
    const preferred = projectService.getPreferredFileContext(activeUri);
    lines.push(`File: ${activeUri.fsPath}`);
    lines.push(`Contexts: ${contexts.map((context) => context.compileUnitId).join(', ') || '(none)'}`);
    lines.push(`Preferred: ${preferred?.compileUnitId ?? '(none)'}`);
  } else {
    lines.push('File: (none)');
  }
  lines.push('');

  lines.push('## Diagnostics');
  const diagnostics = snapshot.diagnostics.concat(activeEditorContextDiagnostic(projectService) ?? []);
  if (diagnostics.length === 0) {
    lines.push('(none)');
  } else {
    for (const diagnostic of diagnostics) {
      lines.push(formatDiagnostic(diagnostic));
    }
  }
  lines.push('');

  return lines.join('\n');
}

export function activeEditorContextDiagnostic(
  projectService: ProjectService
): ProjectDiagnostic | undefined {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (!activeUri) {
    return undefined;
  }
  const languageId = vscode.window.activeTextEditor?.document.languageId;
  if (languageId !== 'verilog' && languageId !== 'systemverilog') {
    return undefined;
  }
  const context = projectService.getPreferredFileContext(activeUri);
  if (context) {
    return undefined;
  }
  return {
    severity: 'info',
    message: `Active editor file does not belong to any project compile unit: ${activeUri.fsPath}`,
    source: 'verilog.project',
    code: 'file-not-in-compile-unit',
  };
}

export function summarizeContext(context: FileContext | undefined): string {
  if (!context) {
    return '(none)';
  }
  return `${context.compileUnitId}; includeDirs=${context.includeDirs.length}; defines=${Object.keys(context.defines).length}`;
}

function getProjectOutputChannel(): vscode.OutputChannel {
  projectOutputChannel ??= vscode.window.createOutputChannel('Verilog Project');
  return projectOutputChannel;
}

function countFiles(snapshot: ProjectSnapshot): number {
  return snapshot.compileUnits.reduce((sum, compileUnit) => sum + compileUnit.files.length, 0);
}

function isProjectEnabled(snapshot: ProjectSnapshot): boolean {
  return !snapshot.diagnostics.some((diagnostic) => diagnostic.code === 'project-disabled');
}

function formatDiagnostic(diagnostic: ProjectDiagnostic): string {
  const location = diagnostic.location
    ? ` (${diagnostic.location.uri.fsPath}:${diagnostic.location.range.start.line + 1})`
    : '';
  return `[${diagnostic.severity.toUpperCase()}] ${diagnostic.message}${location}`;
}

function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
