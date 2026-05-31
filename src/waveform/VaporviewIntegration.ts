// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';

const VAPORVIEW_EXTENSION_IDS = [
  'lramseyer.vaporview',
  'Lramseyer.vaporview',
] as const;

export interface VaporviewOpenOptions {
  loadAll?: boolean;
  maxSignals?: number;
}

interface VaporviewOpenFileArgs {
  uri: vscode.Uri;
  loadAll?: boolean;
  maxSignals?: number;
}

function getVaporviewExtension(): vscode.Extension<unknown> | undefined {
  for (const extensionId of VAPORVIEW_EXTENSION_IDS) {
    const extension = vscode.extensions.getExtension(extensionId);
    if (extension) {
      return extension;
    }
  }

  return undefined;
}

function clampMaxSignals(maxSignals: number): number {
  return Math.min(Math.max(maxSignals, 1), 64);
}

export async function openWithVaporview(
  uri: vscode.Uri,
  options: VaporviewOpenOptions = {}
): Promise<boolean> {
  const logger = getExtensionLogger('Waveform', 'Vaporview');
  const extension = getVaporviewExtension();
  if (!extension) {
    logger.debug('Vaporview extension is not installed');
    return false;
  }

  try {
    if (!extension.isActive) {
      await extension.activate();
    }

    const args: VaporviewOpenFileArgs = {
      uri,
      loadAll: options.loadAll ?? false,
      maxSignals: clampMaxSignals(options.maxSignals ?? 64),
    };

    await vscode.commands.executeCommand('vaporview.openFile', args);
    logger.info('Opened waveform with Vaporview', { path: uri.fsPath });
    return true;
  } catch (error) {
    logger.warn('Failed to open waveform with Vaporview', { error });
    return false;
  }
}
