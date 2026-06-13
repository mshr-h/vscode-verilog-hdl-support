// SPDX-License-Identifier: MIT
import * as path from 'path';
import * as vscode from 'vscode';
import { CtagsManager } from '../ctags';
import type { ProjectService } from '../project/ProjectService';
import type { FileContext } from '../project/ProjectTypes';
import type { IndexService } from '../semantic/IndexService';
import { scanInstanceContext, type InstanceConnection } from '../semantic/InstanceContextScanner';
import type {
  ModuleRecord,
  ParameterRecord,
  PortRecord,
  SymbolRecord,
} from '../semantic/SymbolRecords';

const HDL_LANGUAGES = new Set(['verilog', 'systemverilog']);
const WORD_PATTERN = /[A-Za-z_][A-Za-z0-9_$]*/;
const HOVER_SYMBOL_KINDS = new Set<SymbolRecord['kind']>([
  'package',
  'interface',
  'class',
  'typedef',
]);
const MAX_HOVER_PORTS = 20;

export class HoverService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService,
    private readonly ctagsManager: CtagsManager
  ) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    if (HDL_LANGUAGES.has(document.languageId)) {
      const projectHover = await this.provideProjectHover(document, position);
      if (projectHover) {
        return projectHover;
      }
    }
    return this.provideCtagsFallbackHover(document, position);
  }

  private async provideProjectHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    try {
      return await this.provideIncludeHover(document, position)
        ?? await this.provideMacroHover(document, position)
        ?? await this.provideInstanceHover(document, position)
        ?? await this.provideModuleHover(document, position)
        ?? await this.provideIndexedSymbolHover(document, position);
    } catch {
      return undefined;
    }
  }

  private async provideModuleHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const word = getWordAtPosition(document, position);
    if (!word) {
      return undefined;
    }
    const moduleRecord = this.indexService
      .getIndex()
      .findBestModule(word.text, this.projectService.getPreferredFileContext(document.uri));
    if (!moduleRecord) {
      return undefined;
    }
    return new vscode.Hover(await moduleRecordToMarkdown(moduleRecord), word.range);
  }

  private async provideInstanceHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const offset = document.offsetAt(position);
    const context = scanInstanceContext(document.getText(), offset);
    if (!context) {
      return undefined;
    }
    const connection = context.connections.find((candidate) => isOffsetOnConnectionName(candidate, offset));
    if (!connection) {
      return undefined;
    }

    const moduleRecord = this.indexService
      .getIndex()
      .findBestModule(context.moduleName, this.projectService.getPreferredFileContext(document.uri));
    if (!moduleRecord) {
      return undefined;
    }

    if (context.kind === 'parameters') {
      const parameter = moduleRecord.parameters.find((candidate) => candidate.name === connection.name);
      return parameter
        ? new vscode.Hover(await parameterRecordToMarkdown(parameter, moduleRecord), connectionNameRange(document, connection))
        : undefined;
    }

    const port = moduleRecord.ports.find((candidate) => candidate.name === connection.name);
    return port
      ? new vscode.Hover(await portRecordToMarkdown(port, moduleRecord), connectionNameRange(document, connection))
      : undefined;
  }

  private async provideMacroHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const macro = getMacroAtPosition(document, position);
    if (!macro) {
      return undefined;
    }
    const fileContext = this.projectService.getPreferredFileContext(document.uri);
    const contextDefine = fileContext?.defines[macro.name];
    if (contextDefine) {
      const markdown = new vscode.MarkdownString();
      markdown.appendCodeblock(`macro ${contextDefine.name}`, 'systemverilog');
      markdown.appendMarkdown(`\n\nvalue: ${escapeMarkdown(String(contextDefine.value))}`);
      markdown.appendMarkdown(`\n\nsource: ${escapeMarkdown(contextDefine.source)}`);
      if (contextDefine.location) {
        markdown.appendMarkdown(`\n\ndefined at: ${escapeMarkdown(formatLocation(contextDefine.location))}`);
      }
      return new vscode.Hover(markdown, macro.range);
    }

    const sourceMacro = this.indexService.getIndex().findMacros(macro.name, fileContext).at(0);
    if (sourceMacro) {
      return new vscode.Hover(await macroRecordToMarkdown(sourceMacro), macro.range);
    }
    return undefined;
  }

  private async provideIncludeHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const include = getIncludeAtPosition(document, position);
    if (!include) {
      return undefined;
    }
    const context = this.projectService.getPreferredFileContext(document.uri) ?? createLocalFileContext(document.uri);
    const resolved = this.indexService.getIndex().resolveInclude(include.includeText, context);
    const markdown = new vscode.MarkdownString();
    markdown.appendCodeblock(`include ${include.pathText}`, 'systemverilog');
    if (resolved) {
      markdown.appendMarkdown(`\n\nresolved to: ${escapeMarkdown(resolved.fsPath)}`);
    } else {
      markdown.appendMarkdown('\n\nunresolved');
      markdown.appendMarkdown('\n\nsearched include dirs:');
      for (const dir of getIncludeSearchDirs(document.uri, context)) {
        markdown.appendMarkdown(`\n- ${escapeMarkdown(dir)}`);
      }
    }
    return new vscode.Hover(markdown, include.range);
  }

  private async provideIndexedSymbolHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const word = getWordAtPosition(document, position);
    if (!word) {
      return undefined;
    }
    const preferredCompileUnitId = this.projectService.getPreferredFileContext(document.uri)?.compileUnitId;
    const index = this.indexService.getIndex();
    const symbol = index.findSymbolsByName(word.text, {
      compileUnitId: preferredCompileUnitId,
      kinds: [...HOVER_SYMBOL_KINDS],
    }).at(0)
      ?? index.findSymbolsByName(word.text, { kinds: [...HOVER_SYMBOL_KINDS] }).at(0);
    if (!symbol) {
      return undefined;
    }
    return new vscode.Hover(await symbolRecordToMarkdown(symbol), word.range);
  }

  private async provideCtagsFallbackHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const matches: vscode.DefinitionLink[] = await this.ctagsManager.findSymbol(document, position);
    for (const match of matches) {
      let targetDocument = document;
      if (match.targetUri.toString() !== document.uri.toString()) {
        targetDocument = await vscode.workspace.openTextDocument(match.targetUri);
      }
      const code = targetDocument.getText(match.targetRange).trim();
      const hoverText = new vscode.MarkdownString();
      hoverText.appendCodeblock(code, document.languageId);
      return new vscode.Hover(hoverText);
    }
    return undefined;
  }
}

async function moduleRecordToMarkdown(moduleRecord: ModuleRecord): Promise<vscode.MarkdownString> {
  const markdown = new vscode.MarkdownString();
  markdown.appendCodeblock(`module ${moduleRecord.name}`, 'systemverilog');
  markdown.appendMarkdown(`\n\nDefined in: ${escapeMarkdown(formatSymbolLocation(moduleRecord))}`);
  appendDeclaration(markdown, await readDeclarationLine(moduleRecord));
  if (moduleRecord.parameters.length > 0) {
    markdown.appendMarkdown('\n\nParameters:');
    for (const parameter of moduleRecord.parameters) {
      markdown.appendMarkdown(`\n- ${escapeMarkdown(formatParameterSummary(parameter))}`);
    }
  }
  if (moduleRecord.ports.length > 0) {
    markdown.appendMarkdown('\n\nPorts:');
    const visiblePorts = moduleRecord.ports.slice(0, MAX_HOVER_PORTS);
    markdown.appendCodeblock(visiblePorts.map(formatPortSummary).join('\n'), 'systemverilog');
    const hiddenPorts = moduleRecord.ports.length - visiblePorts.length;
    if (hiddenPorts > 0) {
      markdown.appendMarkdown(`\n... and ${hiddenPorts} more ports`);
    }
  }
  return markdown;
}

async function portRecordToMarkdown(
  port: PortRecord,
  moduleRecord: ModuleRecord
): Promise<vscode.MarkdownString> {
  const markdown = new vscode.MarkdownString();
  markdown.appendCodeblock(`port ${port.name}`, 'systemverilog');
  markdown.appendMarkdown(`\n\nDirection: ${escapeMarkdown(port.direction ?? 'unknown')}`);
  markdown.appendMarkdown(`\n\nType: ${escapeMarkdown(formatType(port))}`);
  markdown.appendMarkdown(`\n\nModule: ${escapeMarkdown(moduleRecord.name)}`);
  markdown.appendMarkdown(`\n\nDefined in: ${escapeMarkdown(formatSymbolLocation(port))}`);
  appendDeclaration(markdown, await readDeclarationLine(port));
  return markdown;
}

async function parameterRecordToMarkdown(
  parameter: ParameterRecord,
  moduleRecord: ModuleRecord
): Promise<vscode.MarkdownString> {
  const markdown = new vscode.MarkdownString();
  markdown.appendCodeblock(`parameter ${parameter.name}`, 'systemverilog');
  if (parameter.defaultValue) {
    markdown.appendMarkdown(`\n\nDefault: ${escapeMarkdown(parameter.defaultValue)}`);
  }
  if (parameter.dataType || parameter.width) {
    markdown.appendMarkdown(`\n\nType: ${escapeMarkdown(formatType(parameter))}`);
  }
  markdown.appendMarkdown(`\n\nModule: ${escapeMarkdown(moduleRecord.name)}`);
  markdown.appendMarkdown(`\n\nDefined in: ${escapeMarkdown(formatSymbolLocation(parameter))}`);
  appendDeclaration(markdown, await readDeclarationLine(parameter));
  return markdown;
}

async function macroRecordToMarkdown(symbol: SymbolRecord): Promise<vscode.MarkdownString> {
  const markdown = new vscode.MarkdownString();
  markdown.appendCodeblock(`macro ${symbol.name}`, 'systemverilog');
  markdown.appendMarkdown(`\n\ndefined at: ${escapeMarkdown(formatSymbolLocation(symbol))}`);
  appendDeclaration(markdown, await readDeclarationLine(symbol));
  return markdown;
}

async function symbolRecordToMarkdown(symbol: SymbolRecord): Promise<vscode.MarkdownString> {
  const markdown = new vscode.MarkdownString();
  markdown.appendCodeblock(`${symbol.kind} ${symbol.name}`, 'systemverilog');
  markdown.appendMarkdown(`\n\nDefined in: ${escapeMarkdown(formatSymbolLocation(symbol))}`);
  appendDeclaration(markdown, await readDeclarationLine(symbol));
  return markdown;
}

function formatParameterSummary(parameter: ParameterRecord): string {
  const type = formatType(parameter);
  const defaultValue = parameter.defaultValue ? ` = ${parameter.defaultValue}` : '';
  return `${type === 'unknown' ? '' : `${type} `}${parameter.name}${defaultValue}`.trim();
}

function formatPortSummary(port: PortRecord): string {
  return [port.direction, port.dataType, port.width, port.name].filter(Boolean).join(' ');
}

function formatType(record: PortRecord | ParameterRecord): string {
  return [record.dataType, record.width].filter(Boolean).join(' ') || 'unknown';
}

function appendDeclaration(markdown: vscode.MarkdownString, declaration: string | undefined): void {
  if (declaration) {
    markdown.appendMarkdown('\n\nDeclaration:');
    markdown.appendCodeblock(declaration, 'systemverilog');
  }
}

async function readDeclarationLine(symbol: SymbolRecord): Promise<string | undefined> {
  try {
    const document = await vscode.workspace.openTextDocument(symbol.uri);
    return document.lineAt(symbol.selectionRange.start.line).text.trim();
  } catch {
    return undefined;
  }
}

function getWordAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): { text: string; range: vscode.Range } | undefined {
  const range = document.getWordRangeAtPosition(position, WORD_PATTERN);
  if (!range || range.isEmpty) {
    return undefined;
  }
  return { text: document.getText(range), range };
}

function getMacroAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): { name: string; range: vscode.Range } | undefined {
  const line = document.lineAt(position.line).text;
  for (const match of line.matchAll(/`([A-Za-z_][A-Za-z0-9_$]*)/g)) {
    const name = match[1] ?? '';
    const start = (match.index ?? 0) + 1;
    const end = start + name.length;
    if (position.character >= start && position.character <= end) {
      return {
        name,
        range: new vscode.Range(position.line, start, position.line, end),
      };
    }
  }
  return undefined;
}

interface IncludeAtPosition {
  includeText: string;
  pathText: string;
  range: vscode.Range;
}

function getIncludeAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): IncludeAtPosition | undefined {
  const line = document.lineAt(position.line).text;
  const includePattern = /`include\s*(["<])([^">]+)[">]/g;
  for (const match of line.matchAll(includePattern)) {
    const fullMatch = match[0];
    const quote = match[1] ?? '"';
    const pathText = match[2] ?? '';
    const start = match.index ?? 0;
    const pathStart = start + fullMatch.indexOf(quote) + 1;
    const pathEnd = pathStart + pathText.length;
    if (position.character >= pathStart && position.character <= pathEnd) {
      return {
        includeText: `${quote}${pathText}${quote === '<' ? '>' : quote}`,
        pathText,
        range: new vscode.Range(position.line, pathStart, position.line, pathEnd),
      };
    }
  }
  return undefined;
}

function isOffsetOnConnectionName(connection: InstanceConnection, offset: number): boolean {
  return offset >= connection.startOffset + 1 && offset <= connection.startOffset + 1 + connection.name.length;
}

function connectionNameRange(document: vscode.TextDocument, connection: InstanceConnection): vscode.Range {
  return new vscode.Range(
    document.positionAt(connection.startOffset + 1),
    document.positionAt(connection.startOffset + 1 + connection.name.length)
  );
}

function createLocalFileContext(uri: vscode.Uri): FileContext {
  return {
    file: uri,
    compileUnitId: '',
    includeDirs: [],
    defines: {},
  };
}

function getIncludeSearchDirs(uri: vscode.Uri, context: FileContext): string[] {
  return [path.dirname(uri.fsPath), ...context.includeDirs.map((dir) => dir.fsPath)];
}

function formatSymbolLocation(symbol: SymbolRecord): string {
  return `${symbol.uri.fsPath}:${symbol.selectionRange.start.line + 1}`;
}

function formatLocation(location: vscode.Location): string {
  return `${location.uri.fsPath}:${location.range.start.line + 1}`;
}

function escapeMarkdown(input: string): string {
  return input.replace(/[\\`*_{}[\]()#+\-.!|>]/g, '\\$&');
}
