// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as vscode from 'vscode';
import which = require('which');
import { getExtensionLogger } from '../logging';
import { runTool, ToolRunError, type ToolRunOptions, type ToolRunResult } from '../tools/ToolRunner';
import { buildSlangCommand } from '../linter/SlangLinter';
import { buildVerilatorCommand } from '../linter/VerilatorLinter';
import { createLanguageServerDefinitions } from '../languageServer/definitions';
import { splitCommandLineArgs } from '../utils/commandLine';
import { resolveConfigPath } from '../utils/configPath';
import { getWorkspaceFolderForUri } from '../utils/workspace';
import { readSlangServerConfig } from '../slangServer/SlangServerConfig';
import type { SlangConfigService } from '../slangServer/SlangConfigService';
import type { SlangServerManager } from '../slangServer/SlangServerManager';

export { expandPathVariables, resolveConfigPath } from '../utils/configPath';

export type DoctorStatus = 'ok' | 'warn' | 'error' | 'info';

export interface DoctorCheck {
  status: DoctorStatus;
  message: string;
  detail?: string;
}

export interface DoctorSection {
  title: string;
  checks: DoctorCheck[];
}

export interface DoctorReport {
  generatedAt: string;
  extensionId: string;
  extensionVersion: string;
  vscodeVersion: string;
  platform: string;
  arch: string;
  remoteName: string;
  sections: DoctorSection[];
}

export interface ToolProbeResult {
  ok: boolean;
  output?: string;
  reason?: string;
}

export interface DoctorDependencies {
  runTool: (options: ToolRunOptions) => Promise<ToolRunResult>;
  resolveExecutable: (command: string) => Promise<string | undefined>;
  exists: (inputPath: string) => boolean;
}

export interface LinterDoctorOptions {
  linter: string;
  linterPath: string;
  workspaceFolder?: string;
  includePath?: string[];
  arguments?: string;
  runAtFileLocation?: boolean;
  useWSL?: boolean;
  modelsimWork?: string;
  isWindows?: boolean;
}

let doctorOutputChannel: vscode.OutputChannel | undefined;

const logger = getExtensionLogger('Doctor');

const statusLabels: Record<DoctorStatus, string> = {
  ok: '[OK]',
  warn: '[WARN]',
  error: '[ERROR]',
  info: '[INFO]',
};

const linterVersionArgs = new Map<string, string[]>([
  ['iverilog', ['-V']],
  ['modelsim', ['-version']],
  ['xvlog', ['--version']],
  ['verilator', ['--version']],
  ['slang', ['--version']],
  ['verible-verilog-lint', ['--version']],
]);

export function registerDoctorCommand(
  context: vscode.ExtensionContext,
  slangServerManager?: SlangServerManager,
  slangConfigService?: SlangConfigService
): vscode.Disposable {
  return vscode.commands.registerCommand('verilog.doctor', () =>
    runDoctor(context, createDefaultDoctorDependencies(), slangServerManager, slangConfigService)
  );
}

export async function runDoctor(
  context: vscode.ExtensionContext,
  deps: DoctorDependencies = createDefaultDoctorDependencies(),
  slangServerManager?: SlangServerManager,
  slangConfigService?: SlangConfigService
): Promise<void> {
  let report: DoctorReport;
  try {
    report = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Running Verilog Doctor',
        cancellable: true,
      },
      async (_progress, token) => buildDoctorReport(context, deps, token, slangServerManager, slangConfigService)
    );
  } catch (err) {
    if (err instanceof ToolRunError && err.reason === 'cancelled') {
      logger.info`Verilog Doctor cancelled`;
      return;
    }
    throw err;
  }

  const rendered = renderDoctorReport(report);
  const outputChannel = getDoctorOutputChannel();
  outputChannel.clear();
  outputChannel.append(rendered);
  outputChannel.show();

  const selection = await vscode.window.showInformationMessage('Verilog Doctor completed', 'Copy Report');
  if (selection === 'Copy Report') {
    await vscode.env.clipboard.writeText(rendered);
  }
}

export async function buildDoctorReport(
  context: vscode.ExtensionContext,
  deps: DoctorDependencies,
  token?: vscode.CancellationToken,
  slangServerManager?: SlangServerManager,
  slangConfigService?: SlangConfigService
): Promise<DoctorReport> {
  const activeDocument = vscode.window.activeTextEditor?.document;
  const activeWorkspaceFolder = activeDocument ? getWorkspaceFolderForUri(activeDocument.uri) : undefined;
  const fallbackWorkspaceFolder = activeWorkspaceFolder ?? (vscode.workspace.workspaceFolders ?? [])[0];
  const workspaceFolderPath = fallbackWorkspaceFolder?.uri.fsPath;
  const workspaceFolderPaths = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);

  const sections: DoctorSection[] = [
    buildWorkspaceSection(activeDocument, activeWorkspaceFolder),
    await buildSlangServerSection(deps, token, slangServerManager),
    await buildSlangConfigSection(slangConfigService),
    await buildLintingSectionFromConfiguration(deps, workspaceFolderPath, token),
    await buildFormattingSection(deps, workspaceFolderPath, token),
    await buildLanguageServersSection(deps, workspaceFolderPaths, token),
  ];
  sections.push(buildRecommendationsSection(sections, slangServerManager?.getStatus()));
  sections.push(buildSummarySection(sections));

  return {
    generatedAt: new Date().toISOString(),
    extensionId: context.extension.id,
    extensionVersion: context.extension.packageJSON.version as string,
    vscodeVersion: vscode.version,
    platform: process.platform,
    arch: process.arch,
    remoteName: vscode.env.remoteName ?? 'none',
    sections,
  };
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines: string[] = [
    '# Verilog Doctor Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Extension: ${report.extensionId} ${report.extensionVersion}`,
    `VS Code: ${report.vscodeVersion}`,
    `Platform: ${report.platform} ${report.arch}`,
    `Remote: ${report.remoteName}`,
    '',
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    for (const check of section.checks) {
      lines.push(`${statusLabels[check.status]} ${check.message}`);
      if (check.detail) {
        lines.push(`  ${check.detail}`);
      }
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function buildWorkspaceSection(
  activeDocument: vscode.TextDocument | undefined,
  activeWorkspaceFolder: vscode.WorkspaceFolder | undefined
): DoctorSection {
  const checks: DoctorCheck[] = [
    {
      status: vscode.workspace.workspaceFolders?.length ? 'ok' : 'warn',
      message: `Workspace folders = ${vscode.workspace.workspaceFolders?.length ?? 0}`,
    },
  ];
  if (activeDocument) {
    checks.push({ status: 'info', message: `Active document = ${activeDocument.uri.fsPath}` });
    checks.push({
      status: activeWorkspaceFolder ? 'ok' : 'warn',
      message: `Active workspace = ${activeWorkspaceFolder?.uri.fsPath ?? '(none)'}`,
    });
  }
  return { title: 'Workspace', checks };
}

async function buildSlangServerSection(
  deps: DoctorDependencies,
  token?: vscode.CancellationToken,
  manager?: SlangServerManager
): Promise<DoctorSection> {
  const config = readSlangServerConfig();
  const status = manager?.getStatus();
  const checks: DoctorCheck[] = [
    { status: config.enabled ? 'ok' : 'warn', message: `enabled = ${String(config.enabled)}` },
    { status: 'info', message: `runtime = ${config.runtime}` },
    { status: 'info', message: `resolved runtime = ${config.resolvedRuntime}` },
  ];
  if (status) {
    checks.push({ status: status.state === 'error' ? 'error' : 'info', message: `state = ${status.state}` });
    if (status.runtimeProvider) {
      checks.push({ status: 'info', message: `runtime provider = ${status.runtimeProvider}` });
    }
    checks.push({ status: 'info', message: `startup time = ${status.startupTimeMs !== undefined ? `${status.startupTimeMs} ms` : '(unknown)'}` });
    if (status.error) {
      checks.push({ status: 'error', message: status.error });
    }
    if (status.actionableError) {
      checks.push({ status: 'info', message: `action = ${status.actionableError}` });
    }
    if (status.lastCrashReason) {
      checks.push({ status: 'error', message: `last crash = ${status.lastCrashReason}`, detail: status.lastCrashAt });
    }
  }
  if (config.resolvedRuntime === 'native') {
    checks.push({ status: config.path ? 'ok' : 'error', message: `native path = ${config.path || '(missing)'}` });
    if (config.path) {
      const probe = await probeToolVersion(deps, config.path, [...config.args, '--version'], token);
      checks.push(probe.ok
        ? { status: 'ok', message: `version: ${probe.output ?? '(no output)'}` }
        : { status: 'warn', message: `version probe failed: ${probe.reason ?? 'unknown error'}` });
    }
  } else {
    checks.push({ status: status?.wasmPath ? 'info' : 'warn', message: `wasm artifact = ${status?.wasmPath ?? '(unknown)'}` });
    checks.push({ status: 'info', message: `workspace mount = ${status?.workspaceMount ?? '/workspace'}` });
    checks.push({ status: 'info', message: `tmp mount = ${status?.tmpMount ?? '/tmp'}` });
    checks.push({ status: 'info', message: `home config enabled = ${String(status?.allowUserConfig ?? config.wasm.allowUserConfig)}` });
    checks.push({ status: 'info', message: `memory limit = ${String(status?.memoryLimitMb ?? config.wasm.memoryLimitMb)} MB` });
    const metadata = status?.wasmMetadata;
    if (metadata) {
      checks.push({ status: 'ok', message: `wasm metadata = ${formatWasmMetadata(metadata)}` });
    } else {
      checks.push({ status: 'warn', message: 'wasm metadata = (missing)' });
    }
  }
  return { title: 'slang-server', checks };
}

async function buildSlangConfigSection(service?: SlangConfigService): Promise<DoctorSection> {
  if (!service) {
    return { title: 'Slang Project Config', checks: [{ status: 'warn', message: 'SlangConfigService unavailable.' }] };
  }
  const status = await service.getStatus();
  const checks: DoctorCheck[] = [
    {
      status: status.workspaceConfig ? 'ok' : 'warn',
      message: `.slang/server.json = ${status.workspaceConfig?.fsPath ?? '(missing)'}`,
    },
    { status: 'info', message: `.slang/local/server.json = ${status.localConfig?.fsPath ?? '(missing)'}` },
    { status: 'info', message: `~/.slang/server.json = ${status.userConfig?.fsPath ?? '(missing)'}` },
  ];
  if (!status.ok) {
    checks.push({ status: 'error', message: status.error ?? 'Invalid JSON.' });
  }
  if (status.flags) {
    checks.push({ status: 'info', message: `flags = ${String(status.flags)}` });
  }
  if (status.build) {
    checks.push({ status: 'info', message: `build = ${String(status.build)}` });
  }
  if (status.buildPattern) {
    checks.push({ status: 'info', message: `buildPattern = ${String(status.buildPattern)}` });
  }
  if (status.builds) {
    checks.push({ status: 'info', message: `builds = ${Array.isArray(status.builds) ? status.builds.length : 'configured'}` });
  }
  return { title: 'Slang Project Config', checks };
}

export async function buildLintingSectionFromConfiguration(
  deps: DoctorDependencies,
  workspaceFolder: string | undefined,
  token?: vscode.CancellationToken
): Promise<DoctorSection> {
  const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
  const linter = lintConfig.get<string>('linter', 'none');
  const linterPath = lintConfig.get<string>('path', '');
  const checks = await buildLinterChecks(
    {
      linter,
      linterPath,
      workspaceFolder,
      arguments: vscode.workspace.getConfiguration(`verilog.linting.${linter}`).get<string>('arguments', ''),
      runAtFileLocation: vscode.workspace.getConfiguration(`verilog.linting.${linter}`).get<boolean>('runAtFileLocation', false),
      useWSL: vscode.workspace.getConfiguration(`verilog.linting.${linter}`).get<boolean>('useWSL', false),
      isWindows: process.platform === 'win32',
    },
    deps,
    token
  );
  return { title: 'Linting', checks };
}

export async function buildLinterChecks(
  options: LinterDoctorOptions,
  deps: DoctorDependencies,
  token?: vscode.CancellationToken
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [
    { status: options.linter === 'none' ? 'warn' : 'info', message: `Selected linter = ${options.linter}` },
  ];
  if (options.linter === 'none') {
    return checks;
  }

  const commandInfo = getLinterCommand(options);
  const resolved = await appendBinaryChecks(checks, `${options.linter} binary`, commandInfo.command, deps, token);
  if (resolved) {
    const versionArgs = linterVersionArgs.get(options.linter) ?? ['--version'];
    const probe = await probeToolVersion(deps, commandInfo.command, commandInfo.leadingArgs.concat(versionArgs), token);
    checks.push(probe.ok
      ? { status: 'ok', message: `${options.linter} version: ${probe.output ?? '(no output)'}` }
      : { status: 'warn', message: `${options.linter} version probe failed: ${probe.reason ?? 'unknown error'}` });
  }
  return checks;
}

function getLinterCommand(options: LinterDoctorOptions): { command: string; leadingArgs: string[] } {
  const linterInstalledPath = options.linterPath || '';
  switch (options.linter) {
    case 'slang':
      return buildSlangCommand({ isWindows: options.isWindows ?? process.platform === 'win32', useWSL: Boolean(options.useWSL), linterInstalledPath });
    case 'verilator':
      return buildVerilatorCommand({ isWindows: options.isWindows ?? process.platform === 'win32', useWSL: Boolean(options.useWSL), linterInstalledPath });
    default:
      return {
        command: path.join(linterInstalledPath, options.linter),
        leadingArgs: [],
      };
  }
}

async function buildFormattingSection(
  deps: DoctorDependencies,
  workspaceFolder: string | undefined,
  token?: vscode.CancellationToken
): Promise<DoctorSection> {
  const checks: DoctorCheck[] = [];
  const config = vscode.workspace.getConfiguration('verilog.formatting');
  const verilogFormatter = config.get<string>('verilogHDL.formatter', 'verilog-format');
  const systemVerilogFormatter = config.get<string>('systemVerilog.formatter', 'verible-verilog-format');
  checks.push({ status: 'info', message: `Verilog formatter = ${verilogFormatter}` });
  checks.push({ status: 'info', message: `SystemVerilog formatter = ${systemVerilogFormatter}` });
  await appendBinaryChecks(checks, 'Verilog formatter binary', getFormatterPath(verilogFormatter), deps, token, workspaceFolder);
  await appendBinaryChecks(checks, 'SystemVerilog formatter binary', getFormatterPath(systemVerilogFormatter), deps, token, workspaceFolder);
  return { title: 'Formatting', checks };
}

function getFormatterPath(formatter: string): string {
  const config = vscode.workspace.getConfiguration('verilog.formatting');
  switch (formatter) {
    case 'iStyle':
      return config.get<string>('iStyleVerilogFormatter.path', 'iStyle');
    case 'verible-verilog-format':
      return config.get<string>('veribleVerilogFormatter.path', 'verible-verilog-format');
    default:
      return config.get<string>('verilogFormat.path', 'verilog-format');
  }
}

async function buildLanguageServersSection(
  deps: DoctorDependencies,
  workspaceFolders: string[],
  token?: vscode.CancellationToken
): Promise<DoctorSection> {
  const checks: DoctorCheck[] = [];
  for (const definition of createLanguageServerDefinitions()) {
    const config = vscode.workspace.getConfiguration(`verilog.languageServer.${definition.name}`);
    const enabled = config.get<boolean>('enabled', false);
    const serverPath = config.get<string>('path', definition.defaultPath);
    checks.push({ status: enabled ? 'info' : 'info', message: `${definition.name} enabled = ${String(enabled)}` });
    if (enabled) {
      await appendBinaryChecks(checks, `${definition.name} binary`, serverPath, deps, token, workspaceFolders[0]);
    }
  }
  return { title: 'Language Servers', checks };
}

function buildSummarySection(sections: DoctorSection[]): DoctorSection {
  const checks = sections.flatMap((section) => section.checks);
  const errors = checks.filter((check) => check.status === 'error').length;
  const warnings = checks.filter((check) => check.status === 'warn').length;
  return {
    title: 'Summary',
    checks: [
      {
        status: errors > 0 ? 'error' : warnings > 0 ? 'warn' : 'ok',
        message: `${errors} error(s), ${warnings} warning(s)`,
      },
    ],
  };
}

function buildRecommendationsSection(
  sections: DoctorSection[],
  status: ReturnType<SlangServerManager['getStatus']> | undefined
): DoctorSection {
  const recommendations = new Set<string>();
  if (status?.state === 'error') {
    recommendations.add('Run “Verilog: Show slang-server Output” for the detailed local log.');
    recommendations.add('Run “Verilog: Restart slang-server” after fixing the reported runtime issue.');
  }
  if (status?.resolvedRuntime === 'native' && !status.path) {
    recommendations.add('Set verilog.slangServer.path or run “Verilog: Select slang-server Runtime”.');
  }
  if (status?.resolvedRuntime === 'bundled-wasm' && status.error?.includes('not found')) {
    recommendations.add('Install a VSIX that includes resources/wasm/slang-server.wasm or switch to native runtime.');
  }
  if (sections.some((section) =>
    section.title === 'Slang Project Config'
    && section.checks.some((check) => check.message.includes('.slang/server.json = (missing)'))
  )) {
    recommendations.add('Run “Verilog: Configure Slang Project” to create .slang/server.json.');
  }
  if (sections.some((section) => section.checks.some((check) => check.status === 'error'))) {
    recommendations.add('Fix error checks above before relying on slang-server language features.');
  }
  if (recommendations.size === 0) {
    recommendations.add('No immediate setup actions found.');
  }
  return {
    title: 'Recommendations',
    checks: [...recommendations].map((message) => ({ status: 'info', message })),
  };
}

function formatWasmMetadata(metadata: Record<string, unknown>): string {
  const parts = [
    ['slang-server', metadata.slangServerCommit],
    ['slang', metadata.slangCommit],
    ['wasi-sdk', metadata.wasiSdkVersion],
    ['size', metadata.wasmSizeBytes],
    ['sha256', metadata.wasmSha256],
  ]
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => `${label}=${String(value)}`);
  return parts.length > 0 ? parts.join(', ') : 'present';
}

async function appendBinaryChecks(
  checks: DoctorCheck[],
  label: string,
  command: string,
  deps: DoctorDependencies,
  token?: vscode.CancellationToken,
  workspaceFolder?: string
): Promise<string | undefined> {
  if (token?.isCancellationRequested) {
    throw new ToolRunError('Doctor cancelled', 'verilog.doctor', [], 'cancelled');
  }
  const resolvedCommand = resolveConfigPath(command, workspaceFolder);
  checks.push({ status: 'info', message: `${label} = ${resolvedCommand}` });

  if (path.isAbsolute(resolvedCommand)) {
    if (deps.exists(resolvedCommand)) {
      checks.push({ status: 'ok', message: `${label} exists.` });
      return resolvedCommand;
    }
    checks.push({ status: 'error', message: `${label} not found.`, detail: resolvedCommand });
    return undefined;
  }

  const resolved = await deps.resolveExecutable(resolvedCommand);
  if (resolved) {
    checks.push({ status: 'ok', message: `${label} resolved to ${resolved}` });
    return resolved;
  }
  checks.push({ status: 'error', message: `${label} not found on PATH.`, detail: resolvedCommand });
  return undefined;
}

async function probeToolVersion(
  deps: DoctorDependencies,
  command: string,
  args: string[],
  token?: vscode.CancellationToken
): Promise<ToolProbeResult> {
  try {
    const result = await deps.runTool({
      command,
      args,
      collectStdout: true,
      collectStderr: true,
      cancellationToken: token,
    });
    return { ok: true, output: (result.stdout || result.stderr).trim() };
  } catch (err) {
    if (err instanceof ToolRunError && err.reason === 'cancelled') {
      throw err;
    }
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

function createDefaultDoctorDependencies(): DoctorDependencies {
  return {
    runTool,
    resolveExecutable: async (command: string) => which(command, { nothrow: true }) as Promise<string | undefined>,
    exists: (inputPath: string) => fs.existsSync(inputPath),
  };
}

function getDoctorOutputChannel(): vscode.OutputChannel {
  doctorOutputChannel ??= vscode.window.createOutputChannel('Verilog Doctor');
  return doctorOutputChannel;
}

export function parseDoctorArgs(value: string | undefined): string[] {
  return splitCommandLineArgs(value ?? '');
}
