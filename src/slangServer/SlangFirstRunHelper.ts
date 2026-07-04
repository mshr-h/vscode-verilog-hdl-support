// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { SlangConfigService } from './SlangConfigService';

const DISMISSED_KEY = 'slangServer.firstRunConfigPrompt.dismissed';
const HDL_LANGUAGE_IDS = new Set(['systemverilog']);

export class SlangFirstRunHelper implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private promptedThisSession = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configService: SlangConfigService
  ) {
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        void this.maybePrompt(document);
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          void this.maybePrompt(editor.document);
        }
      })
    );
    for (const editor of vscode.window.visibleTextEditors) {
      void this.maybePrompt(editor.document);
    }
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private async maybePrompt(document: vscode.TextDocument): Promise<void> {
    if (
      this.promptedThisSession
      || !HDL_LANGUAGE_IDS.has(document.languageId)
      || this.context.globalState.get<boolean>(DISMISSED_KEY, false)
      || this.configService.getWorkspaceConfigUri() === undefined
    ) {
      return;
    }
    const status = await this.configService.getStatus();
    if (status.workspaceConfig) {
      return;
    }
    this.promptedThisSession = true;
    const selection = await vscode.window.showInformationMessage(
      'No .slang/server.json found for this workspace. Configure slang-server project settings?',
      'Configure Slang Project',
      'Don’t Show Again',
      'Later'
    );
    if (selection === 'Configure Slang Project') {
      await vscode.commands.executeCommand('verilog.configureSlangProject');
    } else if (selection === 'Don’t Show Again') {
      await this.context.globalState.update(DISMISSED_KEY, true);
    }
  }
}
