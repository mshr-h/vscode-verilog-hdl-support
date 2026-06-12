// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as vscode from 'vscode';
import { getLintProjectContext } from '../linter/ProjectLintContext';
import type { ProjectService } from '../project/ProjectService';

suite('Project lint context', () => {
  test('returns include dirs and defines when enabled', async () => {
    const config = vscode.workspace.getConfiguration('verilog.linting');
    const previous = config.get('useProjectContext');
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });
    const projectService = {
      getPreferredFileContext: () => ({
        file: document.uri,
        compileUnitId: 'unit',
        includeDirs: [vscode.Uri.file('/workspace/inc')],
        defines: {
          SIM: { name: 'SIM', value: true, source: 'filelist' },
          WIDTH: { name: 'WIDTH', value: '32', source: 'filelist' },
        },
      }),
    } as unknown as ProjectService;

    try {
      await config.update('useProjectContext', true, vscode.ConfigurationTarget.Global);
      const context = getLintProjectContext(projectService, document);

      assert.deepStrictEqual(context.includePaths, ['/workspace/inc']);
      assert.deepStrictEqual(context.defineArgs, ['SIM', 'WIDTH=32']);
    } finally {
      await config.update('useProjectContext', previous, vscode.ConfigurationTarget.Global);
    }
  });

  test('returns empty context when disabled', async () => {
    const config = vscode.workspace.getConfiguration('verilog.linting');
    const previous = config.get('useProjectContext');
    const document = await vscode.workspace.openTextDocument({
      language: 'systemverilog',
      content: 'module top; endmodule',
    });

    try {
      await config.update('useProjectContext', false, vscode.ConfigurationTarget.Global);
      const context = getLintProjectContext({} as ProjectService, document);

      assert.deepStrictEqual(context, { includePaths: [], defineArgs: [] });
    } finally {
      await config.update('useProjectContext', previous, vscode.ConfigurationTarget.Global);
    }
  });
});
