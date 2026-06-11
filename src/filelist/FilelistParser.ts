// SPDX-License-Identifier: MIT
import { tokenizeFilelist, type FilelistToken } from './FilelistTokenizer';

export type FilelistDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface ParsedPathRef {
  path: string;
  line: number;
  character: number;
}

export interface ParsedFileRef extends ParsedPathRef {
  kind: 'source' | 'include';
}

export interface ParsedDefine {
  name: string;
  value: string | true;
  line: number;
  character: number;
}

export interface FilelistDiagnostic {
  severity: FilelistDiagnosticSeverity;
  message: string;
  source: string;
  code?: string;
  path?: string;
  line?: number;
  character?: number;
}

export interface ParsedFilelist {
  files: ParsedFileRef[];
  includeDirs: ParsedPathRef[];
  defines: ParsedDefine[];
  libraryDirs: ParsedPathRef[];
  libraryFiles: ParsedPathRef[];
  nestedFilelists: ParsedPathRef[];
  diagnostics: FilelistDiagnostic[];
}

export function parseFilelist(input: string, source = 'filelist'): ParsedFilelist {
  return parseFilelistTokens(tokenizeFilelist(input), source);
}

export function parseFilelistTokens(tokens: FilelistToken[], source = 'filelist'): ParsedFilelist {
  const parsed: ParsedFilelist = {
    files: [],
    includeDirs: [],
    defines: [],
    libraryDirs: [],
    libraryFiles: [],
    nestedFilelists: [],
    diagnostics: [],
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) {
      continue;
    }
    const text = token.text;

    if (text.startsWith('+incdir+')) {
      for (const dir of text.slice('+incdir+'.length).split('+').filter(Boolean)) {
        parsed.includeDirs.push(pathRef(dir, token));
      }
      continue;
    }

    if (text.startsWith('+define+')) {
      for (const defineText of text.slice('+define+'.length).split('+').filter(Boolean)) {
        parsed.defines.push(parseDefineText(defineText, token));
      }
      continue;
    }

    if (text === '-I' || text === '-D' || text === '-f' || text === '-F' || text === '-y' || text === '-v') {
      const next = tokens[i + 1];
      if (!next) {
        parsed.diagnostics.push({
          severity: 'warning',
          message: `Missing value after ${text}`,
          source,
          code: 'missing-argument',
          line: token.line,
          character: token.character,
        });
        continue;
      }
      i += 1;
      appendOption(parsed, text, next);
      continue;
    }

    if (text.startsWith('-I') && text.length > 2) {
      parsed.includeDirs.push(pathRef(text.slice(2), token));
      continue;
    }
    if (text.startsWith('-D') && text.length > 2) {
      parsed.defines.push(parseDefineText(text.slice(2), token));
      continue;
    }
    if ((text.startsWith('-f') || text.startsWith('-F')) && text.length > 2) {
      parsed.nestedFilelists.push(pathRef(text.slice(2), token));
      continue;
    }
    if (text.startsWith('-y') && text.length > 2) {
      parsed.libraryDirs.push(pathRef(text.slice(2), token));
      continue;
    }
    if (text.startsWith('-v') && text.length > 2) {
      parsed.libraryFiles.push(pathRef(text.slice(2), token));
      continue;
    }

    if (text.startsWith('-')) {
      parsed.diagnostics.push({
        severity: 'info',
        message: `Ignoring unsupported filelist option: ${text}`,
        source,
        code: 'unsupported-option',
        line: token.line,
        character: token.character,
      });
      continue;
    }

    parsed.files.push({ ...pathRef(text, token), kind: inferFileKind(text) });
  }

  return parsed;
}

function appendOption(parsed: ParsedFilelist, option: string, token: FilelistToken): void {
  switch (option) {
    case '-I':
      parsed.includeDirs.push(pathRef(token.text, token));
      return;
    case '-D':
      parsed.defines.push(parseDefineText(token.text, token));
      return;
    case '-f':
    case '-F':
      parsed.nestedFilelists.push(pathRef(token.text, token));
      return;
    case '-y':
      parsed.libraryDirs.push(pathRef(token.text, token));
      return;
    case '-v':
      parsed.libraryFiles.push(pathRef(token.text, token));
      break;
    default:
  }
}

function pathRef(inputPath: string, token: FilelistToken): ParsedPathRef {
  return {
    path: inputPath,
    line: token.line,
    character: token.character,
  };
}

function parseDefineText(text: string, token: FilelistToken): ParsedDefine {
  const equalsIndex = text.indexOf('=');
  if (equalsIndex < 0) {
    return { name: text, value: true, line: token.line, character: token.character };
  }
  return {
    name: text.slice(0, equalsIndex),
    value: text.slice(equalsIndex + 1),
    line: token.line,
    character: token.character,
  };
}

function inferFileKind(inputPath: string): 'source' | 'include' {
  const lower = inputPath.toLowerCase();
  if (lower.endsWith('.vh') || lower.endsWith('.svh')) {
    return 'include';
  }
  return 'source';
}
