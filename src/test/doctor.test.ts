// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  buildFormatterChecks,
  buildLanguageServerConflictChecks,
  buildLanguageServerChecks,
  buildLinterChecks,
  expandPathVariables,
  renderDoctorReport,
  resolveConfigPath,
  type DoctorDependencies,
  type DoctorReport,
} from '../commands/Doctor';
import type { ToolRunOptions, ToolRunResult } from '../tools/ToolRunner';

function makeDeps(options: {
  executables?: Record<string, string | undefined>;
  existingPaths?: Set<string>;
  exitCode?: number;
  output?: string;
}): DoctorDependencies {
  return {
    runTool: async (toolOptions: ToolRunOptions): Promise<ToolRunResult> => ({
      exitCode: options.exitCode ?? 0,
      signal: null,
      stdout: options.output ?? 'tool version 1.0\n',
      stderr: '',
      command: toolOptions.command,
      args: toolOptions.args,
    }),
    resolveExecutable: async (command: string) => options.executables?.[command],
    exists: (inputPath: string) => options.existingPaths?.has(inputPath) ?? false,
  };
}

suite('Doctor', () => {
  test('renderDoctorReport includes sections, statuses, and summary counts', () => {
    const report: DoctorReport = {
      generatedAt: '2026-05-19T00:00:00.000Z',
      extensionId: 'mshr-h.veriloghdl',
      extensionVersion: '1.23.0',
      vscodeVersion: '1.100.0',
      platform: 'darwin',
      arch: 'arm64',
      remoteName: 'none',
      sections: [
        {
          title: 'Example',
          checks: [
            { status: 'ok', message: 'ok check' },
            { status: 'warn', message: 'warn check' },
            { status: 'error', message: 'error check' },
            { status: 'info', message: 'info check' },
          ],
        },
      ],
    };

    const rendered = renderDoctorReport(report);

    assert.ok(rendered.includes('## Example'));
    assert.ok(rendered.includes('[OK] ok check'));
    assert.ok(rendered.includes('[WARN] warn check'));
    assert.ok(rendered.includes('[ERROR] error check'));
    assert.ok(rendered.includes('[INFO] info check'));
    assert.ok(rendered.includes('OK: 1, WARN: 1, ERROR: 1, INFO: 1'));
  });

  test('expandPathVariables handles env vars and home directory', () => {
    process.env.VERILOG_DOCTOR_TEST = 'doctor-env';

    assert.strictEqual(
      expandPathVariables('${env:VERILOG_DOCTOR_TEST}/settings.toml'),
      'doctor-env/settings.toml'
    );
    assert.strictEqual(expandPathVariables('~'), os.homedir());
    assert.strictEqual(
      expandPathVariables('~/settings.toml'),
      `${os.homedir()}/settings.toml`
    );
  });

  test('resolveConfigPath handles empty, absolute, and workspace-relative paths', () => {
    assert.strictEqual(resolveConfigPath(''), '');
    assert.strictEqual(resolveConfigPath('   '), '');

    const absolutePath = path.join(os.tmpdir(), 'verilog-format.properties');
    assert.strictEqual(resolveConfigPath(absolutePath, '/workspace'), absolutePath);
    const workspaceFolder = path.join(os.tmpdir(), 'workspace');
    assert.strictEqual(
      resolveConfigPath('rtl/include', workspaceFolder),
      path.join(workspaceFolder, 'rtl/include')
    );
  });

  test('missing selected linter binary produces an error check', async () => {
    const checks = await buildLinterChecks(
      {
        linter: 'iverilog',
        linterPath: '',
        arguments: '',
        includePath: [],
        runAtFileLocation: false,
      },
      makeDeps({ executables: { iverilog: undefined } })
    );

    assert.ok(checks.some((check) => check.status === 'error' && check.message.includes('iverilog')));
  });

  test('linter checks report compile-unit mode support and active compile unit', async () => {
    const checks = await buildLinterChecks(
      {
        linter: 'verible-verilog-lint',
        linterPath: '',
        arguments: '',
        lintMode: 'compileUnit',
        activeCompileUnit: { id: 'unit', name: 'unit', files: 2 },
      },
      makeDeps({ executables: { 'verible-verilog-lint': '/usr/bin/verible-verilog-lint' } })
    );

    assert.ok(checks.some((check) => check.message === 'verilog.linting.mode = compileUnit'));
    assert.ok(checks.some((check) => check.status === 'warn' && check.message === 'compileUnit support = false'));
    assert.ok(checks.some((check) => check.message.includes('active compile unit = unit (unit), files=2')));
  });

  test('disabled language server produces info, not error', async () => {
    const checks = await buildLanguageServerChecks(
      {
        name: 'svls',
        enabled: false,
        path: 'svls',
        arguments: '',
      },
      makeDeps({})
    );

    assert.ok(checks.some((check) => check.status === 'info' && check.message.includes('disabled')));
    assert.ok(!checks.some((check) => check.status === 'error'));
  });

  test('enabled language server with missing binary produces error', async () => {
    const checks = await buildLanguageServerChecks(
      {
        name: 'svls',
        enabled: true,
        path: 'svls',
        arguments: '',
      },
      makeDeps({ executables: { svls: undefined } })
    );

    assert.ok(checks.some((check) => check.status === 'error' && check.message.includes('svls')));
  });

  test('missing include path produces warn, not error', async () => {
    const checks = await buildLinterChecks(
      {
        linter: 'verilator',
        linterPath: '',
        arguments: '',
        includePath: ['rtl/include'],
        runAtFileLocation: false,
        useWSL: false,
        workspaceFolder: '/workspace',
        isWindows: false,
      },
      makeDeps({ executables: { verilator: '/usr/bin/verilator' } })
    );

    assert.ok(
      checks.some(
        (check) => check.status === 'warn' && check.message.includes('/workspace/rtl/include')
      )
    );
    assert.ok(!checks.some((check) => check.status === 'error'));
  });

  test('fake successful version probe is rendered as OK', async () => {
    const checks = await buildLanguageServerChecks(
      {
        name: 'verible-verilog-ls',
        enabled: true,
        path: 'verible-verilog-ls',
        arguments: '',
      },
      makeDeps({
        executables: { 'verible-verilog-ls': '/usr/bin/verible-verilog-ls' },
        output: 'verible-verilog-ls 1.0\n',
      })
    );

    assert.ok(
      checks.some(
        (check) => check.status === 'ok' && check.message.includes('verible-verilog-ls 1.0')
      )
    );
  });

  test('failed version probe with existing binary renders version unknown warning', async () => {
    const checks = await buildLanguageServerChecks(
      {
        name: 'veridian',
        enabled: true,
        path: 'veridian',
        arguments: '',
      },
      makeDeps({
        executables: { veridian: '/usr/bin/veridian' },
        exitCode: 1,
      })
    );

    assert.ok(
      checks.some(
        (check) => check.status === 'warn' && check.message.includes('version unknown')
      )
    );
  });

  test('warns when multiple language servers are enabled for systemverilog', () => {
    const checks = buildLanguageServerConflictChecks([
      { name: 'svls', enabled: true, languages: ['systemverilog'] },
      { name: 'veridian', enabled: true, languages: ['systemverilog'] },
      { name: 'rustHdl', enabled: true, languages: ['vhdl'] },
    ]);

    assert.ok(
      checks.some(
        (check) =>
          check.status === 'warn' &&
          check.message.includes('systemverilog') &&
          check.message.includes('svls, veridian')
      )
    );
  });

  test('does not warn when only one language server is enabled for a language', () => {
    const checks = buildLanguageServerConflictChecks([
      { name: 'svls', enabled: true, languages: ['systemverilog'] },
      { name: 'veridian', enabled: false, languages: ['systemverilog'] },
      { name: 'rustHdl', enabled: true, languages: ['vhdl'] },
    ]);

    assert.ok(!checks.some((check) => check.status === 'warn'));
  });

  test('language server checks display parsed arguments', async () => {
    const checks = await buildLanguageServerChecks(
      {
        name: 'svls',
        enabled: false,
        path: 'svls',
        arguments: '--foo "A=B C"',
      },
      makeDeps({})
    );

    assert.ok(
      checks.some((check) => check.message === 'svls parsed arguments = [--foo, A=B C]')
    );
  });

  test('selected formatter with empty path produces one actionable warning', async () => {
    const config = vscode.workspace.getConfiguration('verilog.formatting.verilogFormat');
    const previousPath = config.get('path');

    try {
      await config.update('path', '', vscode.ConfigurationTarget.Global);

      const checks = await buildFormatterChecks('verilog-format', makeDeps({}));

      assert.ok(
        checks.some(
          (check) =>
            check.status === 'warn' &&
            check.message.includes('verilog.formatting.verilogFormat.path')
        )
      );
      assert.ok(!checks.some((check) => check.status === 'error'));
    } finally {
      await config.update('path', previousPath, vscode.ConfigurationTarget.Global);
    }
  });
});
