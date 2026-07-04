// SPDX-License-Identifier: MIT
import * as os from 'os';
import * as vscode from 'vscode';
import type { SlangServerManager } from './SlangServerManager';
import { WasiFileSystemMapper } from './WasiFileSystemMapper';

export interface SlangLocation {
  uri?: string;
  path?: string;
  range?: vscode.Range | { start: { line: number; character: number }; end: { line: number; character: number } };
}

export interface SlangModule {
  name: string;
  location?: SlangLocation;
  declaration?: SlangLocation;
  instCount?: number;
  firstInstance?: SlangInstance;
}

export interface SlangScope {
  name?: string;
  moduleName?: string;
  instPath?: string;
  location?: SlangLocation;
  children?: SlangScope[];
  instances?: SlangInstance[];
}

export interface SlangInstance {
  name?: string;
  moduleName?: string;
  instPath?: string;
  location?: SlangLocation;
  children?: SlangScope[];
}

interface HierarchyChildren {
  scopes: SlangScope[];
  instances: SlangInstance[];
}

export class SlangServerApi {
  constructor(
    private readonly manager: SlangServerManager,
    private readonly workspaceFolderProvider: () => vscode.WorkspaceFolder | undefined = () => vscode.workspace.workspaceFolders?.[0]
  ) {}

  async setBuildFile(path: string): Promise<unknown> {
    return this.request('slang.setBuildFile', [this.toServerPath(path)]);
  }

  async setTopLevel(uriOrPath: string): Promise<unknown> {
    return this.request('slang.setTopLevel', [this.toServerPath(uriOrPath)]);
  }

  async getScopesByModule(): Promise<SlangModule[]> {
    return (await this.queryArray('slang.getScopesByModule', []))
      .map((item) => this.toModule(item))
      .filter(isDefined);
  }

  async getInstancesOfModule(moduleName: string): Promise<SlangInstance[]> {
    return (await this.queryArray('slang.getInstancesOfModule', [moduleName]))
      .map((item) => this.toInstanceFromQualified(item, moduleName))
      .filter(isDefined);
  }

  async getModulesInFile(fsPath: string): Promise<SlangModule[]> {
    return (await this.queryArray('slang.getModulesInFile', [this.toServerPath(fsPath)]))
      .map((item) => this.toModule(item))
      .filter(isDefined);
  }

  async getFilesContainingModule(moduleName: string): Promise<string[]> {
    const files = (await this.queryArray('slang.getFilesContainingModule', [moduleName]))
      .filter((item): item is string => typeof item === 'string');
    if (this.manager.getStatus().resolvedRuntime !== 'bundled-wasm') {
      return files;
    }
    return files.map((file) => this.toHostUri(file)?.fsPath ?? file);
  }

  async getScope(hierPath: string): Promise<SlangScope | undefined> {
    try {
      return this.toScope(await this.request('slang.getScope', [hierPath]), hierPath);
    } catch {
      return undefined;
    }
  }

  async expandMacros(src: string, dst: string): Promise<unknown> {
    return this.request('slang.expandMacros', [{
      src: this.toServerPath(src),
      dst: this.toServerPath(dst),
    }]);
  }

  toLocation(input: SlangLocation | undefined): vscode.Location | undefined {
    if (!input) {
      return undefined;
    }
    const uri = this.toHostUri(input.uri ?? input.path);
    if (!uri || !input.range) {
      return undefined;
    }
    const range = input.range instanceof vscode.Range
      ? input.range
      : new vscode.Range(
          input.range.start.line,
          input.range.start.character,
          input.range.end.line,
          input.range.end.character
        );
    return new vscode.Location(uri, range);
  }

  private async request<T>(command: string, args: unknown[]): Promise<T> {
    return this.manager.executeCommand<T>(command, args);
  }

  private async queryArray(command: string, args: unknown[]): Promise<unknown[]> {
    try {
      const value = await this.request<unknown>(command, args);
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  private toModule(input: unknown): SlangModule | undefined {
    if (typeof input === 'string') {
      return { name: input };
    }
    const record = asRecord(input);
    if (!record) {
      return undefined;
    }

    const name = getString(record, 'declName') ?? getString(record, 'name');
    if (!name) {
      return undefined;
    }

    const declaration = this.toSlangLocation(record.declLoc ?? record.declaration);
    return {
      name,
      declaration,
      location: this.toSlangLocation(record.location) ?? declaration,
      instCount: getNumber(record, 'instCount'),
      firstInstance: this.toInstanceFromQualified(record.inst, name),
    };
  }

  private toInstanceFromQualified(input: unknown, moduleName?: string): SlangInstance | undefined {
    const record = asRecord(input);
    if (!record) {
      return undefined;
    }

    const instPath = getString(record, 'instPath');
    const name = getString(record, 'name') ?? lastHierarchySegment(instPath);
    const resolvedModuleName = getString(record, 'moduleName') ?? moduleName;
    if (!instPath && !name && !resolvedModuleName) {
      return undefined;
    }

    return {
      name,
      moduleName: resolvedModuleName,
      instPath,
      location: this.toSlangLocation(record.instLoc ?? record.location),
    };
  }

  private toScope(input: unknown, hierPath: string): SlangScope | undefined {
    if (Array.isArray(input)) {
      const children = this.toHierarchyChildren(input, hierPath);
      return {
        name: hierPath || 'Top',
        instPath: hierPath,
        children: children.scopes,
        instances: children.instances,
      };
    }

    const normalized = this.toExistingScope(input);
    if (normalized) {
      return normalized;
    }

    const hierarchyItem = this.toHierarchyItem(input, hierPath);
    if (hierarchyItem?.scope) {
      return hierarchyItem.scope;
    }
    if (hierarchyItem?.instance) {
      return {
        name: hierarchyItem.instance.name,
        moduleName: hierarchyItem.instance.moduleName,
        instPath: hierarchyItem.instance.instPath,
        location: hierarchyItem.instance.location,
        instances: [hierarchyItem.instance],
      };
    }
    return undefined;
  }

  private toExistingScope(input: unknown): SlangScope | undefined {
    const record = asRecord(input);
    if (!record || record.instName) {
      return undefined;
    }

    const children = Array.isArray(record.children)
      ? record.children.map((child) => this.toExistingScope(child)).filter(isDefined)
      : undefined;
    const instances = Array.isArray(record.instances)
      ? record.instances.map((instance) => this.toInstanceFromQualified(instance)).filter(isDefined)
      : undefined;
    const name = getString(record, 'name');
    const moduleName = getString(record, 'moduleName');
    const instPath = getString(record, 'instPath');
    if (!name && !moduleName && !instPath && !children?.length && !instances?.length) {
      return undefined;
    }
    return {
      name,
      moduleName,
      instPath,
      location: this.toSlangLocation(record.location),
      children,
      instances,
    };
  }

  private toHierarchyChildren(items: unknown[], parentPath: string): HierarchyChildren {
    const scopes: SlangScope[] = [];
    const instances: SlangInstance[] = [];
    for (const item of items) {
      const converted = this.toHierarchyItem(item, parentPath);
      if (converted?.scope) {
        scopes.push(converted.scope);
      } else if (converted?.instance) {
        instances.push(converted.instance);
      }
    }
    return { scopes, instances };
  }

  private toHierarchyItem(
    input: unknown,
    parentPath: string
  ): { scope?: SlangScope; instance?: SlangInstance } | undefined {
    const record = asRecord(input);
    if (!record) {
      return undefined;
    }

    const kind = getString(record, 'kind');
    const name = getString(record, 'instName') ?? getString(record, 'name');
    const instPath = getString(record, 'instPath') ?? buildHierarchyPath(parentPath, name);
    const location = this.toSlangLocation(record.instLoc ?? record.location);
    const children = Array.isArray(record.children)
      ? this.toHierarchyChildren(record.children, instPath ?? parentPath)
      : undefined;

    if (kind === 'Scope' || kind === 'ScopeArray') {
      return {
        scope: {
          name,
          instPath,
          location,
          children: children?.scopes,
          instances: children?.instances,
        },
      };
    }

    if (
      kind === 'Instance'
      || kind === 'InstanceArray'
      || kind === 'Package'
      || getString(record, 'declName')
    ) {
      return {
        instance: {
          name,
          moduleName: getString(record, 'declName') ?? getString(record, 'moduleName'),
          instPath,
          location,
        },
      };
    }

    return undefined;
  }

  private toSlangLocation(input: unknown): SlangLocation | undefined {
    const record = asRecord(input);
    if (!record) {
      return undefined;
    }

    const uri = getString(record, 'uri');
    const pathValue = getString(record, 'path');
    const range = record.range;
    if (!uri && !pathValue) {
      return undefined;
    }
    if (range !== undefined && !isRangeLike(range)) {
      return undefined;
    }
    return {
      uri,
      path: pathValue,
      range,
    };
  }

  private toServerPath(uriOrPath: string): string {
    if (this.manager.getStatus().resolvedRuntime !== 'bundled-wasm') {
      return this.fileUriToHostPath(uriOrPath) ?? uriOrPath;
    }

    const uri = this.tryParseUri(uriOrPath);
    const pathValue = uri?.scheme === 'file' ? uri.path : uriOrPath;
    const workspaceWasiPath = uri && uri.scheme !== 'file'
      ? undefined
      : this.toWorkspaceWasiPath(pathValue);
    if (workspaceWasiPath) {
      return workspaceWasiPath;
    }

    const hostPath = uri?.scheme === 'file' ? uri.fsPath : uriOrPath;
    const mapper = this.createMapper();
    const mapped = mapper.toWasiPath(hostPath);
    if (!mapped || !this.isWasiWorkspacePath(mapped)) {
      throw new Error(`Cannot pass path outside the WASI workspace to slang-server: ${hostPath}`);
    }
    return mapped;
  }

  private toHostUri(uriOrPath: string | undefined): vscode.Uri | undefined {
    if (!uriOrPath) {
      return undefined;
    }

    const uri = this.tryParseUri(uriOrPath);
    if (uri && uri.scheme !== 'file') {
      return uri;
    }
    if (this.manager.getStatus().resolvedRuntime === 'bundled-wasm') {
      const mapper = this.createMapper();
      const pathValue = uri?.scheme === 'file' ? uri.path : uriOrPath;
      if (this.isWasiPath(pathValue)) {
        return mapper.toHostUri(pathValue);
      }
      const workspaceWasiPath = this.toWorkspaceWasiPath(pathValue);
      if (workspaceWasiPath) {
        return mapper.toHostUri(workspaceWasiPath);
      }
    }

    if (uri) {
      return uri;
    }
    return vscode.Uri.file(uriOrPath);
  }

  private createMapper(): WasiFileSystemMapper {
    const workspaceFolder = this.workspaceFolderProvider();
    if (!workspaceFolder) {
      throw new Error('Cannot map slang-server path because no workspace folder is open.');
    }
    return new WasiFileSystemMapper({
      workspaceRoot: workspaceFolder.uri,
      tmpRoot: vscode.Uri.file(os.tmpdir()),
    });
  }

  private fileUriToHostPath(value: string): string | undefined {
    const uri = this.tryParseUri(value);
    return uri?.scheme === 'file' ? uri.fsPath : undefined;
  }

  private tryParseUri(value: string): vscode.Uri | undefined {
    if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
      return undefined;
    }
    try {
      return vscode.Uri.parse(value);
    } catch {
      return undefined;
    }
  }

  private isWasiPath(value: string): boolean {
    return value === '/workspace'
      || value.startsWith('/workspace/')
      || value === '/tmp'
      || value.startsWith('/tmp/')
      || value === '/home'
      || value.startsWith('/home/');
  }

  private isWasiWorkspacePath(value: string): boolean {
    return value === '/workspace' || value.startsWith('/workspace/');
  }

  private toWorkspaceWasiPath(value: string): string | undefined {
    const normalized = value.replace(/\\/g, '/');
    if (this.isWasiWorkspacePath(normalized)) {
      return normalized;
    }
    if (
      !normalized
      || this.isWasiPath(normalized)
      || looksLikeHostAbsolutePath(normalized)
      || normalized.startsWith('//')
    ) {
      return undefined;
    }

    const relativePath = normalized.replace(/^\/+/, '');
    if (
      !relativePath
      || relativePath === '..'
      || relativePath.startsWith('../')
      || relativePath.includes('/../')
    ) {
      return undefined;
    }
    return `/workspace/${relativePath}`;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
}

function getString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isRangeLike(value: unknown): value is NonNullable<SlangLocation['range']> {
  if (value instanceof vscode.Range) {
    return true;
  }
  const record = asRecord(value);
  const start = asRecord(record?.start);
  const end = asRecord(record?.end);
  return typeof start?.line === 'number'
    && typeof start.character === 'number'
    && typeof end?.line === 'number'
    && typeof end.character === 'number';
}

function lastHierarchySegment(pathValue: string | undefined): string | undefined {
  if (!pathValue) {
    return undefined;
  }
  return pathValue.split('.').at(-1);
}

function buildHierarchyPath(parentPath: string, name: string | undefined): string | undefined {
  if (!name) {
    return parentPath || undefined;
  }
  if (!parentPath) {
    return name;
  }
  return name.startsWith('[') ? `${parentPath}${name}` : `${parentPath}.${name}`;
}

function looksLikeHostAbsolutePath(value: string): boolean {
  const normalized = value.replace(/\\/g, '/');
  if (/^[A-Za-z]:[\\/]/.test(value) || /^\/[A-Za-z]:\//.test(normalized) || value.startsWith('\\\\')) {
    return true;
  }
  return [
    '/Applications',
    '/Users',
    '/Volumes',
    '/bin',
    '/etc',
    '/home',
    '/mnt',
    '/nix',
    '/opt',
    '/private',
    '/tmp',
    '/usr',
    '/var',
  ].some((root) => normalized === root || normalized.startsWith(`${root}/`));
}
