// SPDX-License-Identifier: MIT
import type { ModuleRecord, ParameterRecord, PortRecord, SymbolRecord } from '../SymbolRecords';

interface SlangNamedNode {
  name?: unknown;
  kind?: unknown;
  type?: unknown;
  direction?: unknown;
  value?: unknown;
  body?: unknown;
  members?: unknown;
}

export function enrichSymbolsWithSlangAst(
  symbols: SymbolRecord[],
  ast: unknown
): SymbolRecord[] {
  const modules = new Map<string, ModuleRecord[]>();
  const nextSymbols = symbols.slice();
  for (const symbol of nextSymbols) {
    if (symbol.kind === 'module') {
      const moduleRecord = symbol as ModuleRecord;
      const existing = modules.get(symbol.name) ?? [];
      existing.push(moduleRecord);
      modules.set(symbol.name, existing);
    }
  }

  for (const node of walkObjects(ast)) {
    const name = getString(node.name);
    if (!name) {
      continue;
    }
    const moduleRecords = modules.get(name);
    if (!moduleRecords) {
      continue;
    }
    for (const moduleRecord of moduleRecords) {
      const added = enrichModuleFromNode(moduleRecord, node);
      nextSymbols.push(...added);
    }
  }

  return nextSymbols;
}

function enrichModuleFromNode(moduleRecord: ModuleRecord, node: SlangNamedNode): SymbolRecord[] {
  const added: SymbolRecord[] = [];
  const existingPorts = new Set(moduleRecord.ports.map((port) => port.name));
  const existingParameters = new Set(moduleRecord.parameters.map((parameter) => parameter.name));
  for (const child of getMemberObjects(node)) {
    const kind = getString(child.kind)?.toLowerCase() ?? '';
    const name = getString(child.name);
    if (!name) {
      continue;
    }
    if (isPortNode(child, kind) && !existingPorts.has(name)) {
      const port = createPortRecord(moduleRecord, child, name);
      moduleRecord.ports.push(port);
      added.push(port);
      existingPorts.add(name);
    } else if (isParameterNode(kind) && !existingParameters.has(name)) {
      const parameter = createParameterRecord(moduleRecord, child, name);
      moduleRecord.parameters.push(parameter);
      added.push(parameter);
      existingParameters.add(name);
    }
  }
  return added;
}

function isPortNode(node: SlangNamedNode, kind: string): boolean {
  return kind.includes('port') || getString(node.direction) !== undefined;
}

function isParameterNode(kind: string): boolean {
  return kind.includes('parameter') || kind === 'param';
}

function createPortRecord(moduleRecord: ModuleRecord, node: SlangNamedNode, name: string): PortRecord {
  return {
    ...createChildRecord(moduleRecord, 'port', name),
    kind: 'port',
    direction: normalizeDirection(getString(node.direction)),
    dataType: getString(node.type),
  };
}

function createParameterRecord(moduleRecord: ModuleRecord, node: SlangNamedNode, name: string): ParameterRecord {
  return {
    ...createChildRecord(moduleRecord, 'parameter', name),
    kind: 'parameter',
    dataType: getString(node.type),
    defaultValue: stringifyValue(node.value),
  };
}

function createChildRecord(
  moduleRecord: ModuleRecord,
  kind: 'port' | 'parameter',
  name: string
): SymbolRecord {
  return {
    id: `${moduleRecord.compileUnitId}:${moduleRecord.uri.fsPath}:${moduleRecord.name}:${kind}:${name}:slang`,
    name,
    kind,
    uri: moduleRecord.uri,
    range: moduleRecord.range,
    selectionRange: moduleRecord.selectionRange,
    containerName: moduleRecord.name,
    compileUnitId: moduleRecord.compileUnitId,
  };
}

function normalizeDirection(direction: string | undefined): PortRecord['direction'] {
  const value = direction?.toLowerCase();
  if (value === 'input' || value === 'in' || value === 'inout' || value === 'output' || value === 'out' || value === 'ref') {
    return value === 'in' ? 'input' : value === 'out' ? 'output' : value;
  }
  if (value === 'interface') {
    return 'interface';
  }
  return undefined;
}

function stringifyValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function getMemberObjects(node: SlangNamedNode): SlangNamedNode[] {
  const members: SlangNamedNode[] = [];
  const directMembers = toObjectArray(node.members);
  members.push(...directMembers);
  const body = isObject(node.body) ? node.body : undefined;
  if (body) {
    members.push(...toObjectArray(body.members));
  }
  return members;
}

function* walkObjects(value: unknown): Generator<SlangNamedNode> {
  if (Array.isArray(value)) {
    for (const item of value) {
      yield* walkObjects(item);
    }
    return;
  }
  if (!isObject(value)) {
    return;
  }
  yield value;
  for (const child of Object.values(value)) {
    yield* walkObjects(child);
  }
}

function toObjectArray(value: unknown): SlangNamedNode[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function isObject(value: unknown): value is SlangNamedNode {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
