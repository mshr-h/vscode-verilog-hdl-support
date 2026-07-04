// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';

export interface WasiFileSystemMapperOptions {
  workspaceRoot: vscode.Uri;
  tmpRoot: vscode.Uri;
  homeRoot?: vscode.Uri;
}

export class WasiFileSystemMapper {
  readonly workspaceMount = '/workspace';
  readonly tmpMount = '/tmp';
  readonly homeMount = '/home';

  constructor(private readonly options: WasiFileSystemMapperOptions) {}

  toWasiPath(hostPath: string): string | undefined {
    return this.mapHostToMount(hostPath, this.options.workspaceRoot.fsPath, this.workspaceMount)
      ?? this.mapHostToMount(hostPath, this.options.tmpRoot.fsPath, this.tmpMount)
      ?? (this.options.homeRoot ? this.mapHostToMount(hostPath, this.options.homeRoot.fsPath, this.homeMount) : undefined);
  }

  toHostPath(wasiPath: string): string | undefined {
    return this.mapMountToHost(wasiPath, this.workspaceMount, this.options.workspaceRoot.fsPath)
      ?? this.mapMountToHost(wasiPath, this.tmpMount, this.options.tmpRoot.fsPath)
      ?? (this.options.homeRoot ? this.mapMountToHost(wasiPath, this.homeMount, this.options.homeRoot.fsPath) : undefined);
  }

  toHostUri(uriOrPath: string): vscode.Uri | undefined {
    const rawPath = uriOrPath.startsWith('file://') ? vscode.Uri.parse(uriOrPath).path : uriOrPath;
    const hostPath = this.toHostPath(rawPath);
    return hostPath ? vscode.Uri.file(hostPath) : undefined;
  }

  private mapHostToMount(hostPath: string, hostRoot: string, mountRoot: string): string | undefined {
    const relative = path.relative(hostRoot, hostPath);
    if (relative === '') {
      return mountRoot;
    }
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return undefined;
    }
    return `${mountRoot}/${relative.replace(/\\/g, '/')}`;
  }

  private mapMountToHost(wasiPath: string, mountRoot: string, hostRoot: string): string | undefined {
    if (wasiPath === mountRoot) {
      return hostRoot;
    }
    if (!wasiPath.startsWith(`${mountRoot}/`)) {
      return undefined;
    }
    return path.join(hostRoot, wasiPath.slice(mountRoot.length + 1));
  }
}
