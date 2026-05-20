// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { type Logger } from '@logtape/logtape';
import { END_OF_LINE } from './constants';
import { parseCtagsTagLine, Symbol } from './ctags';
import { runTool, ToolRunError } from './tools/ToolRunner';
import { getWorkspaceFolderForUri } from './utils/workspace';

export interface IndexedSymbol {
  readonly uri: vscode.Uri;
  readonly symbol: Symbol;
}

interface WorkspaceIndexState {
  readonly folder: vscode.WorkspaceFolder;
  symbolsByName: Map<string, IndexedSymbol[]>;
  filesByUri: Map<string, IndexedSymbol[]>;
  isDirty: boolean;
  isBuilding: boolean;
  skipped: boolean;
  buildPromise?: Promise<void>;
}

interface WorkspaceCtagsConfig {
  enabled: boolean;
  ctagsPath: string;
  include: string;
  exclude: string;
  maxFiles: number;
}

const WORKSPACE_CTAG_ARGS = [
  '-f',
  '-',
  '--fields=+K',
  '--sort=no',
  '--excmd=n',
  '--fields-SystemVerilog=+{parameter}',
];

const TOP_LEVEL_SYMBOL_TYPES = new Set([
  'module',
  'interface',
  'package',
  'program',
  'class',
  'typedef',
  'struct',
  'enum',
]);

const QUALIFIED_SYMBOL_TYPES = new Set([
  ...TOP_LEVEL_SYMBOL_TYPES,
  'function',
  'task',
  'parameter',
  'constant',
]);

const INDEX_CONCURRENCY = 4;

export function isWorkspaceLookupSymbol(symbol: Symbol, qualifier?: string): boolean {
  if (qualifier) {
    return symbol.parentScope === qualifier && QUALIFIED_SYMBOL_TYPES.has(symbol.type);
  }
  return symbol.parentScope === '' && TOP_LEVEL_SYMBOL_TYPES.has(symbol.type);
}

export class WorkspaceCtagsIndex implements vscode.Disposable {
  private readonly logger: Logger;
  private readonly statesByFolderUri = new Map<string, WorkspaceIndexState>();
  private config: WorkspaceCtagsConfig;
  private watcher?: vscode.FileSystemWatcher;
  private disposed = false;

  constructor(logger: Logger) {
    this.logger = logger;
    this.config = this.readConfig();
  }

  configure(): void {
    if (this.disposed) {
      return;
    }
    this.config = this.readConfig();
    this.invalidateAll();
    this.watcher?.dispose();
    this.watcher = undefined;
    if (!this.config.enabled) {
      return;
    }
    this.watcher = vscode.workspace.createFileSystemWatcher(this.config.include);
    this.watcher.onDidCreate((uri) => this.invalidateUri(uri));
    this.watcher.onDidChange((uri) => this.invalidateUri(uri));
    this.watcher.onDidDelete((uri) => this.removeUri(uri));
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.watcher?.dispose();
    this.watcher = undefined;
    this.statesByFolderUri.clear();
  }

  invalidateAll(): void {
    for (const state of this.statesByFolderUri.values()) {
      state.isDirty = true;
      state.skipped = false;
    }
  }

  invalidateFolder(folder: vscode.WorkspaceFolder): void {
    const state = this.statesByFolderUri.get(folder.uri.toString());
    if (state) {
      state.isDirty = true;
      state.skipped = false;
    }
  }

  invalidateUri(uri: vscode.Uri): void {
    const folder = getWorkspaceFolderForUri(uri);
    if (!folder) {
      return;
    }
    this.invalidateFolder(folder);
  }

  async rebuild(
    folder?: vscode.WorkspaceFolder,
    token?: vscode.CancellationToken
  ): Promise<void> {
    if (this.disposed || !this.config.enabled) {
      return;
    }
    if (folder) {
      await this.rebuildFolder(folder, token);
      return;
    }
    const folders = vscode.workspace.workspaceFolders ?? [];
    await Promise.all(folders.map((workspaceFolder) => this.rebuildFolder(workspaceFolder, token)));
  }

  async rebuildFolder(
    folder: vscode.WorkspaceFolder,
    token?: vscode.CancellationToken
  ): Promise<void> {
    if (this.disposed || !this.config.enabled) {
      return;
    }
    const state = this.getState(folder);
    if (state.buildPromise) {
      return state.buildPromise;
    }
    state.buildPromise = this.buildFolder(state, token).finally(() => {
      state.isBuilding = false;
      state.buildPromise = undefined;
    });
    return state.buildPromise;
  }

  async ensureReadyForUri(
    uri: vscode.Uri,
    token?: vscode.CancellationToken
  ): Promise<void> {
    if (this.disposed || !this.config.enabled) {
      return;
    }
    const folder = getWorkspaceFolderForUri(uri);
    if (!folder) {
      return;
    }
    const state = this.getState(folder);
    if (!state.isDirty && !state.skipped) {
      return;
    }
    await this.rebuildFolder(folder, token);
  }

  async findDefinitions(
    folder: vscode.WorkspaceFolder,
    targetText: string,
    options?: {
      currentDocument?: vscode.TextDocument;
      qualifier?: string;
      token?: vscode.CancellationToken;
    }
  ): Promise<vscode.DefinitionLink[]> {
    if (this.disposed || !this.config.enabled) {
      return [];
    }
    await this.ensureReadyForUri(options?.currentDocument?.uri ?? folder.uri, options?.token);
    const state = this.statesByFolderUri.get(folder.uri.toString());
    if (!state || state.skipped) {
      return [];
    }
    const candidates = state.symbolsByName.get(targetText) ?? [];
    return candidates
      .filter((candidate) => isWorkspaceLookupSymbol(candidate.symbol, options?.qualifier))
      .map((candidate) => this.toDefinitionLink(candidate));
  }

  async findTopLevelModules(
    folder: vscode.WorkspaceFolder,
    token?: vscode.CancellationToken
  ): Promise<IndexedSymbol[]> {
    if (this.disposed || !this.config.enabled) {
      return [];
    }
    await this.ensureReadyForUri(folder.uri, token);
    const state = this.statesByFolderUri.get(folder.uri.toString());
    if (!state || state.skipped) {
      return [];
    }
    const modules: IndexedSymbol[] = [];
    for (const symbols of state.symbolsByName.values()) {
      modules.push(
        ...symbols.filter(
          (candidate) =>
            candidate.symbol.type === 'module' && candidate.symbol.parentScope === ''
        )
      );
    }
    return modules.sort((left, right) => {
      const byName = left.symbol.name.localeCompare(right.symbol.name);
      if (byName !== 0) {
        return byName;
      }
      return left.uri.fsPath.localeCompare(right.uri.fsPath);
    });
  }

  async findSymbolsInFile(
    uri: vscode.Uri,
    token?: vscode.CancellationToken
  ): Promise<IndexedSymbol[]> {
    if (this.disposed || !this.config.enabled) {
      return [];
    }
    await this.ensureReadyForUri(uri, token);
    const folder = getWorkspaceFolderForUri(uri);
    if (!folder) {
      return [];
    }
    const state = this.statesByFolderUri.get(folder.uri.toString());
    if (!state || state.skipped) {
      return [];
    }
    return state.filesByUri.get(uri.toString()) ?? [];
  }

  async findModuleMembers(
    moduleSymbol: IndexedSymbol,
    token?: vscode.CancellationToken
  ): Promise<{ ports: Symbol[]; parameters: Symbol[] }> {
    const symbols = await this.findSymbolsInFile(moduleSymbol.uri, token);
    const scope =
      moduleSymbol.symbol.parentScope !== ''
        ? `${moduleSymbol.symbol.parentScope}.${moduleSymbol.symbol.name}`
        : moduleSymbol.symbol.name;
    return {
      ports: symbols
        .filter(
          (candidate) =>
            candidate.symbol.type === 'port' &&
            candidate.symbol.parentType === 'module' &&
            candidate.symbol.parentScope === scope
        )
        .map((candidate) => candidate.symbol),
      parameters: symbols
        .filter(
          (candidate) =>
            candidate.symbol.type === 'parameter' &&
            candidate.symbol.parentType === 'module' &&
            candidate.symbol.parentScope === scope
        )
        .map((candidate) => candidate.symbol),
    };
  }

  private readConfig(): WorkspaceCtagsConfig {
    const ctagsConfig = vscode.workspace.getConfiguration('verilog.ctags');
    const workspaceConfig = vscode.workspace.getConfiguration('verilog.ctags.workspace');
    return {
      enabled:
        ctagsConfig.get<boolean>('enabled', false) &&
        workspaceConfig.get<boolean>('enabled', true),
      ctagsPath: ctagsConfig.get<string>('path', 'ctags'),
      include: workspaceConfig.get<string>('include', '**/*.{v,vh,vl,sv,svh,SV}'),
      exclude: workspaceConfig.get<string>(
        'exclude',
        '**/{.git,node_modules,out,dist,build,coverage,.vscode-test}/**'
      ),
      maxFiles: workspaceConfig.get<number>('maxFiles', 2000),
    };
  }

  private getState(folder: vscode.WorkspaceFolder): WorkspaceIndexState {
    const key = folder.uri.toString();
    let state = this.statesByFolderUri.get(key);
    if (!state) {
      state = {
        folder,
        symbolsByName: new Map(),
        filesByUri: new Map(),
        isDirty: true,
        isBuilding: false,
        skipped: false,
      };
      this.statesByFolderUri.set(key, state);
    }
    return state;
  }

  private async buildFolder(
    state: WorkspaceIndexState,
    token?: vscode.CancellationToken
  ): Promise<void> {
    state.isBuilding = true;
    state.skipped = false;
    this.logger.info`building workspace ctags index for ${state.folder.uri.fsPath}`;
    try {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(state.folder, this.config.include),
        new vscode.RelativePattern(state.folder, this.config.exclude),
        this.config.maxFiles + 1,
        token
      );
      if (files.length > this.config.maxFiles) {
        state.symbolsByName = new Map();
        state.filesByUri = new Map();
        state.isDirty = false;
        state.skipped = true;
        this.logger.warn`workspace ctags index skipped for ${state.folder.uri.fsPath}: matched more than ${this.config.maxFiles} files`;
        return;
      }

      const symbolsByName = new Map<string, IndexedSymbol[]>();
      const filesByUri = new Map<string, IndexedSymbol[]>();
      await this.indexFiles(files, symbolsByName, filesByUri, token);
      state.symbolsByName = symbolsByName;
      state.filesByUri = filesByUri;
      state.isDirty = false;
      this.logger.info`workspace ctags index built for ${state.folder.uri.fsPath} with ${files.length} files`;
    } catch (err) {
      state.isDirty = true;
      this.logCtagsError(state.folder.uri.fsPath, err);
    }
  }

  private async indexFiles(
    files: readonly vscode.Uri[],
    symbolsByName: Map<string, IndexedSymbol[]>,
    filesByUri: Map<string, IndexedSymbol[]>,
    token?: vscode.CancellationToken
  ): Promise<void> {
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(INDEX_CONCURRENCY, files.length) }, async () => {
      while (!this.disposed && !token?.isCancellationRequested) {
        const fileIndex = nextIndex++;
        const uri = files[fileIndex];
        if (!uri) {
          return;
        }
        const symbols = await this.indexFile(uri, token);
        if (symbols.length === 0) {
          continue;
        }
        filesByUri.set(uri.toString(), symbols);
        for (const indexedSymbol of symbols) {
          const existing = symbolsByName.get(indexedSymbol.symbol.name) ?? [];
          existing.push(indexedSymbol);
          symbolsByName.set(indexedSymbol.symbol.name, existing);
        }
      }
    });
    await Promise.all(workers);
  }

  private async indexFile(
    uri: vscode.Uri,
    token?: vscode.CancellationToken
  ): Promise<IndexedSymbol[]> {
    const indexedSymbols: IndexedSymbol[] = [];
    try {
      const result = await runTool({
        command: this.config.ctagsPath,
        args: [...WORKSPACE_CTAG_ARGS, uri.fsPath],
        collectStderr: true,
        onStdoutLine: (line) => {
          if (line === '') {
            return;
          }
          const symbol = parseCtagsTagLine(line, this.logger);
          if (symbol) {
            indexedSymbols.push({ uri, symbol });
          }
        },
        cancellationToken: token,
      });
      if (result.exitCode !== 0) {
        if (result.stderr !== '') {
          this.logger.warn`ctags stderr: ${result.stderr}`;
        }
        this.logger.warn`ctags exited with code ${result.exitCode} for ${uri.fsPath}`;
        return [];
      }
    } catch (err) {
      this.logCtagsError(uri.fsPath, err);
      return [];
    }
    return indexedSymbols;
  }

  private removeUri(uri: vscode.Uri): void {
    const folder = getWorkspaceFolderForUri(uri);
    if (!folder) {
      return;
    }
    const state = this.statesByFolderUri.get(folder.uri.toString());
    if (!state) {
      return;
    }
    const uriKey = uri.toString();
    const removedSymbols = state.filesByUri.get(uriKey) ?? [];
    state.filesByUri.delete(uriKey);
    for (const removedSymbol of removedSymbols) {
      const existing = state.symbolsByName.get(removedSymbol.symbol.name) ?? [];
      const filtered = existing.filter((candidate) => candidate.uri.toString() !== uriKey);
      if (filtered.length === 0) {
        state.symbolsByName.delete(removedSymbol.symbol.name);
      } else {
        state.symbolsByName.set(removedSymbol.symbol.name, filtered);
      }
    }
  }

  private toDefinitionLink(indexedSymbol: IndexedSymbol): vscode.DefinitionLink {
    const symbol = indexedSymbol.symbol;
    const lineRange = new vscode.Range(
      symbol.startPosition,
      new vscode.Position(symbol.startPosition.line, END_OF_LINE)
    );
    return {
      targetUri: indexedSymbol.uri,
      targetRange: lineRange,
      targetSelectionRange: lineRange,
    };
  }

  private logCtagsError(filepath: string, err: unknown): void {
    if (err instanceof ToolRunError) {
      this.logger.warn`ctags failed for ${filepath}: ${err.message}`;
      return;
    }
    this.logger.error`ctags exception for ${filepath}: ${err}`;
  }
}
