// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ProjectService } from '../project/ProjectService';
import type { IndexService } from '../semantic/IndexService';
import { scanInstanceContext, type InstanceConnection, type InstanceContext } from '../semantic/InstanceContextScanner';
import type { ModuleRecord, ParameterRecord, PortRecord } from '../semantic/SymbolRecords';

const FILL_MISSING_PORTS_TITLE = 'Verilog: Fill Missing Ports';
const FILL_MISSING_PARAMETERS_TITLE = 'Verilog: Fill Missing Parameters';

export interface ConnectionRenderOptions {
  newline: string;
  indent: string;
  closingIndent: string;
  align: boolean;
  trailingComma: boolean;
}

interface RenderConnection {
  name: string;
  expressionText: string;
}

interface FillActionBuildResult {
  title: string;
  edit: vscode.WorkspaceEdit;
}

export class ModuleInstanceCodeActionService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly indexService: IndexService
  ) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] {
    const text = document.getText();
    const context = scanInstanceContext(text, document.offsetAt(range.start));
    if (!context || context.listCloseOffset === undefined) {
      return [];
    }

    const moduleRecord = this.indexService
      .getIndex()
      .findBestModule(context.moduleName, this.projectService.getPreferredFileContext(document.uri));
    if (!moduleRecord) {
      return [];
    }

    const actions: vscode.CodeAction[] = [];
    const portAction = this.buildFillMissingPortsAction(document, text, context, moduleRecord);
    if (portAction) {
      actions.push(createCodeAction(portAction));
    }
    const parameterAction = this.buildFillMissingParametersAction(document, text, context, moduleRecord);
    if (parameterAction) {
      actions.push(createCodeAction(parameterAction));
    }
    return actions;
  }

  private buildFillMissingPortsAction(
    document: vscode.TextDocument,
    text: string,
    context: InstanceContext,
    moduleRecord: ModuleRecord
  ): FillActionBuildResult | undefined {
    if (context.kind !== 'ports' || !isSettingEnabled('verilog.codeActions.fillMissingPorts.enabled')) {
      return undefined;
    }
    const missingPorts = moduleRecord.ports.filter((port) => !context.connectedNames.has(port.name));
    if (missingPorts.length === 0) {
      return undefined;
    }
    return {
      title: FILL_MISSING_PORTS_TITLE,
      edit: buildFillMissingEdit(
        document,
        text,
        context,
        moduleRecord.ports,
        missingPorts.map((port) => port.name)
      ),
    };
  }

  private buildFillMissingParametersAction(
    document: vscode.TextDocument,
    text: string,
    context: InstanceContext,
    moduleRecord: ModuleRecord
  ): FillActionBuildResult | undefined {
    if (context.kind !== 'parameters' || !isSettingEnabled('verilog.codeActions.fillMissingParameters.enabled')) {
      return undefined;
    }
    const missingParameters = moduleRecord.parameters.filter((parameter) => !context.connectedNames.has(parameter.name));
    if (missingParameters.length === 0) {
      return undefined;
    }
    return {
      title: FILL_MISSING_PARAMETERS_TITLE,
      edit: buildFillMissingEdit(
        document,
        text,
        context,
        moduleRecord.parameters,
        missingParameters.map((parameter) => parameter.name)
      ),
    };
  }
}

export function buildFillMissingEdit(
  document: vscode.TextDocument,
  text: string,
  context: InstanceContext,
  declarations: Array<PortRecord | ParameterRecord>,
  missingNames: string[]
): vscode.WorkspaceEdit {
  const closeOffset = context.listCloseOffset ?? context.listOpenOffset + 1;
  const renderOptions = getConnectionRenderOptions(document, context);
  const rendered = renderConnectionBody(
    buildRenderConnections(text, context.connections, declarations, missingNames),
    renderOptions
  );
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(context.listOpenOffset + 1), document.positionAt(closeOffset)),
    rendered
  );
  return edit;
}

export function renderConnectionBody(
  connections: RenderConnection[],
  options: ConnectionRenderOptions
): string {
  if (connections.length === 0) {
    return '';
  }
  const maxNameLength = options.align
    ? Math.max(...connections.map((connection) => connection.name.length))
    : 0;
  const lines = connections.map((connection, index) => {
    const padding = options.align ? ' '.repeat(maxNameLength - connection.name.length) : '';
    const comma = index < connections.length - 1 || options.trailingComma ? ',' : '';
    return `${options.indent}.${connection.name}${padding}(${connection.expressionText})${comma}`;
  });
  return `${options.newline}${lines.join(options.newline)}${options.newline}${options.closingIndent}`;
}

function buildRenderConnections(
  text: string,
  existingConnections: InstanceConnection[],
  declarations: Array<PortRecord | ParameterRecord>,
  missingNames: string[]
): RenderConnection[] {
  const existingNames = new Set(existingConnections.map((connection) => connection.name));
  const missingNameSet = new Set(missingNames);
  return existingConnections
    .map((connection) => ({
      name: connection.name,
      expressionText: text.slice(connection.expressionStartOffset, connection.expressionEndOffset).trim(),
    }))
    .concat(
      declarations
        .filter((declaration) => missingNameSet.has(declaration.name) && !existingNames.has(declaration.name))
        .map((declaration) => ({
          name: declaration.name,
          expressionText: declaration.name,
        }))
    );
}

function getConnectionRenderOptions(
  document: vscode.TextDocument,
  context: InstanceContext
): ConnectionRenderOptions {
  return {
    newline: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n',
    indent: getConnectionIndent(document, context),
    closingIndent: getLineIndent(document, document.positionAt(context.listOpenOffset).line),
    align: isSettingEnabled('verilog.codeActions.alignment.enabled'),
    trailingComma: context.connections.length > 0
      ? context.connections[context.connections.length - 1]?.hasTrailingComma === true
      : false,
  };
}

function getConnectionIndent(
  document: vscode.TextDocument,
  context: InstanceContext
): string {
  const firstConnection = context.connections[0];
  if (firstConnection) {
    return getLineIndent(document, document.positionAt(firstConnection.startOffset).line);
  }
  return getLineIndent(document, document.positionAt(context.listOpenOffset).line) + getIndentUnit(document);
}

function getIndentUnit(document: vscode.TextDocument): string {
  const visibleEditor = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === document.uri.toString());
  const insertSpaces = visibleEditor?.options.insertSpaces ?? vscode.workspace.getConfiguration('editor', document.uri).get<boolean>('insertSpaces', true);
  if (!insertSpaces) {
    return '\t';
  }
  const tabSize = visibleEditor?.options.tabSize ?? vscode.workspace.getConfiguration('editor', document.uri).get<number>('tabSize', 2);
  return ' '.repeat(typeof tabSize === 'number' ? tabSize : Number(tabSize) || 2);
}

function getLineIndent(document: vscode.TextDocument, line: number): string {
  return document.lineAt(line).text.match(/^\s*/)?.[0] ?? '';
}

function createCodeAction(result: FillActionBuildResult): vscode.CodeAction {
  const action = new vscode.CodeAction(result.title, vscode.CodeActionKind.QuickFix);
  action.edit = result.edit;
  return action;
}

function isSettingEnabled(setting: string): boolean {
  return vscode.workspace.getConfiguration().get<boolean>(setting, true);
}
