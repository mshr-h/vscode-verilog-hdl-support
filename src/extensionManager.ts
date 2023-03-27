// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { SemVer } from 'semver';
import { Logger } from './logger';

export class ExtensionManager {
  private context: vscode.ExtensionContext;
  private extensionID: string;
  private packageJSON: any;
  private extensionPath: string;
  private logger: Logger;

  constructor(context: vscode.ExtensionContext, extensionID: string, logger: Logger) {
    this.context = context;
    this.extensionID = extensionID;
    this.logger = logger;
    this.packageJSON = vscode.extensions.getExtension(this.extensionID).packageJSON;
    this.extensionPath = vscode.extensions.getExtension(this.extensionID).extensionPath;
  }

  public isVersionUpdated(): boolean {
    let previousVersion = new SemVer(this.context.globalState.get('version', '0.0.0'));
    let currentVersion = new SemVer(this.packageJSON.version);

    // update version value
    this.context.globalState.update('version', currentVersion.version);
    this.logger.info(
      'previousVersion: ' +
        JSON.stringify(previousVersion.version) +
        ', currentVersion: ' +
        JSON.stringify(currentVersion.version)
    );

    return previousVersion < currentVersion;
  }

  public showChangelogNotification() {
    let displayName: string = this.packageJSON.displayName;
    let extensionPath: string = this.extensionPath;
    if (this.isVersionUpdated()) {
      vscode.window
        .showInformationMessage(displayName + ' extension has been updated', 'Open Changelog')
        .then(function (_: string) {
          let changelogUri = vscode.Uri.file(extensionPath + '/CHANGELOG.md');
          vscode.workspace.openTextDocument(changelogUri).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
        });
    }
  }
}
