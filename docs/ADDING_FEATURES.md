# 新機能追加ガイド / Adding Features Guide

このドキュメントでは、vscode-verilog-hdl-support拡張機能に新しい機能を追加する方法を説明します。

## 目次

1. [新しいリンターの追加](#新しいリンターの追加)
2. [新しい言語サーバーの追加](#新しい言語サーバーの追加)
3. [新しいProviderの追加](#新しいproviderの追加)
4. [新しいコマンドの追加](#新しいコマンドの追加)
5. [新しい言語のサポート追加](#新しい言語のサポート追加)

## 新しいリンターの追加

### ステップ1: BaseLinterを継承したクラスを作成

`src/linter/` ディレクトリに新しいファイルを作成します。例: `MyLinter.ts`

```typescript
// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import * as child from 'child_process';
import BaseLinter from './BaseLinter';
import { Logger } from '../logger';

export default class MyLinter extends BaseLinter {
  private runAtFileLocation: boolean = false;
  private additionalArgs: string = '';

  constructor(diagnosticCollection: vscode.DiagnosticCollection, logger: Logger) {
    super('mylinter', diagnosticCollection, logger);
  }

  /**
   * リンター固有の設定を読み込む
   */
  protected override updateConfig(): void {
    const config = vscode.workspace.getConfiguration();
    this.runAtFileLocation = config.get<boolean>('verilog.linting.mylinter.runAtFileLocation', false);
    this.additionalArgs = config.get<string>('verilog.linting.mylinter.arguments', '');
  }

  /**
   * リンターの重大度レベルをVS Codeの重大度に変換
   */
  protected override convertToSeverity(severityString: string): vscode.DiagnosticSeverity {
    // リンターの出力形式に応じて調整
    switch (severityString.toLowerCase()) {
      case 'error':
      case 'fatal':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
      case 'warn':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
        return vscode.DiagnosticSeverity.Information;
      case 'hint':
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Error;
    }
  }

  /**
   * リンティングを実行
   */
  protected override async lint(document: vscode.TextDocument): Promise<void> {
    const logger = this.logger.getChild('lint');
    const filePath = document.uri.fsPath;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    
    if (!workspaceFolder) {
      logger.warn('No workspace folder found');
      return;
    }

    // 作業ディレクトリを決定
    const runLocation = this.runAtFileLocation
      ? this.resolvePath(filePath, true)
      : workspaceFolder.uri.fsPath;

    // リンターコマンドを構築
    const linterPath = this.config.linterInstalledPath || 'mylinter';
    const command = `${linterPath} ${this.additionalArgs} ${filePath}`;

    logger.info(`Running: ${command}`);
    logger.debug(`Working directory: ${runLocation}`);

    // リンターを実行
    child.exec(
      command,
      { cwd: runLocation },
      (error: child.ExecException | null, stdout: string, stderr: string) => {
        const diagnostics: vscode.Diagnostic[] = [];

        // 出力をパース
        const lines = (stdout + stderr).split(/\r?\n/);
        
        for (const line of lines) {
          if (!line.trim()) continue;

          // リンターの出力形式に応じて正規表現を調整
          // 例: "file.v:10:5: error: message"
          const match = line.match(/^(.+?):(\d+):(\d+):\s+(error|warning|info):\s+(.+)$/);
          
          if (match) {
            const [, file, lineStr, colStr, severity, message] = match;
            const lineNum = parseInt(lineStr, 10) - 1; // 0-indexed
            const colNum = parseInt(colStr, 10) - 1;

            // ファイルパスが現在のドキュメントと一致するか確認
            if (file === filePath || file === document.fileName) {
              const range = new vscode.Range(
                new vscode.Position(lineNum, colNum),
                new vscode.Position(lineNum, Number.MAX_VALUE)
              );

              const diagnostic = new vscode.Diagnostic(
                range,
                message,
                this.convertToSeverity(severity)
              );
              
              diagnostic.source = 'mylinter';
              diagnostics.push(diagnostic);
            }
          }
        }

        // 診断情報を設定
        this.diagnosticCollection.set(document.uri, diagnostics);
        logger.info(`Found ${diagnostics.length} diagnostic(s)`);
      }
    );
  }
}
```

### ステップ2: LintManagerに登録

`src/linter/LintManager.ts` を編集：

```typescript
import MyLinter from './MyLinter';

export default class LintManager {
  private linters: Map<string, BaseLinter> = new Map();

  constructor(logger: Logger, context: vscode.ExtensionContext) {
    // 既存のリンター...
    
    // 新しいリンターを追加
    const myLinter = new MyLinter(this.diagnosticCollection, logger.getChild('MyLinter'));
    this.linters.set('mylinter', myLinter);
  }
}
```

### ステップ3: package.jsonに設定を追加

```json
{
  "contributes": {
    "configuration": [
      {
        "title": "Verilog: Linting",
        "properties": {
          "verilog.linting.linter": {
            "enum": [
              "xvlog",
              "iverilog",
              "verilator",
              "modelsim",
              "slang",
              "verible-verilog-lint",
              "mylinter",
              "none"
            ]
          },
          "verilog.linting.mylinter.arguments": {
            "scope": "window",
            "type": "string",
            "default": "",
            "markdownDescription": "Add MyLinter arguments here."
          },
          "verilog.linting.mylinter.runAtFileLocation": {
            "scope": "window",
            "type": "boolean",
            "default": false,
            "markdownDescription": "If enabled, MyLinter will be run at the file location."
          }
        }
      }
    ]
  }
}
```

### ステップ4: テストを追加

`src/test/mylinter.test.ts` を作成：

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('MyLinter Tests', () => {
  test('should detect errors in verilog file', async function () {
    this.timeout(10000);

    const docUri = vscode.Uri.file(
      path.join(__dirname, '../../language_examples/test_module.v')
    );
    
    const document = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(document);
    
    // リンターが実行されるのを待つ
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const diagnostics = vscode.languages.getDiagnostics(docUri);
    
    assert(diagnostics.length > 0, 'Should find at least one diagnostic');
    assert.strictEqual(diagnostics[0].source, 'mylinter');
  });
});
```

## 新しい言語サーバーの追加

### ステップ1: definitions.tsに定義を追加

`src/languageServer/definitions.ts` を編集：

```typescript
export const languageServerConfigs: LanguageServerConfig[] = [
  // 既存のサーバー...
  {
    id: 'myLanguageServer',
    name: 'My Language Server',
    enabledKey: 'verilog.languageServer.myls.enabled',
    pathKey: 'verilog.languageServer.myls.path',
    argumentsKey: 'verilog.languageServer.myls.arguments',
    documentSelector: [
      { scheme: 'file', language: 'verilog' },
      { scheme: 'file', language: 'systemverilog' }
    ],
    serverOptions: {
      command: '',  // pathKey から読み込まれる
      args: []      // argumentsKey から読み込まれる
    },
    clientOptions: {
      documentSelector: [],  // documentSelector から設定される
      synchronize: {
        configurationSection: 'verilog'
      }
    }
  }
];
```

### ステップ2: package.jsonに設定を追加

```json
{
  "contributes": {
    "configuration": [
      {
        "title": "Verilog: Language Servers",
        "properties": {
          "verilog.languageServer.myls.enabled": {
            "scope": "window",
            "type": "boolean",
            "default": false,
            "markdownDescription": "Enable My Language Server."
          },
          "verilog.languageServer.myls.path": {
            "scope": "window",
            "type": "string",
            "default": "myls",
            "markdownDescription": "A path to the My Language Server binary."
          },
          "verilog.languageServer.myls.arguments": {
            "scope": "window",
            "type": "string",
            "default": "",
            "markdownDescription": "Add custom arguments for My Language Server."
          }
        }
      }
    ]
  }
}
```

### ステップ3: テストを追加

`src/test/myls.test.ts`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('My Language Server Tests', () => {
  test('should start when enabled', async function () {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration();
    await config.update('verilog.languageServer.myls.enabled', true, true);
    
    // 言語サーバーが起動するのを待つ
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 言語サーバーの機能をテスト
    // 例: ホバー、補完など
  });
});
```

## 新しいProviderの追加

### ステップ1: Providerクラスを作成

`src/providers/MyProvider.ts`:

```typescript
// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { Logger } from '../logger';

export class MyProvider implements vscode.CodeActionProvider {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    // コードアクションのロジックを実装
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === 'mylinter') {
        const action = new vscode.CodeAction(
          'Fix this issue',
          vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];
        action.edit = new vscode.WorkspaceEdit();
        // 修正内容を定義
        actions.push(action);
      }
    }

    return actions;
  }
}
```

### ステップ2: extension.tsに登録

```typescript
import { MyProvider } from './providers/MyProvider';

export function activate(context: vscode.ExtensionContext) {
  // ... 既存のコード
  
  // 新しいProviderを登録
  const myProvider = new MyProvider(logger.getChild('MyProvider'));
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'verilog' },
      myProvider
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'systemverilog' },
      myProvider
    )
  );
}
```

## 新しいコマンドの追加

### ステップ1: コマンドハンドラーを作成

`src/commands/MyCommand.ts`:

```typescript
// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { Logger } from '../logger';

export class MyCommand {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public async execute(): Promise<void> {
    this.logger.info('Executing MyCommand');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      // コマンドのロジックを実装
      const document = editor.document;
      const selection = editor.selection;
      
      // 例: 選択範囲を処理
      const text = document.getText(selection);
      const processed = this.processText(text);
      
      await editor.edit(editBuilder => {
        editBuilder.replace(selection, processed);
      });

      vscode.window.showInformationMessage('Command executed successfully');
    } catch (error) {
      this.logger.error('Command execution failed:', error);
      vscode.window.showErrorMessage(`Command failed: ${error}`);
    }
  }

  private processText(text: string): string {
    // テキスト処理のロジック
    return text.toUpperCase();
  }
}
```

### ステップ2: extension.tsに登録

```typescript
import { MyCommand } from './commands/MyCommand';

export function activate(context: vscode.ExtensionContext) {
  // ... 既存のコード
  
  const myCommand = new MyCommand(logger.getChild('MyCommand'));
  context.subscriptions.push(
    vscode.commands.registerCommand('verilog.myCommand', () => myCommand.execute())
  );
}
```

### ステップ3: package.jsonに追加

```json
{
  "contributes": {
    "commands": [
      {
        "command": "verilog.myCommand",
        "title": "Verilog: My Custom Command"
      }
    ],
    "keybindings": [
      {
        "command": "verilog.myCommand",
        "key": "ctrl+alt+m",
        "mac": "cmd+alt+m",
        "when": "editorTextFocus && editorLangId == verilog"
      }
    ]
  }
}
```

## 新しい言語のサポート追加

### ステップ1: 言語定義を追加

`package.json`:

```json
{
  "contributes": {
    "languages": [
      {
        "id": "mylanguage",
        "aliases": ["My Language", "mylang"],
        "extensions": [".ml", ".mylang"],
        "configuration": "./configs/mylanguage.configuration.json"
      }
    ]
  }
}
```

### ステップ2: 言語設定を作成

`configs/mylanguage.configuration.json`:

```json
{
  "comments": {
    "lineComment": "//",
    "blockComment": ["/*", "*/"]
  },
  "brackets": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"]
  ],
  "autoClosingPairs": [
    { "open": "{", "close": "}" },
    { "open": "[", "close": "]" },
    { "open": "(", "close": ")" },
    { "open": "\"", "close": "\"" }
  ],
  "surroundingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["\"", "\""]
  ]
}
```

### ステップ3: シンタックスハイライトを追加

TextMate文法ファイルを作成: `syntaxes/mylanguage.tmLanguage.json`

```json
{
  "name": "My Language",
  "scopeName": "source.mylanguage",
  "patterns": [
    {
      "include": "#keywords"
    },
    {
      "include": "#strings"
    },
    {
      "include": "#comments"
    }
  ],
  "repository": {
    "keywords": {
      "patterns": [
        {
          "name": "keyword.control.mylanguage",
          "match": "\\b(if|else|while|for)\\b"
        }
      ]
    },
    "strings": {
      "name": "string.quoted.double.mylanguage",
      "begin": "\"",
      "end": "\"",
      "patterns": [
        {
          "name": "constant.character.escape.mylanguage",
          "match": "\\\\."
        }
      ]
    },
    "comments": {
      "patterns": [
        {
          "name": "comment.line.double-slash.mylanguage",
          "match": "//.*$"
        }
      ]
    }
  }
}
```

### ステップ4: package.jsonに文法を登録

```json
{
  "contributes": {
    "grammars": [
      {
        "language": "mylanguage",
        "scopeName": "source.mylanguage",
        "path": "./syntaxes/mylanguage.tmLanguage.json"
      }
    ]
  }
}
```

## チェックリスト

新機能を追加した後、以下を確認してください：

- [ ] コードがESLintとPrettierの規則に従っている
- [ ] TypeScriptの型チェックがパスする
- [ ] 適切なログ出力を追加している
- [ ] エラーハンドリングが適切
- [ ] テストを追加している
- [ ] READMEを更新している（必要に応じて）
- [ ] CHANGELOG.mdに変更を記載している
- [ ] ドキュメントを更新している（必要に応じて）

## 参考資料

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [TextMate Grammar](https://macromates.com/manual/en/language_grammars)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DEVELOPMENT.md](./DEVELOPMENT.md)
