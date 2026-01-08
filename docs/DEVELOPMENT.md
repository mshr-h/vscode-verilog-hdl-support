# 開発ガイド / Development Guide

このドキュメントは、vscode-verilog-hdl-support拡張機能の開発方法を詳しく説明します。

## 目次 / Table of Contents

1. [環境セットアップ](#環境セットアップ)
2. [ビルドとテスト](#ビルドとテスト)
3. [デバッグ方法](#デバッグ方法)
4. [コーディング規約](#コーディング規約)
5. [テストの書き方](#テストの書き方)
6. [トラブルシューティング](#トラブルシューティング)

## 環境セットアップ

### 前提条件

- **Node.js**: LTS版推奨（現在は v20以降）
- **npm**: Node.jsに付属
- **VS Code**: 最新の安定版
- **Git**: バージョン管理用

### 初期セットアップ

1. リポジトリをクローン:
```bash
git clone https://github.com/mshr-h/vscode-verilog-hdl-support.git
cd vscode-verilog-hdl-support
```

2. 依存関係をインストール:
```bash
npm install
```

3. ビルドして正常に動作することを確認:
```bash
npm run compile
```

### 推奨VS Code拡張機能

開発時に以下の拡張機能をインストールすることを推奨します：

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **EditorConfig** (`editorconfig.editorconfig`)

設定例（`.vscode/settings.json`）:
```json
{
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## ビルドとテスト

### ビルドコマンド

```bash
# フルビルド（型チェック + リント + バンドル）
npm run compile

# 監視モード（開発時推奨）
npm run watch

# TypeScript型チェックのみ
npm run check-types

# リントのみ
npm run lint

# 本番用ビルド
npm run package
```

### ビルドシステムの理解

プロジェクトは2段階のビルドプロセスを使用しています：

1. **TypeScriptコンパイル** (`tsc`):
   - `src/` → `out/` にコンパイル
   - 型チェックとソースマップ生成
   - `tsconfig.json`で設定

2. **esbuild バンドル** (`esbuild.js`):
   - `src/extension.ts` → `dist/extension.js` にバンドル
   - 本番用に最適化と最小化
   - 実際の拡張機能エントリポイント

### テストの実行

```bash
# 全テストを実行
npm test

# テストのビルドのみ
npm run compile-tests

# テスト監視モード
npm run watch-tests
```

**注意**: テストはVS Code Extension Development Hostで実行されます。初回実行時にVS Codeがダウンロードされる場合があります。

### 個別テストの実行

特定のテストファイルのみを実行したい場合：

```bash
# .vscode-test.mjs を編集して files パターンを変更
# 例: files: 'out/test/logger.test.js'
npm test
```

## デバッグ方法

### 拡張機能のデバッグ

1. VS Codeでプロジェクトを開く
2. `F5`キーを押すか、「実行とデバッグ」ビューから「Launch Extension」を選択
3. 新しいVS Codeウィンドウ（Extension Development Host）が開きます
4. ブレークポイントを設定してデバッグ

**便利なデバッグ設定** (`.vscode/launch.json`):
```json
{
  "type": "extensionHost",
  "request": "launch",
  "name": "Launch Extension",
  "runtimeExecutable": "${execPath}",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}",
    "${workspaceFolder}/language_examples"
  ],
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "preLaunchTask": "watch"
}
```

### テストのデバッグ

1. 「実行とデバッグ」ビューから「Extension Tests」を選択
2. `F5`を押してテストをデバッグモードで実行

### ログの確認

1. Extension Development Host で`Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
2. 「出力: フォーカス」を選択
3. ドロップダウンから「Verilog」を選択

ログレベルは右クリックメニューから変更できます：
- Trace（最も詳細）
- Debug
- Info（デフォルト）
- Warning
- Error

## コーディング規約

### TypeScript スタイル

1. **厳格な型付け**:
```typescript
// Good
function processSymbol(symbol: Symbol): vscode.DocumentSymbol {
  return symbol.getDocumentSymbol();
}

// Bad (any を避ける)
function processSymbol(symbol: any) {
  return symbol.getDocumentSymbol();
}
```

2. **Null/Undefined チェック**:
```typescript
// Good
const path = config.get<string>('path');
if (path) {
  // path を使用
}

// Good (デフォルト値を使用)
const path = config.get<string>('path', 'default-path');

// Bad
const path = config.get('path')!;  // non-null assertion は避ける
```

3. **アロー関数**:
```typescript
// Good (シンプルな場合)
const doubled = numbers.map(n => n * 2);

// Good (複雑な場合は波括弧を使用)
const processed = items.map(item => {
  const result = complexOperation(item);
  return result.value;
});
```

### ファイル構成

1. **ライセンスヘッダー**:
```typescript
// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
```

2. **インポート順序**:
```typescript
// 1. Node.js標準ライブラリ
import * as path from 'path';
import * as fs from 'fs';

// 2. 外部パッケージ
import * as vscode from 'vscode';

// 3. プロジェクト内モジュール
import { Logger } from './logger';
import { Symbol } from './ctags';
```

3. **エクスポート**:
```typescript
// Good (名前付きエクスポート)
export class MyProvider implements vscode.Provider {
  // ...
}

// Good (デフォルトエクスポートはクラス1つの場合のみ)
export default class BaseLinter {
  // ...
}
```

### 命名規則

- **クラス**: PascalCase (`BaseLinter`, `CtagsManager`)
- **関数/メソッド**: camelCase (`loadConfig`, `parseOutput`)
- **定数**: UPPER_SNAKE_CASE (`END_OF_LINE`, `DEFAULT_TIMEOUT`)
- **プライベートメンバー**: 先頭にアンダースコア不要（TypeScript の`private`を使用）

### コメント

1. **JSDoc コメント**:
```typescript
/**
 * Parses ctags output and creates Symbol objects.
 * @param output - The raw ctags output string
 * @returns Array of parsed Symbol objects
 * @throws Error if parsing fails
 */
function parseOutput(output: string): Symbol[] {
  // 実装
}
```

2. **インラインコメント**:
```typescript
// Good (コードが自明でない場合のみ)
// WSL path conversion is needed for cross-platform support
const wslPath = convertToWSLPath(filePath);

// Bad (コードを繰り返すだけのコメント)
// Get the config
const config = getConfig();
```

### Loggerの使用

```typescript
export class MyClass {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async processData() {
    this.logger.info('Starting data processing');
    
    try {
      const result = await heavyOperation();
      this.logger.debug('Processing result:', result);
      return result;
    } catch (error) {
      this.logger.error('Processing failed:', error);
      throw error;
    }
  }
}
```

## テストの書き方

### テストファイルの構成

テストファイルは `src/test/` に配置し、`*.test.ts` という名前にします。

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { MyClass } from '../myClass';

suite('MyClass Test Suite', () => {
  let myClass: MyClass;

  suiteSetup(async () => {
    // 全テスト前の1回だけの初期化
    await vscode.commands.executeCommand('vscode.openFolder', workspaceUri);
  });

  setup(() => {
    // 各テスト前の初期化
    myClass = new MyClass();
  });

  teardown(() => {
    // 各テスト後のクリーンアップ
    myClass.dispose();
  });

  test('should process data correctly', async () => {
    const result = await myClass.processData();
    assert.strictEqual(result.status, 'success');
  });

  test('should handle errors gracefully', async () => {
    assert.rejects(
      async () => await myClass.processInvalidData(),
      /Expected error message/
    );
  });
});
```

### モックとスタブ

外部依存をモック化する例：

```typescript
import * as sinon from 'sinon';

test('should call external tool', async () => {
  const execStub = sinon.stub(child_process, 'exec');
  execStub.yields(null, 'output', '');

  const result = await linter.lint(document);
  
  assert(execStub.calledOnce);
  assert.strictEqual(result.length, expectedDiagnostics);
  
  execStub.restore();
});
```

### テストデータ

テスト用のVerilogファイルは `language_examples/` ディレクトリに配置されています。

```typescript
const testFile = path.join(
  vscode.workspace.workspaceFolders[0].uri.fsPath,
  'test_module.v'
);
const document = await vscode.workspace.openTextDocument(testFile);
```

## トラブルシューティング

### よくある問題

#### 1. "Cannot find module" エラー

```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 2. TypeScript コンパイルエラー

```bash
# 型定義を最新化
npm update @types/vscode @types/node
npm run check-types
```

#### 3. ESLint エラー

```bash
# 自動修正を試す
npm run lint -- --fix

# または手動で修正
npm run lint
```

#### 4. テストが失敗する

```bash
# テストファイルを再コンパイル
npm run compile-tests

# VS Code のテストランナーをクリーン
rm -rf .vscode-test

# テスト再実行
npm test
```

#### 5. 拡張機能がロードされない

1. `dist/extension.js` が存在するか確認
2. `package.json` の `main` フィールドを確認: `"./dist/extension.js"`
3. `npm run compile` でビルド

#### 6. ログが表示されない

1. Extension Development Host を開く
2. 「表示」→「出力」を選択
3. ドロップダウンから「Verilog」を選択
4. ログレベルを「Trace」に変更

### デバッグのヒント

1. **VS Code Developer Tools**:
   - `Ctrl+Shift+P` → 「開発者: 開発者ツールの切り替え」
   - Console タブでJavaScriptエラーを確認

2. **Verbose Logging**:
```typescript
// 一時的に詳細ログを追加
this.logger.trace('Variable value:', JSON.stringify(variable, null, 2));
```

3. **Breakpoint での確認**:
   - ブレークポイントを設定
   - デバッグコンソールで変数を検査: `variable`, `JSON.stringify(variable)`

### パフォーマンスのプロファイリング

```typescript
// 実行時間を測定
const start = Date.now();
await heavyOperation();
const elapsed = Date.now() - start;
this.logger.info(`Operation took ${elapsed}ms`);
```

または VS Code のプロファイラーを使用：
1. `Ctrl+Shift+P` → 「開発者: CPU プロファイルの開始」
2. 操作を実行
3. `Ctrl+Shift+P` → 「開発者: CPU プロファイルの停止」

## リリースプロセス

詳細は [CONTRIBUTING.md](../CONTRIBUTING.md) を参照してください。

1. `CHANGELOG.md` を更新
2. `package.json` のバージョンをバンプ
3. `npm run package` でビルド
4. `npx @vscode/vsce package` でVSIXパッケージを生成
5. GitHub でリリースを作成
6. VS Code Marketplace に公開

## 参考資料

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)

## ヘルプが必要な場合

- **Issue**: [GitHub Issues](https://github.com/mshr-h/vscode-verilog-hdl-support/issues)
- **Discussion**: [GitHub Discussions](https://github.com/mshr-h/vscode-verilog-hdl-support/discussions)
- **コントリビューション**: [CONTRIBUTING.md](../CONTRIBUTING.md) を参照
