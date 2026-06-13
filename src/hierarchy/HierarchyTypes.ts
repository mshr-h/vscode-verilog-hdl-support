// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { ModuleRecord } from '../semantic/SymbolRecords';

export interface NamedConnectionRecord {
  name: string;
  range: vscode.Range;
}

export interface ModuleInstanceRecord {
  id: string;
  instanceName: string;
  moduleName: string;
  parentModuleName: string;
  uri: vscode.Uri;
  range: vscode.Range;
  moduleNameRange: vscode.Range;
  selectionRange: vscode.Range;
  parameterOverrides: string[];
  portConnections: string[];
  parameterOverrideConnections: NamedConnectionRecord[];
  portConnectionRecords: NamedConnectionRecord[];
  compileUnitId: string;
}

export interface HierarchyNode {
  moduleName: string;
  module?: ModuleRecord;
  instances: HierarchyInstanceNode[];
  unresolvedInstances: HierarchyInstanceNode[];
}

export interface HierarchyInstanceNode {
  instanceName: string;
  moduleName: string;
  resolvedModule?: ModuleRecord;
  location: vscode.Location;
  children?: HierarchyNode;
}

export interface HierarchySnapshot {
  version: number;
  roots: HierarchyNode[];
  unresolvedInstances: HierarchyInstanceNode[];
  allInstances: ModuleInstanceRecord[];
}

export interface HierarchyBuildOptions {
  enabled: boolean;
  maxDepth: number;
  showUnresolved: boolean;
}
