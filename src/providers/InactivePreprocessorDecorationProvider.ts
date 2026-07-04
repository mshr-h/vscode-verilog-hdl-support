// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';

interface InactivePreprocessorRange {
  startLine: number;
  endLine: number;
}

interface ConditionalFrame {
  parentActive: boolean;
  branchActive: boolean;
  branchSelected: boolean;
}

interface Directive {
  keyword: 'define' | 'undef' | 'ifdef' | 'ifndef' | 'elsif' | 'else' | 'endif';
  macro?: string;
}

const VERILOG_LANGUAGE_IDS = new Set(['verilog', 'systemverilog']);
const MACRO_PATTERN = '[A-Za-z_][A-Za-z0-9_$]*';
const DIRECTIVE_PATTERN = new RegExp(
  `^\\s*\`(define|undef|ifdef|ifndef|elsif|else|endif)(?:\\s+(${MACRO_PATTERN}))?\\b`
);

function getEffectiveActive(stack: readonly ConditionalFrame[]): boolean {
  const top = stack.at(-1);
  return top === undefined || (top.parentActive && top.branchActive);
}

function getDirectiveLineActive(
  directive: Directive | undefined,
  stack: readonly ConditionalFrame[]
): boolean {
  if (directive === undefined) {
    return getEffectiveActive(stack);
  }

  if (
    directive.keyword === 'elsif' ||
    directive.keyword === 'else' ||
    directive.keyword === 'endif'
  ) {
    const top = stack.at(-1);
    return top === undefined || top.parentActive;
  }

  return getEffectiveActive(stack);
}

function mergeInactiveLine(
  ranges: InactivePreprocessorRange[],
  line: number
): void {
  const previous = ranges.at(-1);
  if (previous !== undefined && previous.endLine + 1 === line) {
    previous.endLine = line;
    return;
  }
  ranges.push({ startLine: line, endLine: line });
}

function removeComments(line: string, inBlockComment: boolean): [string, boolean] {
  let result = '';
  let index = 0;
  let blockComment = inBlockComment;

  while (index < line.length) {
    if (blockComment) {
      const endIndex = line.indexOf('*/', index);
      if (endIndex === -1) {
        return [result, true];
      }
      index = endIndex + 2;
      blockComment = false;
      continue;
    }

    const lineCommentIndex = line.indexOf('//', index);
    const blockCommentIndex = line.indexOf('/*', index);

    if (lineCommentIndex === -1 && blockCommentIndex === -1) {
      result += line.slice(index);
      break;
    }

    if (
      lineCommentIndex !== -1 &&
      (blockCommentIndex === -1 || lineCommentIndex < blockCommentIndex)
    ) {
      result += line.slice(index, lineCommentIndex);
      break;
    }

    result += line.slice(index, blockCommentIndex);
    index = blockCommentIndex + 2;
    blockComment = true;
  }

  return [result, blockComment];
}

function parseDirective(line: string): Directive | undefined {
  const match = DIRECTIVE_PATTERN.exec(line);
  if (match === null) {
    return undefined;
  }

  return {
    keyword: match[1] as Directive['keyword'],
    macro: match[2],
  };
}

export function computeInactivePreprocessorRanges(
  text: string,
  initialDefines: readonly string[]
): InactivePreprocessorRange[] {
  const defines = new Set(initialDefines);
  const stack: ConditionalFrame[] = [];
  const ranges: InactivePreprocessorRange[] = [];
  const lines = text.split(/\r\n|\r|\n/);
  let inBlockComment = false;

  for (const [lineNumber, line] of lines.entries()) {
    const [code, nextInBlockComment] = removeComments(line, inBlockComment);
    const directive = parseDirective(code);

    if (!getDirectiveLineActive(directive, stack)) {
      mergeInactiveLine(ranges, lineNumber);
    }

    switch (directive?.keyword) {
      case 'define':
        if (directive.macro !== undefined && getEffectiveActive(stack)) {
          defines.add(directive.macro);
        }
        break;

      case 'undef':
        if (directive.macro !== undefined && getEffectiveActive(stack)) {
          defines.delete(directive.macro);
        }
        break;

      case 'ifdef': {
        const parentActive = getEffectiveActive(stack);
        const condition = directive.macro !== undefined && defines.has(directive.macro);
        stack.push({
          parentActive,
          branchActive: condition,
          branchSelected: parentActive && condition,
        });
        break;
      }

      case 'ifndef': {
        const parentActive = getEffectiveActive(stack);
        const condition = directive.macro === undefined || !defines.has(directive.macro);
        stack.push({
          parentActive,
          branchActive: condition,
          branchSelected: parentActive && condition,
        });
        break;
      }

      case 'elsif': {
        const top = stack.at(-1);
        if (top !== undefined) {
          const condition = directive.macro !== undefined && defines.has(directive.macro);
          top.branchActive = !top.branchSelected && condition;
          top.branchSelected = top.branchSelected || (top.parentActive && condition);
        }
        break;
      }

      case 'else': {
        const top = stack.at(-1);
        if (top !== undefined) {
          top.branchActive = !top.branchSelected;
          top.branchSelected = true;
        }
        break;
      }

      case 'endif':
        stack.pop();
        break;
    }

    inBlockComment = nextInBlockComment;
  }

  return ranges;
}

export function mergePreprocessorDefines(configuredDefines: readonly string[]): string[] {
  return [...new Set(configuredDefines)];
}

export class InactivePreprocessorDecorationProvider implements vscode.Disposable {
  private readonly subscriptions: vscode.Disposable[] = [];
  private decorationType: vscode.TextEditorDecorationType | undefined;

  constructor() {
    this.recreateDecorationType();
    this.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.updateVisibleEditors();
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document === event.document) {
            this.updateEditor(editor);
          }
        }
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration('verilog.preprocessor')) {
          return;
        }
        this.recreateDecorationType();
        this.updateVisibleEditors();
      })
    );
    this.updateVisibleEditors();
  }

  dispose(): void {
    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
    this.decorationType?.dispose();
  }

  private recreateDecorationType(): void {
    this.decorationType?.dispose();

    const inactiveCodeConfig = vscode.workspace.getConfiguration(
      'verilog.preprocessor.inactiveCode'
    );
    const foregroundColor = inactiveCodeConfig.get('foregroundColor', '');
    const backgroundColor = inactiveCodeConfig.get('backgroundColor', '');
    const opacity = inactiveCodeConfig.get('opacity', 0.45);
    const options: vscode.DecorationRenderOptions = {
      opacity: String(opacity),
    };

    if (foregroundColor !== '') {
      options.color = foregroundColor;
    }
    if (backgroundColor !== '') {
      options.backgroundColor = backgroundColor;
    }

    this.decorationType = vscode.window.createTextEditorDecorationType(options);
  }

  private updateEditor(editor: vscode.TextEditor | undefined): void {
    if (editor === undefined || this.decorationType === undefined) {
      return;
    }

    if (!VERILOG_LANGUAGE_IDS.has(editor.document.languageId) || !this.isEnabled()) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const config = vscode.workspace.getConfiguration('verilog.preprocessor');
    const ranges = computeInactivePreprocessorRanges(
      editor.document.getText(),
      mergePreprocessorDefines(config.get<string[]>('defines', []))
    ).map((range) => this.toVscodeRange(editor.document, range));
    editor.setDecorations(this.decorationType, ranges);
  }

  private updateVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateEditor(editor);
    }
  }

  private isEnabled(): boolean {
    return vscode.workspace
      .getConfiguration('verilog.preprocessor.inactiveCode')
      .get('enabled', true);
  }

  private toVscodeRange(
    document: vscode.TextDocument,
    range: InactivePreprocessorRange
  ): vscode.Range {
    const start = new vscode.Position(range.startLine, 0);
    const endLine = document.lineAt(range.endLine);
    const end = new vscode.Position(range.endLine, endLine.text.length);
    return new vscode.Range(start, end);
  }
}
