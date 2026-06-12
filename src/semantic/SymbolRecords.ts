// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

export type SymbolRecordKind =
  | 'module'
  | 'interface'
  | 'package'
  | 'class'
  | 'typedef'
  | 'parameter'
  | 'localparam'
  | 'port'
  | 'macro'
  | 'include';

export interface SymbolRecord {
  id: string;
  name: string;
  kind: SymbolRecordKind;
  uri: vscode.Uri;
  range: vscode.Range;
  selectionRange: vscode.Range;
  containerName?: string;
  compileUnitId: string;
}

export interface ParameterRecord extends SymbolRecord {
  kind: 'parameter' | 'localparam';
  dataType?: string;
  width?: string;
  defaultValue?: string;
}

export interface PortRecord extends SymbolRecord {
  kind: 'port';
  direction?: 'input' | 'output' | 'inout' | 'ref' | 'interface' | 'unknown';
  dataType?: string;
  width?: string;
}

export interface ModuleRecord extends SymbolRecord {
  kind: 'module';
  ports: PortRecord[];
  parameters: ParameterRecord[];
}
