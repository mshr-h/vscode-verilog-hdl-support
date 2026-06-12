// SPDX-License-Identifier: MIT
import { splitCommandLineArgs } from '../utils/commandLine';
import { formatMacroDefine, type CompileUnitLintContext } from './ProjectLintContext';

export interface BuildSlangCompileUnitArgsOptions {
  docFolder: string;
  includePaths: string[];
  defineArgs: string[];
  customArguments: string;
  sourcePaths: string[];
}

export interface BuildVerilatorCompileUnitArgsOptions {
  languageId: string;
  docFolder: string;
  includePaths: string[];
  defineArgs: string[];
  customArguments: string;
  sourcePaths: string[];
}

export interface BuildIcarusCompileUnitArgsOptions {
  languageId: string;
  standards: Map<string, string>;
  includePaths: string[];
  defineArgs: string[];
  customArguments: string;
  sourcePaths: string[];
}

const ICARUS_STANDARD_TO_ARG = new Map<string, string>([
  ['Verilog-95', '-g1995'],
  ['Verilog-2001', '-g2001'],
  ['Verilog-2005', '-g2005'],
  ['SystemVerilog2005', '-g2005-sv'],
  ['SystemVerilog2009', '-g2009'],
  ['SystemVerilog2012', '-g2012'],
]);

export function getCompileUnitSourcePaths(context: CompileUnitLintContext): string[] {
  return context.files.map((file) => file.uri.fsPath);
}

export function getCompileUnitIncludePaths(context: CompileUnitLintContext): string[] {
  return context.includeDirs.map((dir) => dir.fsPath);
}

export function getCompileUnitDefineArgs(context: CompileUnitLintContext): string[] {
  return Object.values(context.defines).map(formatMacroDefine);
}

export function buildSlangCompileUnitArgs(options: BuildSlangCompileUnitArgsOptions): string[] {
  const args: string[] = ['-I', options.docFolder];
  for (const includePath of options.includePaths) {
    args.push('-I', includePath);
  }
  for (const defineArg of options.defineArgs) {
    args.push('-D', defineArg);
  }
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(...options.sourcePaths);
  return args;
}

export function buildVerilatorCompileUnitArgs(options: BuildVerilatorCompileUnitArgsOptions): string[] {
  const args: string[] = [];
  if (options.languageId === 'systemverilog') {
    args.push('-sv');
  }
  args.push('--lint-only');
  args.push(`-I${options.docFolder}`);
  args.push(...options.includePaths.map((includePath) => `-I${includePath}`));
  args.push(...options.defineArgs.map((defineArg) => `-D${defineArg}`));
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(...options.sourcePaths);
  return args;
}

export function buildIcarusCompileUnitArgs(options: BuildIcarusCompileUnitArgsOptions): string[] {
  const args: string[] = ['-t', 'null'];
  const standard = options.standards.get(options.languageId);
  const standardArg = standard ? ICARUS_STANDARD_TO_ARG.get(standard) : undefined;
  if (standardArg) {
    args.push(standardArg);
  }
  for (const includePath of options.includePaths) {
    args.push('-I', includePath);
  }
  for (const defineArg of options.defineArgs) {
    args.push('-D', defineArg);
  }
  args.push(...splitCommandLineArgs(options.customArguments));
  args.push(...options.sourcePaths);
  return args;
}
