// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { SemVer } from 'semver';
import { Logger } from './logger';

interface PackageJSON {
  version: string;
  displayName: string;
}

export class ExtensionManager {
  private context: vscode.ExtensionContext;
  private extensionID: string;
  private packageJSON: PackageJSON;
  private extensionPath: string;
  private logger: Logger;

  constructor(context: vscode.ExtensionContext, extensionID: string, logger: Logger) {
    this.context = context;
    this.extensionID = extensionID;
    this.logger = logger;
    const extension = vscode.extensions.getExtension(this.extensionID);
    if (!extension) {
      throw new Error(`Extension ${extensionID} not found`);
    }
    this.packageJSON = extension.packageJSON;
    this.extensionPath = extension.extensionPath;
  }

  public isVersionUpdated(): boolean {
    const previousVersion = new SemVer(this.context.globalState.get('version', '0.0.0'));
    const currentVersion = new SemVer(this.packageJSON.version);

    // update version value
    this.context.globalState.update('version', currentVersion.version);
    this.logger.info(
      `previousVersion: ${ 
        JSON.stringify(previousVersion.version) 
        }, currentVersion: ${ 
        JSON.stringify(currentVersion.version)}`
    );

    return previousVersion < currentVersion;
  }

  public showChangelogNotification() {
    const displayName: string = this.packageJSON.displayName;
    const extensionPath: string = this.extensionPath;
    if (this.isVersionUpdated()) {
      vscode.window
        .showInformationMessage(`${displayName  } extension has been updated`, 'Open Changelog')
        .then(function (_: string | undefined) {
          const changelogUri = vscode.Uri.file(`${extensionPath  }/CHANGELOG.md`);
          vscode.workspace.openTextDocument(changelogUri).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
        });
    }
  }
}
