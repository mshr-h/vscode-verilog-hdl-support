// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import { FliplotPanel } from '../fliplot/FliplotPanel';
import { getExtensionLogger } from '../logging';
import { openWithVaporview } from './VaporviewIntegration';

type WaveformViewer = 'auto' | 'vaporview' | 'fliplot';

interface UriCommandArgument {
  resourceUri?: vscode.Uri;
  uri?: vscode.Uri;
}

function getUriFromCommandArgument(arg?: unknown): vscode.Uri | undefined {
  if (arg instanceof vscode.Uri) {
    return arg;
  }

  if (arg && typeof arg === 'object') {
    const maybe = arg as UriCommandArgument;
    if (maybe.resourceUri instanceof vscode.Uri) {
      return maybe.resourceUri;
    }
    if (maybe.uri instanceof vscode.Uri) {
      return maybe.uri;
    }
  }

  return vscode.window.activeTextEditor?.document.uri;
}

function isVcdUri(uri: vscode.Uri): boolean {
  return path.extname(uri.fsPath).toLowerCase() === '.vcd';
}

async function openWithFliplot(
  context: vscode.ExtensionContext,
  uri: vscode.Uri
): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  const panel = FliplotPanel.show(context);
  panel.loadVcdContent(document.getText(), path.basename(uri.fsPath));
}

export async function openWaveform(
  context: vscode.ExtensionContext,
  arg?: unknown
): Promise<void> {
  const logger = getExtensionLogger('Waveform', 'Open');
  const uri = getUriFromCommandArgument(arg);
  if (!uri) {
    vscode.window.showWarningMessage('No waveform file is selected.');
    return;
  }

  if (!isVcdUri(uri)) {
    vscode.window.showWarningMessage('Only VCD waveform files are supported by this command.');
    return;
  }

  const config = vscode.workspace.getConfiguration('verilog.waveform');
  const viewer = config.get<WaveformViewer>('viewer', 'auto');
  const loadAll = config.get<boolean>('vaporview.loadAll', false);
  const maxSignals = config.get<number>('vaporview.maxSignals', 64);

  logger.debug('Opening waveform', { path: uri.fsPath, viewer });

  if (viewer !== 'fliplot') {
    const opened = await openWithVaporview(uri, { loadAll, maxSignals });
    if (opened) {
      return;
    }

    if (viewer === 'vaporview') {
      vscode.window.showWarningMessage(
        'Vaporview extension is not installed or could not be activated.'
      );
      return;
    }
  }

  await openWithFliplot(context, uri);
  logger.info('Opened waveform with Fliplot', { path: uri.fsPath });
}
