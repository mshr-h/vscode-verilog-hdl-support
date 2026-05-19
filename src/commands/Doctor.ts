// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import * as vscode from 'vscode';
import which = require('which');
import { getExtensionLogger } from '../logging';
import { runTool, ToolRunError, type ToolRunOptions, type ToolRunResult } from '../tools/ToolRunner';
import { buildSlangCommand } from '../linter/SlangLinter';
import { buildVerilatorCommand } from '../linter/VerilatorLinter';

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

export interface LanguageServerDoctorOptions {
  name: string;
  enabled: boolean;
  path: string;
  arguments?: string;
  configFiles?: Array<{ label: string; path: string; resolvePerWorkspace?: boolean }>;
  workspaceFolders?: string[];
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

const languageServerLabels: Record<string, string> = {
  svls: 'svls',
  veridian: 'veridian',
  hdlChecker: 'hdlChecker',
  veribleVerilogLs: 'verible-verilog-ls',
  tclsp: 'tclsp',
  rustHdl: 'vhdl_ls',
};

export function registerDoctorCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('verilog.doctor', () => runDoctor(context));
}

export async function runDoctor(
  context: vscode.ExtensionContext,
  deps: DoctorDependencies = createDefaultDoctorDependencies()
): Promise<void> {
  let report: DoctorReport;
  try {
    report = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Running Verilog Doctor',
        cancellable: true,
      },
      async (_progress, token) => buildDoctorReport(context, deps, token)
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

  const selection = await vscode.window.showInformationMessage(
    'Verilog Doctor completed',
    'Copy Report'
  );
  if (selection === 'Copy Report') {
    await vscode.env.clipboard.writeText(rendered);
  }
}

export async function buildDoctorReport(
  context: vscode.ExtensionContext,
  deps: DoctorDependencies,
  token?: vscode.CancellationToken
): Promise<DoctorReport> {
  const activeDocument = vscode.window.activeTextEditor?.document;
  const activeWorkspaceFolder = resolveWorkspaceFolderForUri(activeDocument?.uri);
  const fallbackWorkspaceFolder = activeWorkspaceFolder ?? vscode.workspace.workspaceFolders?.[0];
  const workspaceFolderPath = fallbackWorkspaceFolder?.uri.fsPath;
  const workspaceFolderPaths = (vscode.workspace.workspaceFolders ?? []).map(
    (folder) => folder.uri.fsPath
  );

  const sections: DoctorSection[] = [
    buildWorkspaceSection(activeDocument, activeWorkspaceFolder),
    await buildCtagsSection(deps, token),
    await buildLintingSectionFromConfiguration(deps, workspaceFolderPath, token),
    await buildFormattingSection(deps, workspaceFolderPath, token),
    await buildLanguageServersSection(deps, workspaceFolderPaths, token),
  ];
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

  const sections = report.sections.some((section) => section.title === 'Summary')
    ? report.sections
    : report.sections.concat(buildSummarySection(report.sections));

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    for (const check of section.checks) {
      lines.push(`${statusLabels[check.status]} ${check.message}`);
      if (check.detail) {
        lines.push(`    ${check.detail}`);
      }
    }
    lines.push('');
  }

  const recommendations = buildRecommendations(report.sections);
  lines.push('Recommended next steps:');
  if (recommendations.length === 0) {
    lines.push('- No immediate action needed.');
  } else {
    for (const recommendation of recommendations) {
      lines.push(`- ${recommendation}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

export function resolveWorkspaceFolderForUri(
  uri?: vscode.Uri
): vscode.WorkspaceFolder | undefined {
  if (!uri) {
    return undefined;
  }
  return vscode.workspace.getWorkspaceFolder(uri);
}

export function expandPathVariables(input: string): string {
  let expanded = input.replace(
    /\$\{env:([^}]+)\}/g,
    (_match, envName: string) => process.env[envName] ?? ''
  );
  if (expanded === '~') {
    expanded = os.homedir();
  } else if (expanded.startsWith(`~${path.sep}`) || expanded.startsWith('~/')) {
    expanded = path.join(os.homedir(), expanded.slice(2));
  }
  return expanded;
}

export function resolveConfigPath(input: string, workspaceFolder?: string): string {
  const expanded = expandPathVariables(input.trim());
  if (expanded.length === 0 || path.isAbsolute(expanded) || !workspaceFolder) {
    return expanded;
  }
  return path.join(workspaceFolder, expanded);
}

export function createDefaultDoctorDependencies(): DoctorDependencies {
  return {
    runTool,
    resolveExecutable,
    exists: (inputPath) => fs.existsSync(inputPath),
  };
}

export async function resolveExecutable(command: string): Promise<string | undefined> {
  if (command.trim().length === 0) {
    return undefined;
  }
  if (command.includes(path.sep) || (path.sep === '\\' && command.includes('/'))) {
    return fs.existsSync(command) ? command : undefined;
  }
  try {
    return await which(command);
  } catch {
    return undefined;
  }
}

export async function probeToolVersion(
  command: string,
  args: string[],
  deps: Pick<DoctorDependencies, 'runTool'>,
  token?: vscode.CancellationToken
): Promise<ToolProbeResult> {
  try {
    const result = await deps.runTool({
      command,
      args,
      timeoutMs: 3000,
      collectStdout: true,
      collectStderr: true,
      cancellationToken: token,
    });
    if (result.exitCode === 0) {
      const output = [result.stdout, result.stderr].filter((value) => value.length > 0).join('\n');
      return { ok: true, output: firstNonEmptyLine(output) };
    }
    return { ok: false, reason: `exit code ${result.exitCode ?? 'unknown'}` };
  } catch (err) {
    if (err instanceof ToolRunError && err.reason === 'cancelled') {
      throw err;
    }
    logger.warn`Version probe failed for ${command}: ${err}`;
    return { ok: false, reason: 'probe failed' };
  }
}

export async function buildLinterChecks(
  options: LinterDoctorOptions,
  deps: DoctorDependencies,
  token?: vscode.CancellationToken
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [
    { status: 'info', message: `verilog.linting.linter = ${options.linter}` },
  ];

  if (options.linter === 'none') {
    checks.push({ status: 'info', message: 'no linter selected' });
    return checks;
  }

  const commandInfo = buildLinterCommand(options);
  if (!commandInfo) {
    checks.push({ status: 'warn', message: `unknown linter: ${options.linter}` });
    return checks;
  }

  checks.push({ status: 'info', message: `arguments = ${options.arguments ?? ''}` });
  if (options.runAtFileLocation !== undefined) {
    checks.push({
      status: 'info',
      message: `runAtFileLocation = ${String(options.runAtFileLocation)}`,
    });
  }
  if (options.useWSL !== undefined) {
    checks.push({ status: 'info', message: `useWSL = ${String(options.useWSL)}` });
  }
  if (options.modelsimWork !== undefined) {
    checks.push({ status: 'info', message: `modelsim.work = ${options.modelsimWork}` });
  }

  await appendBinaryChecks(checks, `${options.linter} binary`, commandInfo.command, deps, token);
  await appendVersionCheck(
    checks,
    'version',
    commandInfo.command,
    commandInfo.leadingArgs.concat(linterVersionArgs.get(options.linter) ?? ['--version']),
    deps,
    token
  );

  const includePaths = options.includePath ?? [];
  for (const includePath of includePaths) {
    const resolvedPath = resolveConfigPath(includePath, options.workspaceFolder);
    if (deps.exists(resolvedPath)) {
      checks.push({ status: 'ok', message: `include path: ${resolvedPath}` });
    } else {
      checks.push({ status: 'warn', message: `missing include path: ${resolvedPath}` });
    }
  }

  if (options.isWindows === true && options.useWSL === true) {
    await appendWslChecks(checks, deps, token);
  }

  return checks;
}

export async function buildLanguageServerChecks(
  options: LanguageServerDoctorOptions,
  deps: DoctorDependencies,
  token?: vscode.CancellationToken
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [
    { status: 'info', message: `${options.name} enabled = ${String(options.enabled)}` },
  ];
  if (options.arguments !== undefined) {
    checks.push({ status: 'info', message: `${options.name} arguments = ${options.arguments}` });
  }

  if (!options.enabled) {
    checks.push({ status: 'info', message: `${options.name} disabled` });
    return checks;
  }

  await appendBinaryChecks(checks, `${options.name} binary`, options.path, deps, token);
  await appendVersionCheck(checks, 'version', options.path, ['--version'], deps, token);

  for (const configFile of options.configFiles ?? []) {
    const candidatePaths =
      configFile.resolvePerWorkspace && (options.workspaceFolders?.length ?? 0) > 0
        ? (options.workspaceFolders ?? []).map((folder) => resolveConfigPath(configFile.path, folder))
        : [resolveConfigPath(configFile.path, options.workspaceFolders?.[0])];
    for (const candidatePath of candidatePaths) {
      if (candidatePath.length === 0) {
        continue;
      }
      if (deps.exists(candidatePath)) {
        checks.push({ status: 'ok', message: `${configFile.label}: ${candidatePath}` });
      } else {
        checks.push({ status: 'warn', message: `missing ${configFile.label}: ${candidatePath}` });
      }
    }
  }

  return checks;
}

function getDoctorOutputChannel(): vscode.OutputChannel {
  doctorOutputChannel ??= vscode.window.createOutputChannel('Verilog Doctor');
  return doctorOutputChannel;
}

function buildWorkspaceSection(
  activeDocument: vscode.TextDocument | undefined,
  activeWorkspaceFolder: vscode.WorkspaceFolder | undefined
): DoctorSection {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const checks: DoctorCheck[] = [];
  if (workspaceFolders.length === 0) {
    checks.push({ status: 'warn', message: 'Workspace folder: none' });
  } else {
    for (const folder of workspaceFolders) {
      checks.push({ status: 'ok', message: `Workspace folder: ${folder.uri.fsPath}` });
    }
  }
  checks.push({
    status: 'info',
    message: `Multi-root workspace: ${workspaceFolders.length > 1 ? 'yes' : 'no'}`,
  });
  if (activeDocument) {
    checks.push({
      status: 'info',
      message: `Active document: ${activeDocument.languageId} ${activeDocument.uri.fsPath}`,
    });
    checks.push({
      status: 'info',
      message: `Active document workspace: ${activeWorkspaceFolder?.uri.fsPath ?? 'none'}`,
    });
  } else {
    checks.push({ status: 'info', message: 'Active document: none' });
  }
  return { title: 'Workspace', checks };
}

async function buildCtagsSection(
  deps: DoctorDependencies,
  token?: vscode.CancellationToken
): Promise<DoctorSection> {
  const config = vscode.workspace.getConfiguration('verilog.ctags');
  const enabled = config.get<boolean>('enabled', true);
  const ctagsPath = config.get<string>('path', 'ctags');
  const checks: DoctorCheck[] = [
    { status: 'info', message: `verilog.ctags.enabled = ${String(enabled)}` },
  ];

  if (!enabled) {
    checks.push({ status: 'info', message: 'disabled' });
    return { title: 'Ctags', checks };
  }

  const resolved = await appendBinaryChecks(checks, 'ctags binary', ctagsPath, deps, token);
  if (resolved) {
    const probe = await probeToolVersion(resolved, ['--version'], deps, token);
    if (probe.ok && probe.output) {
      checks.push({ status: 'ok', message: `ctags version: ${probe.output}` });
      if (!probe.output.includes('Universal Ctags')) {
        checks.push({
          status: 'warn',
          message: 'ctags is not Universal Ctags; SystemVerilog support may be limited.',
        });
      }
    } else {
      checks.push({ status: 'warn', message: 'version unknown; ctags --version failed.' });
    }
  }

  return { title: 'Ctags', checks };
}

async function buildLintingSectionFromConfiguration(
  deps: DoctorDependencies,
  workspaceFolder?: string,
  token?: vscode.CancellationToken
): Promise<DoctorSection> {
  const lintConfig = vscode.workspace.getConfiguration('verilog.linting');
  const linter = lintConfig.get<string>('linter', 'none');
  const linterPath = lintConfig.get<string>('path', '');
  const specificConfig = linter === 'none' ? undefined : getLinterSpecificConfiguration(linter);

  const checks = await buildLinterChecks(
    {
      linter,
      linterPath,
      workspaceFolder,
      includePath: specificConfig?.get<string[]>('includePath', []),
      arguments: specificConfig?.get<string>('arguments', ''),
      runAtFileLocation: specificConfig?.get<boolean>('runAtFileLocation', false),
      useWSL:
        linter === 'verilator' || linter === 'slang'
          ? specificConfig?.get<boolean>('useWSL', false)
          : undefined,
      modelsimWork: linter === 'modelsim' ? specificConfig?.get<string>('work', '') : undefined,
      isWindows: process.platform === 'win32',
    },
    deps,
    token
  );

  return { title: 'Linting', checks };
}

async function buildFormattingSection(
  deps: DoctorDependencies,
  workspaceFolder?: string,
  token?: vscode.CancellationToken
): Promise<DoctorSection> {
  const checks: DoctorCheck[] = [];
  const verilogFormatter = vscode
    .workspace
    .getConfiguration('verilog.formatting.verilogHDL')
    .get<string>('formatter', 'verilog-format');
  const systemVerilogFormatter = vscode
    .workspace
    .getConfiguration('verilog.formatting.systemVerilog')
    .get<string>('formatter', 'verible-verilog-format');

  checks.push({ status: 'info', message: `Verilog formatter = ${verilogFormatter}` });
  await appendFormatterChecks(checks, verilogFormatter, deps, token);
  checks.push({ status: 'info', message: `SystemVerilog formatter = ${systemVerilogFormatter}` });
  await appendFormatterChecks(checks, systemVerilogFormatter, deps, token);

  const verilogFormatSettings = vscode
    .workspace
    .getConfiguration('verilog.formatting.verilogFormat')
    .get<string>('settings', '');
  const settingsPath = resolveConfigPath(verilogFormatSettings, workspaceFolder);
  if (settingsPath.length > 0) {
    if (deps.exists(settingsPath)) {
      checks.push({ status: 'ok', message: `verilog-format settings file: ${settingsPath}` });
    } else {
      checks.push({
        status: 'warn',
        message: `verilog-format settings file not found: ${settingsPath}`,
      });
    }
  }

  return { title: 'Formatting', checks };
}

async function buildLanguageServersSection(
  deps: DoctorDependencies,
  workspaceFolders: string[],
  token?: vscode.CancellationToken
): Promise<DoctorSection> {
  const checks: DoctorCheck[] = [];
  const serverNames = [
    'svls',
    'veridian',
    'hdlChecker',
    'veribleVerilogLs',
    'tclsp',
    'rustHdl',
  ];

  for (const name of serverNames) {
    const config = vscode.workspace.getConfiguration(`verilog.languageServer.${name}`);
    const configFiles: LanguageServerDoctorOptions['configFiles'] = [];
    if (name === 'svls') {
      const svlintTomlPath = config.get<string>('svlintTomlPath', '').trim();
      if (svlintTomlPath.length > 0) {
        configFiles.push({ label: 'svls.svlintTomlPath', path: svlintTomlPath });
      }
    }
    if (name === 'tclsp') {
      const configPath = config.get<string>('configPath', '').trim();
      if (configPath.length > 0) {
        configFiles.push({
          label: 'tclsp.configPath',
          path: configPath,
          resolvePerWorkspace: !path.isAbsolute(expandPathVariables(configPath)),
        });
      }
    }

    checks.push(
      ...(await buildLanguageServerChecks(
        {
          name: languageServerLabels[name] ?? name,
          enabled: config.get<boolean>('enabled', false),
          path: config.get<string>('path', languageServerLabels[name] ?? name),
          arguments: config.get<string>('arguments', ''),
          configFiles,
          workspaceFolders,
        },
        deps,
        token
      ))
    );
  }

  return { title: 'Language Servers', checks };
}

function buildSummarySection(sections: DoctorSection[]): DoctorSection {
  const counts = countStatuses(sections);
  return {
    title: 'Summary',
    checks: [
      {
        status: 'info',
        message: `OK: ${counts.ok}, WARN: ${counts.warn}, ERROR: ${counts.error}, INFO: ${counts.info}`,
      },
    ],
  };
}

function getLinterSpecificConfiguration(linter: string): vscode.WorkspaceConfiguration {
  const namespace = linter === 'verible-verilog-lint' ? 'veribleVerilogLint' : linter;
  return vscode.workspace.getConfiguration(`verilog.linting.${namespace}`);
}

function buildLinterCommand(
  options: LinterDoctorOptions
): { command: string; leadingArgs: string[] } | undefined {
  const isWindows = options.isWindows ?? process.platform === 'win32';
  switch (options.linter) {
    case 'iverilog':
      return { command: path.join(options.linterPath, 'iverilog'), leadingArgs: [] };
    case 'modelsim':
      return { command: path.join(options.linterPath, 'vlog'), leadingArgs: [] };
    case 'xvlog':
      return { command: path.join(options.linterPath, 'xvlog'), leadingArgs: [] };
    case 'verilator':
      return buildVerilatorCommand({
        isWindows,
        useWSL: options.useWSL ?? false,
        linterInstalledPath: options.linterPath,
      });
    case 'slang':
      return buildSlangCommand({
        isWindows,
        useWSL: options.useWSL ?? false,
        linterInstalledPath: options.linterPath,
      });
    case 'verible-verilog-lint':
      return {
        command: path.join(
          options.linterPath,
          isWindows ? 'verible-verilog-lint.exe' : 'verible-verilog-lint'
        ),
        leadingArgs: [],
      };
    default:
      return undefined;
  }
}

async function appendFormatterChecks(
  checks: DoctorCheck[],
  formatter: string,
  deps: DoctorDependencies,
  token?: vscode.CancellationToken
): Promise<void> {
  const formatterConfig = getFormatterConfiguration(formatter);
  if (!formatterConfig) {
    checks.push({ status: 'info', message: `${formatter} has no configured binary check` });
    return;
  }
  checks.push(...formatterConfig.extraChecks);
  await appendBinaryChecks(
    checks,
    `${formatterConfig.binaryName} binary`,
    formatterConfig.path,
    deps,
    token
  );
  await appendVersionCheck(checks, 'version', formatterConfig.path, ['--version'], deps, token);
}

function getFormatterConfiguration(
  formatter: string
): { binaryName: string; path: string; extraChecks: DoctorCheck[] } | undefined {
  switch (formatter) {
    case 'verilog-format': {
      const config = vscode.workspace.getConfiguration('verilog.formatting.verilogFormat');
      return {
        binaryName: 'verilog-format',
        path: config.get<string>('path', 'verilog-format'),
        extraChecks: [],
      };
    }
    case 'iStyle': {
      const config = vscode.workspace.getConfiguration('verilog.formatting.iStyleVerilogFormatter');
      return {
        binaryName: 'iStyle',
        path: config.get<string>('path', 'iStyle'),
        extraChecks: [
          { status: 'info', message: `iStyle arguments = ${config.get<string>('arguments', '')}` },
          { status: 'info', message: `iStyle style = ${config.get<string>('style', '')}` },
        ],
      };
    }
    case 'verible-verilog-format': {
      const config = vscode.workspace.getConfiguration('verilog.formatting.veribleVerilogFormatter');
      return {
        binaryName: 'verible-verilog-format',
        path: config.get<string>('path', 'verible-verilog-format'),
        extraChecks: [
          {
            status: 'info',
            message: `verible-verilog-format arguments = ${config.get<string>('arguments', '')}`,
          },
        ],
      };
    }
    default:
      return undefined;
  }
}

async function appendBinaryChecks(
  checks: DoctorCheck[],
  label: string,
  command: string,
  deps: DoctorDependencies,
  _token?: vscode.CancellationToken
): Promise<string | undefined> {
  const resolved = await deps.resolveExecutable(command);
  if (!resolved) {
    checks.push({ status: 'error', message: `${label}: ${command} not found` });
    return undefined;
  }
  checks.push({ status: 'ok', message: `${label}: ${command} -> ${resolved}` });
  return resolved;
}

async function appendVersionCheck(
  checks: DoctorCheck[],
  label: string,
  command: string,
  args: string[],
  deps: DoctorDependencies,
  token?: vscode.CancellationToken
): Promise<void> {
  const resolved = await deps.resolveExecutable(command);
  if (!resolved) {
    return;
  }
  const probe = await probeToolVersion(resolved, args, deps, token);
  if (probe.ok && probe.output) {
    checks.push({ status: 'ok', message: `${label}: ${probe.output}` });
  } else {
    checks.push({
      status: 'warn',
      message: 'version unknown; binary was found but --version did not return a clean version.',
    });
  }
}

async function appendWslChecks(
  checks: DoctorCheck[],
  deps: DoctorDependencies,
  token?: vscode.CancellationToken
): Promise<void> {
  const resolved = await appendBinaryChecks(checks, 'wsl binary', 'wsl', deps, token);
  if (!resolved) {
    return;
  }
  const probe = await probeToolVersion(resolved, ['echo', 'ok'], deps, token);
  if (probe.ok) {
    checks.push({ status: 'ok', message: 'wsl probe: ok' });
  } else {
    checks.push({ status: 'error', message: 'wsl probe failed' });
  }
}

function countStatuses(sections: DoctorSection[]): Record<DoctorStatus, number> {
  const counts: Record<DoctorStatus, number> = { ok: 0, warn: 0, error: 0, info: 0 };
  for (const section of sections) {
    for (const check of section.checks) {
      counts[check.status]++;
    }
  }
  return counts;
}

function buildRecommendations(sections: DoctorSection[]): string[] {
  const recommendations = new Set<string>();
  for (const section of sections) {
    for (const check of section.checks) {
      if (check.status === 'error' && check.message.includes('linter binary')) {
        recommendations.add('Install the selected linter or update `verilog.linting.path`.');
      } else if (check.status === 'error' && check.message.includes('ctags binary')) {
        recommendations.add('Install Universal Ctags or update `verilog.ctags.path`.');
      } else if (
        check.status === 'error' &&
        (check.message.includes('language server') || section.title === 'Language Servers')
      ) {
        recommendations.add('Disable unused language servers or install the configured binary.');
      } else if (check.status === 'error' && section.title === 'Formatting') {
        recommendations.add('Install the selected formatter or update its path setting.');
      } else if (check.status === 'warn' && check.message.includes('missing include path')) {
        recommendations.add('Create the missing include directory or remove it from settings.');
      } else if (check.status === 'warn' && check.message.includes('configPath')) {
        recommendations.add('Create the missing language server config file or clear the setting.');
      } else if (check.status === 'warn' && check.message.includes('settings file')) {
        recommendations.add('Create the missing formatter settings file or clear the setting.');
      } else if (check.status === 'warn' && check.message.includes('not Universal Ctags')) {
        recommendations.add('Set `verilog.ctags.path` to the Universal Ctags executable.');
      }
    }
  }
  return Array.from(recommendations);
}

function firstNonEmptyLine(output: string): string | undefined {
  return output
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}
