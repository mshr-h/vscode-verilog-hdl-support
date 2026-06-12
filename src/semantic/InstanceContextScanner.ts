// SPDX-License-Identifier: MIT

export interface InstanceContext {
  moduleName: string;
  instanceName?: string;
  kind: 'ports' | 'parameters';
  connectedNames: Set<string>;
  listOpenOffset: number;
  listCloseOffset?: number;
  connections: InstanceConnection[];
}

export interface InstanceConnection {
  name: string;
  expressionText: string;
  hasTrailingComma: boolean;
  startOffset: number;
  endOffset: number;
  expressionStartOffset: number;
  expressionEndOffset: number;
}

interface CandidateContext {
  openParen: number;
  kind: 'ports' | 'parameters';
  moduleName: string;
  instanceName?: string;
}

const IDENTIFIER = '[A-Za-z_][A-Za-z0-9_$]*';

export function scanInstanceContext(text: string, offset: number): InstanceContext | undefined {
  try {
    const safeText = maskCommentsAndStrings(text);
    const boundedOffset = Math.max(0, Math.min(offset, safeText.length));
    const stack = getOpenParenStack(safeText, boundedOffset);
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const candidate = parseCandidate(safeText, stack[i] ?? 0);
      if (!candidate) {
        continue;
      }
      return {
        moduleName: candidate.moduleName,
        instanceName: candidate.instanceName,
        kind: candidate.kind,
        listOpenOffset: candidate.openParen,
        listCloseOffset: findMatchingCloseParen(safeText, candidate.openParen),
        ...collectConnections(safeText, candidate.openParen, boundedOffset),
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function parseCandidate(text: string, openParen: number): CandidateContext | undefined {
  const before = text.slice(0, openParen);
  const previous = before.trimEnd();
  if (previous.endsWith('#')) {
    const moduleMatch = new RegExp(`(${IDENTIFIER})\\s*#$`).exec(previous);
    const moduleName = moduleMatch?.[1];
    return moduleName ? { openParen, kind: 'parameters', moduleName } : undefined;
  }

  const instanceMatch = new RegExp(`(${IDENTIFIER})\\s*$`).exec(previous);
  const instanceName = instanceMatch?.[1];
  if (!instanceName) {
    return undefined;
  }

  const beforeInstance = previous.slice(0, instanceMatch.index).trimEnd();
  const parameterOverride = findTrailingParameterOverride(beforeInstance);
  if (parameterOverride) {
    return {
      openParen,
      kind: 'ports',
      moduleName: parameterOverride.moduleName,
      instanceName,
    };
  }

  const moduleMatch = new RegExp(`(${IDENTIFIER})\\s*$`).exec(beforeInstance);
  const moduleName = moduleMatch?.[1];
  if (!moduleName) {
    return undefined;
  }

  return { openParen, kind: 'ports', moduleName, instanceName };
}

function findTrailingParameterOverride(text: string): { moduleName: string } | undefined {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith(')')) {
    return undefined;
  }

  let depth = 0;
  for (let i = trimmed.length - 1; i >= 0; i -= 1) {
    const ch = trimmed[i];
    if (ch === ')') {
      depth += 1;
    } else if (ch === '(') {
      depth -= 1;
      if (depth === 0) {
        const beforeOpen = trimmed.slice(0, i).trimEnd();
        if (!beforeOpen.endsWith('#')) {
          return undefined;
        }
        const moduleMatch = new RegExp(`(${IDENTIFIER})\\s*#$`).exec(beforeOpen);
        const moduleName = moduleMatch?.[1];
        return moduleName ? { moduleName } : undefined;
      }
    }
  }
  return undefined;
}

function collectConnections(
  text: string,
  openParen: number,
  cursorOffset: number
): Pick<InstanceContext, 'connectedNames' | 'connections'> {
  const connectedNames = new Set<string>();
  const connections: InstanceConnection[] = [];
  const closeParen = findMatchingCloseParen(text, openParen) ?? text.length;
  let index = openParen + 1;
  while (index < closeParen) {
    index = skipWhitespaceAndCommas(text, index, closeParen);
    if (index >= closeParen) {
      break;
    }
    if (text[index] !== '.') {
      throw new Error('positional or mixed instance connections are not supported');
    }
    const connection = readNamedConnection(text, index, closeParen);
    if (!connection) {
      if (index <= cursorOffset) {
        break;
      }
      throw new Error('malformed named instance connection');
    }
    connectedNames.add(connection.name);
    connections.push(connection);
    index = connection.hasTrailingComma ? connection.endOffset + 1 : connection.endOffset;
  }
  return { connectedNames, connections };
}

function readNamedConnection(
  text: string,
  dotOffset: number,
  closeParen: number
): InstanceConnection | undefined {
  const match = /\.([A-Za-z_][A-Za-z0-9_$]*)\s*\(/.exec(text.slice(dotOffset, closeParen));
  if (!match || match.index !== 0) {
    return undefined;
  }
  const name = match[1] ?? '';
  const expressionOpenOffset = dotOffset + match[0].length - 1;
  const expressionCloseOffset = findMatchingCloseParen(text, expressionOpenOffset);
  if (expressionCloseOffset === undefined || expressionCloseOffset > closeParen) {
    return undefined;
  }
  const afterExpression = skipWhitespace(text, expressionCloseOffset + 1, closeParen);
  const hasTrailingComma = text[afterExpression] === ',';
  return {
    name,
    expressionText: text.slice(expressionOpenOffset + 1, expressionCloseOffset).trim(),
    hasTrailingComma,
    startOffset: dotOffset,
    endOffset: expressionCloseOffset + 1,
    expressionStartOffset: expressionOpenOffset + 1,
    expressionEndOffset: expressionCloseOffset,
  };
}

function findMatchingCloseParen(text: string, openParen: number): number | undefined {
  let depth = 0;
  for (let i = openParen; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return undefined;
}

function skipWhitespaceAndCommas(text: string, offset: number, endOffset: number): number {
  let index = offset;
  while (index < endOffset && (/[\s,]/.test(text[index] ?? ''))) {
    index += 1;
  }
  return index;
}

function skipWhitespace(text: string, offset: number, endOffset: number): number {
  let index = offset;
  while (index < endOffset && (/\s/.test(text[index] ?? ''))) {
    index += 1;
  }
  return index;
}

function getOpenParenStack(text: string, offset: number): number[] {
  const stack: number[] = [];
  for (let i = 0; i < offset; i += 1) {
    const ch = text[i];
    if (ch === '(') {
      stack.push(i);
    } else if (ch === ')') {
      stack.pop();
    }
  }
  return stack;
}

function maskCommentsAndStrings(text: string): string {
  let result = '';
  let index = 0;
  while (index < text.length) {
    const ch = text[index] ?? '';
    const next = text[index + 1] ?? '';
    if (ch === '/' && next === '/') {
      result += '  ';
      index += 2;
      while (index < text.length && text[index] !== '\n') {
        result += ' ';
        index += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      result += '  ';
      index += 2;
      while (index < text.length) {
        const blockCh = text[index] ?? '';
        const blockNext = text[index + 1] ?? '';
        if (blockCh === '*' && blockNext === '/') {
          result += '  ';
          index += 2;
          break;
        }
        result += blockCh === '\n' ? '\n' : ' ';
        index += 1;
      }
      continue;
    }
    if (ch === '"') {
      result += ' ';
      index += 1;
      while (index < text.length) {
        const stringCh = text[index] ?? '';
        result += stringCh === '\n' ? '\n' : ' ';
        if (stringCh === '\\' && index + 1 < text.length) {
          result += text[index + 1] === '\n' ? '\n' : ' ';
          index += 2;
          continue;
        }
        index += 1;
        if (stringCh === '"') {
          break;
        }
      }
      continue;
    }
    result += ch;
    index += 1;
  }
  return result;
}
