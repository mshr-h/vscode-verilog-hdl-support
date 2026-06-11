// SPDX-License-Identifier: MIT

export interface FilelistToken {
  text: string;
  line: number;
  character: number;
}

export function tokenizeFilelist(input: string): FilelistToken[] {
  const tokens: FilelistToken[] = [];
  let index = 0;
  let line = 0;
  let character = 0;

  const advance = (): string => {
    const ch = input[index] ?? '';
    index += 1;
    if (ch === '\n') {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
    return ch;
  };

  while (index < input.length) {
    const ch = input[index] ?? '';
    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    if (ch === '#') {
      while (index < input.length && input[index] !== '\n') {
        advance();
      }
      continue;
    }

    if (ch === '/' && input[index + 1] === '/') {
      while (index < input.length && input[index] !== '\n') {
        advance();
      }
      continue;
    }

    const tokenLine = line;
    const tokenCharacter = character;
    if (ch === '"') {
      advance();
      let text = '';
      while (index < input.length) {
        const next = advance();
        if (next === '"') {
          break;
        }
        if (next === '\\' && index < input.length) {
          text += advance();
        } else {
          text += next;
        }
      }
      tokens.push({ text, line: tokenLine, character: tokenCharacter });
      continue;
    }

    let text = '';
    while (index < input.length) {
      const next = input[index] ?? '';
      if (/\s/.test(next) || next === '#') {
        break;
      }
      if (next === '/' && input[index + 1] === '/') {
        break;
      }
      text += advance();
    }
    if (text.length > 0) {
      tokens.push({ text, line: tokenLine, character: tokenCharacter });
    }
  }

  return tokens;
}
