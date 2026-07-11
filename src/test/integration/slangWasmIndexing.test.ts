// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { getRepositoryRoot, sameFsPath } from '../pathTestUtils';

suite('bundled WASM slang-server workspace indexing', () => {
  test('resolves default and explicit-index definitions after deferred startup', async function () {
    this.timeout(90000);
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(folder, 'Expected the slang WASM integration fixture workspace to be open');
    assert.ok(
      vscode.extensions.getExtension('ms-vscode.wasm-wasi-core'),
      'Expected the ms-vscode.wasm-wasi-core extension to be installed'
    );
    assert.ok(
      await fileExists(path.join(getRepositoryRoot(), 'resources', 'wasm', 'slang-server.wasm')),
      'Expected resources/wasm/slang-server.wasm; run npm run build:slang-wasm first'
    );

    const extension = vscode.extensions.getExtension('mshr-h.veriloghdl');
    assert.ok(extension);
    await extension.activate();

    const topUri = vscode.Uri.joinPath(folder.uri, 'rtl', 'top.v');
    const document = await vscode.workspace.openTextDocument(topUri);
    await vscode.window.showTextDocument(document);

    const autoTarget = vscode.Uri.joinPath(folder.uri, 'rtl', 'auto_child.v');
    await waitForDefinition(document, 'veriloghdl_wasm_auto_child', autoTarget, 30000);

    const slangDir = vscode.Uri.joinPath(folder.uri, '.slang');
    await vscode.workspace.fs.createDirectory(slangDir);
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(slangDir, 'server.json'),
      Buffer.from(JSON.stringify({
        flags: '-f filelists/top_only.f',
        build: 'filelists/top_only.f',
        index: [{ dirs: ['rtl'] }],
      }, null, 2))
    );
    const explicitTarget = vscode.Uri.joinPath(folder.uri, 'rtl', 'indexed_child.v');
    await vscode.workspace.fs.writeFile(
      explicitTarget,
      Buffer.from('module veriloghdl_wasm_explicit_child;\nendmodule\n')
    );
    await vscode.commands.executeCommand('verilog.restartSlangServer');

    await waitForDefinition(document, 'veriloghdl_wasm_explicit_child', explicitTarget, 30000);
  });
});

async function waitForDefinition(
  document: vscode.TextDocument,
  symbol: string,
  expectedUri: vscode.Uri,
  timeoutMs: number
): Promise<void> {
  const offset = document.getText().indexOf(symbol);
  assert.ok(offset >= 0, `Symbol ${symbol} was not found in ${document.uri.fsPath}`);
  const position = document.positionAt(offset + 1);
  const startedAt = Date.now();
  let lastResult: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    const result = await vscode.commands.executeCommand<Array<vscode.Location | vscode.LocationLink>>(
      'vscode.executeDefinitionProvider',
      document.uri,
      position
    );
    lastResult = result;
    if (result?.some((location) => sameFsPath(definitionUri(location).fsPath, expectedUri.fsPath))) {
      return;
    }
    await delay(200);
  }

  assert.fail(`Definition for ${symbol} did not resolve to ${expectedUri.fsPath}: ${JSON.stringify(lastResult)}`);
}

function definitionUri(location: vscode.Location | vscode.LocationLink): vscode.Uri {
  return 'targetUri' in location ? location.targetUri : location.uri;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
    return true;
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
