// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';
import { FliplotPanel } from './FliplotPanel';

export class FliplotCustomEditor implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'verilog.fliplotEditor';

  private readonly context: vscode.ExtensionContext;
  private readonly logger = getExtensionLogger('Fliplot', 'CustomEditor');

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media', 'fliplot')],
    };
    webviewPanel.webview.html = FliplotPanel.buildHtml(
      webviewPanel.webview,
      this.context.extensionUri
    );

    let isReady = false;
    let pendingContent = document.getText();
    let pendingTitle = path.basename(document.uri.fsPath);

    const postVcd = () => {
      webviewPanel.webview.postMessage({
        type: 'loadVcd',
        content: pendingContent,
        title: pendingTitle,
      });
    };

    const onReady = () => {
      isReady = true;
      postVcd();
    };

    const messageDisposable = webviewPanel.webview.onDidReceiveMessage((message) => {
      if (message?.type === 'fliplotReady') {
        onReady();
      }
    });

    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      pendingContent = document.getText();
      pendingTitle = path.basename(document.uri.fsPath);
      if (isReady) {
        postVcd();
      }
    });

    webviewPanel.onDidDispose(() => {
      messageDisposable.dispose();
      changeDisposable.dispose();
    });

    this.logger.info("Custom editor opened", { path: document.uri.fsPath });
  }
}
