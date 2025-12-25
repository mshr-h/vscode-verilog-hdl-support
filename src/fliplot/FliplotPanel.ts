// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

import { Logger } from '../logger';

export class FliplotPanel {
  private static currentPanel: FliplotPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly logger: Logger;
  private readonly disposables: vscode.Disposable[] = [];
  private isReady = false;
  private pendingVcd: { content: string; title?: string } | null = null;

  static show(context: vscode.ExtensionContext, logger: Logger): FliplotPanel {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
    if (FliplotPanel.currentPanel) {
      FliplotPanel.currentPanel.panel.reveal(column);
      return FliplotPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'verilog.fliplot',
      'Fliplot Waveform Viewer',
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media', 'fliplot')],
      }
    );

    FliplotPanel.currentPanel = new FliplotPanel(panel, context.extensionUri, logger);
    return FliplotPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, logger: Logger) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.logger = logger;
    this.panel.webview.html = FliplotPanel.buildHtml(this.panel.webview, this.extensionUri);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (message?.type !== 'fliplotReady') {
          return;
        }
        this.isReady = true;
        if (this.pendingVcd) {
          this.postVcd(this.pendingVcd.content, this.pendingVcd.title);
          this.pendingVcd = null;
        }
      },
      null,
      this.disposables
    );
    this.logger.info('Fliplot panel opened.');
  }

  dispose() {
    FliplotPanel.currentPanel = undefined;
    this.logger.info('Fliplot panel disposed.');
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  loadVcdContent(content: string, title?: string) {
    if (!this.isReady) {
      this.pendingVcd = { content, title };
      return;
    }
    this.postVcd(content, title);
  }

  private postVcd(content: string, title?: string) {
    this.panel.webview.postMessage({
      type: 'loadVcd',
      content,
      title,
    });
  }

  static buildHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const fliplotRoot = vscode.Uri.joinPath(extensionUri, 'media', 'fliplot');
    const bootstrapCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(fliplotRoot, 'vendor', 'bootstrap', 'css', 'bootstrap.min.css')
    );
    const jqueryUiCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(fliplotRoot, 'vendor', 'jquery-ui', 'smoothness', 'jquery-ui.css')
    );
    const jstreeCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(fliplotRoot, 'vendor', 'jstree', 'themes', 'default', 'style.min.css')
    );
    const contextMenuCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(fliplotRoot, 'vendor', 'jquery-contextmenu', 'jquery.contextMenu.min.css')
    );
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(fliplotRoot, 'assets', 'index-BZr_bcjx.css')
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(fliplotRoot, 'assets', 'index-BH5DeP3f.js')
    );
    const bridgeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(fliplotRoot, 'assets', 'vscode-bridge.js')
    );
    const baseUri = `${webview.asWebviewUri(fliplotRoot)}/`;
    const csp = [
      "default-src 'none'",
      `connect-src ${webview.cspSource}`,
      `style-src ${webview.cspSource} 'unsafe-inline' https:`,
      `img-src ${webview.cspSource} https: data:`,
      `font-src ${webview.cspSource} https: data:`,
      `script-src ${webview.cspSource}`,
    ].join('; ');

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <base href="${baseUri}" />
    <title>Fliplot</title>

    <link rel="stylesheet" href="${bootstrapCssUri}" />
    <link rel="stylesheet" href="${jqueryUiCssUri}" />
    <link rel="stylesheet" href="${jstreeCssUri}" />
    <link rel="stylesheet" href="${contextMenuCssUri}" />
    <link rel="stylesheet" href="${cssUri}" />
    <script type="module" src="${bridgeUri}"></script>
    <script type="module" src="${jsUri}"></script>
  </head>

  <body>
    <nav class="navbar-inverse toolbar">
      <div class="">
        <ul class="">
          <div id="tool-group-file" class="tool-group-container">
            <div class="tool-group-tools">
              <input type="file" accept="*" id="file-open-shadow" style="display: none" />
              <button
                id="file-open-button"
                title="Open a VCD file"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                <span
                  class="glyphicon glyphicon-open-file"
                  aria-hidden="true"
                  title="Open a VCD file"
                ></span>
              </button>
              <button
                id="remove-all"
                title="Remove all signals"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                rm *
              </button>
            </div>
            <div class="tool-group-name">
              <div>VCD</div>
            </div>
          </div>
          <div id="tool-group-zoom" class="tool-group-container">
            <div class="tool-group-tools">
              <button title="Zoom in" id="zoom-in" type="button" class="btn btn-primary navbar-btn">
                <span class="glyphicon glyphicon-zoom-in" aria-hidden="true"></span>
              </button>
              <button
                title="Zoom out"
                id="zoom-out"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                <span class="glyphicon glyphicon-zoom-out" aria-hidden="true"></span>
              </button>
              <button
                title="Zoom fit: show whole data"
                id="zoom-fit"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                <span class="glyphicon glyphicon-fullscreen" aria-hidden="true"></span>
              </button>
            </div>
            <div class="tool-group-name">
              <div>Zoom</div>
            </div>
          </div>
          <div id="tool-group-cursor" class="tool-group-container">
            <div class="tool-group-tools">
              <button
                id="cursor-to-0"
                title="Move cursor to beginning of the simulation"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                HOME
              </button>
              <button
                id="cursor-to-prev-fall"
                title="Move cursor to previous falling edge of the selected signal"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                &#x2B10;
              </button>
              <button
                id="cursor-to-prev-rise"
                title="Move cursor to previous rising edge of the selected signal"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                &#x2B11;
              </button>
              <button
                id="cursor-to-prev-transition"
                title="Move cursor to previous transition (any) of the selected signal"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                &lt;
              </button>
              <button
                id="cursor-to-next-transition"
                title="Move cursor to next transition (any) of the selected signal"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                &gt;
              </button>
              <button
                id="cursor-to-next-rise"
                title="Move cursor to next rising edge of the selected signal"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                &#x2B0F;
              </button>
              <button
                id="cursor-to-next-fall"
                title="Move cursor to nexf falling edge of the selected signal"
                type="button"
                class="btn btn-primary navbar-btn"
              >
                &#x2B0E;
              </button>
              <button
                id="cursor-to-end"
                title="Move cursor to end of the simulation"
                type="button"
                class="btn btn-primary navbar-btn"
                data-toggle="button"
              >
                END
              </button>
            </div>
            <div class="tool-group-name">
              <div>Cursor</div>
            </div>
          </div>
        </ul>
      </div>
    </nav>

    <div id="epic-container">
      <div id="structure-col" class="wave-table resizable-col">
        <input id="structure-search" type="text" placeholder="Filter tree" />
        <div id="structure-container-scroll-y">
          <div id="main-container-tree">
            <div id="object-tree"></div>
          </div>
        </div>
      </div>
      <div id="main-container-scroll-y">
        <div id="names-col-container" class="wave-table resizable-col">
          <div id="names-col-container-scroll"></div>
          <div id="names-col-placeholder"></div>
        </div>
        <div id="values-col-container" class="wave-table resizable-col">
          <div id="values-col-container-scroll">
            <ul id="values-col" class="wave-table"></ul>
          </div>
          <div id="values-col-placeholder"></div>
        </div>

        <div id="wave-axis-container" class="wave-table">
          <div id="wave-time-placeholder">
            <div id="wave-axis-canvas-sticky">
              <div id="wave-axis-canvas-relative">
                <canvas id="wave-axis-canvas-webgl2"></canvas>
                <canvas id="wave-axis-canvas"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <footer>
      <div>
        Credits: Benedek Racz:
        <a
          href="https://github.com/raczben/fliplot"
          target="_blank"
          title="Open the fliplot GitHub project in a new tab"
          >GitHub</a
        >
      </div>
    </footer>
  </body>
</html>`;
  }
}
