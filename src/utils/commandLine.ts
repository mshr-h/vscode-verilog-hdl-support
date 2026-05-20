// SPDX-License-Identifier: MIT

export function splitCommandLineArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: "'" | '"' | undefined;
  let hasToken = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '\\') {
      if (i + 1 < input.length) {
        current += input[i + 1];
        hasToken = true;
        i++;
      } else {
        current += char;
        hasToken = true;
      }
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
      hasToken = true;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      hasToken = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (hasToken) {
        args.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }

    current += char;
    hasToken = true;
  }

  if (hasToken) {
    args.push(current);
  }

  return args;
}
