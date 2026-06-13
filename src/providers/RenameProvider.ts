// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { RenameService } from '../hdl/RenameService';
import { getExtensionLogger } from '../logging';

export class VerilogRenameProvider implements vscode.RenameProvider {
  private readonly logger = getExtensionLogger('Provider', 'Rename');

  constructor(private readonly renameService: RenameService) {}

  async prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Range | { range: vscode.Range; placeholder: string } | undefined> {
    this.logger.info('Prepare rename requested', { uri: document.uri.toString() });
    return this.renameService.prepareRename(document, position, token);
  }

  async provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
    token: vscode.CancellationToken
  ): Promise<vscode.WorkspaceEdit | undefined> {
    this.logger.info('Rename requested', { uri: document.uri.toString() });
    const edit = await this.renameService.provideRenameEdits(document, position, newName, token);
    this.logger.info('Rename returned', { changedFiles: edit ? edit.entries().length : 0 });
    return edit;
  }
}
