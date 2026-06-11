// SPDX-License-Identifier: MIT

export function splitOptionValue(input: string, option: string): string | undefined {
  if (input === option) {
    return undefined;
  }
  if (input.startsWith(option)) {
    return input.slice(option.length);
  }
  return undefined;
}
