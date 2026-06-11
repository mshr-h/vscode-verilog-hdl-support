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
}

export interface PortRecord extends SymbolRecord {
  kind: 'port';
}

export interface ModuleRecord extends SymbolRecord {
  kind: 'module';
  ports: PortRecord[];
  parameters: ParameterRecord[];
}
