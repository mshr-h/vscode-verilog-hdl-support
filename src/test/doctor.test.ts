// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import {
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
  output?: string;
}): DoctorDependencies {
  return {
    runTool: async (toolOptions: ToolRunOptions): Promise<ToolRunResult> => ({
      exitCode: 0,
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
  test('renderDoctorReport includes sections and statuses', () => {
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
      path.join(os.homedir(), 'settings.toml')
    );
  });

  test('resolveConfigPath handles empty, absolute, and workspace-relative paths', () => {
    assert.strictEqual(resolveConfigPath(''), '');
    assert.strictEqual(resolveConfigPath('   '), '');

    const absolutePath = path.join(os.tmpdir(), 'verilog-format.properties');
    assert.strictEqual(resolveConfigPath(absolutePath, '/workspace'), absolutePath);
    assert.strictEqual(resolveConfigPath('rtl/include', '/workspace'), path.join('/workspace', 'rtl/include'));
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

  test('disabled linter reports warning without probing binaries', async () => {
    const checks = await buildLinterChecks(
      {
        linter: 'none',
        linterPath: '',
      },
      makeDeps({})
    );

    assert.ok(checks.some((check) => check.status === 'warn' && check.message.includes('none')));
  });
});
