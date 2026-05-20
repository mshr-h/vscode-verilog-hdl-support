// SPDX-License-Identifier: MIT
import * as os from 'os';
import * as path from 'path';

export function expandPathVariables(input: string): string {
  let expanded = input.replace(
    /\$\{env:([^}]+)\}/g,
    (_match, envName: string) => process.env[envName] ?? ''
  );
  if (expanded === '~') {
    expanded = os.homedir();
  } else if (expanded.startsWith(`~${path.sep}`) || expanded.startsWith('~/')) {
    expanded = path.join(os.homedir(), expanded.slice(2));
  }
  return expanded;
}

export function resolveConfigPath(input: string, workspaceFolder?: string): string {
  const expanded = expandPathVariables(input.trim());
  if (expanded.length === 0 || path.isAbsolute(expanded) || !workspaceFolder) {
    return expanded;
  }
  return path.join(workspaceFolder, expanded);
}
