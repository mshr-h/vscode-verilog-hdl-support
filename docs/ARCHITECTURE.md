# アーキテクチャ概要 / Architecture Overview

このドキュメントは、vscode-verilog-hdl-support拡張機能のアーキテクチャと設計思想を説明します。

## 目次 / Table of Contents

1. [概要](#概要)
2. [全体アーキテクチャ](#全体アーキテクチャ)
3. [主要コンポーネント](#主要コンポーネント)
4. [データフロー](#データフロー)
5. [拡張性](#拡張性)

## 概要

この拡張機能は、VS Code上でVerilog/SystemVerilog/VHDLなどのHDL開発をサポートします。主な機能は以下の通りです：

- **シンタックスハイライト**: TextMate文法を使用
- **リンティング**: 外部ツール統合（iverilog, verilator等）
- **言語サーバー**: LSP準拠のサーバー統合
- **Ctags統合**: シンボル解析、定義ジャンプ、ホバー
- **フォーマッティング**: 複数のフォーマッターサポート
- **VCD波形ビューア**: Fliplot統合

## 全体アーキテクチャ

```
┌─────────────────────────────────────────────┐
│           VS Code Extension Host            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │  extension.ts│◄────►│ExtensionManager │ │
│  └──────┬───────┘      └─────────────────┘ │
│         │                                   │
│  ┌──────▼────────────────────────────────┐ │
│  │         Feature Providers             │ │
│  ├───────────────────────────────────────┤ │
│  │ • DocumentSymbolProvider              │ │
│  │ • HoverProvider                       │ │
│  │ • DefinitionProvider                  │ │
│  │ • CompletionItemProvider              │ │
│  │ • FormatProvider                      │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐ │
│  │ LintManager ├─►│ BaseLinter           │ │
│  └─────────────┘  │ ├── IcarusLinter     │ │
│                   │ ├── VerilatorLinter  │ │
│                   │ ├── ModelsimLinter   │ │
│                   │ ├── SlangLinter      │ │
│                   │ ├── VeribleLinter    │ │
│                   │ └── XvlogLinter      │ │
│                   └──────────────────────┘ │
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │   LanguageServerManager                │ │
│  ├────────────────────────────────────────┤ │
│  │ • svls (SystemVerilog)                 │ │
│  │ • veridian (SystemVerilog)             │ │
│  │ • hdl_checker (Verilog/SV/VHDL)        │ │
│  │ • verible-verilog-ls (Verilog/SV)      │ │
│  │ • vhdl_ls (VHDL)                       │ │
│  │ • tclsp (Tcl/SDC/XDC/UPF)              │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐ │
│  │CtagsManager ├─►│ Symbol Cache         │ │
│  └─────────────┘  └──────────────────────┘ │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │     Fliplot (VCD Viewer)                ││
│  │  ┌────────────┐  ┌──────────────────┐  ││
│  │  │FliplotPanel│  │FliplotCustomEditor│  ││
│  │  └────────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────┘│
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │            Logger                       ││
│  │     (階層的ログ出力システム)              ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌────────────────┐   ┌────────────────────┐
│  外部ツール      │   │ 言語サーバー         │
│  • iverilog    │   │ • svls             │
│  • verilator   │   │ • veridian         │
│  • modelsim    │   │ • hdl_checker      │
│  • xvlog       │   │ • verible-ls       │
│  • slang       │   │ • vhdl_ls          │
│  • verible     │   │ • tclsp            │
│  • ctags       │   └────────────────────┘
└────────────────┘
```

## 主要コンポーネント

### 1. Extension Entry Point (`src/extension.ts`)

拡張機能のメインエントリポイント。以下の責務を持ちます：

- 全機能の初期化と登録
- VS Code APIとの統合
- コンテキストの管理
- リソースのクリーンアップ

### 2. Logger (`src/logger.ts`)

階層的なログ出力システム。特徴：

- 親子関係のあるロガー構造
- VS Code LogOutputChannelへの統合
- ログレベル（trace/debug/info/warn/error）
- コンポーネント別の名前空間

### 3. Linter System (`src/linter/`)

外部リンターツールとの統合を提供：

**BaseLinter**: 全リンターの抽象基底クラス
- 設定の読み込み
- プロセス実行
- 診断情報の生成
- エラーメッセージのパース

**LintManager**: リンターの選択と実行を管理
- ドキュメント保存時の自動リント
- 手動リント実行コマンド
- 複数ファイルタイプのサポート

**個別リンター**:
- IcarusLinter: Icarus Verilog (iverilog)
- VerilatorLinter: Verilator
- ModelsimLinter: ModelSim
- SlangLinter: Slang
- VeribleVerilogLintLinter: Verible Lint
- XvlogLinter: Xilinx xvlog

### 4. Language Servers (`src/languageServer/`)

LSP (Language Server Protocol) クライアントの管理：

**LanguageServerManager**: 複数の言語サーバーを管理
- 同時起動サポート
- 設定の読み込みと適用
- サーバーライフサイクル管理

**定義** (`definitions.ts`): サーバーごとの設定定義
- パス、引数、対応言語
- カスタム初期化オプション

### 5. Ctags Integration (`src/ctags.ts`)

Universal Ctagsを使用したシンボル解析：

**CtagsManager**:
- ドキュメントのシンボル抽出
- シンボルキャッシュ管理
- 非同期実行とタイムアウト

**Symbol クラス**:
- シンボル情報の表現
- VS Code APIへの変換
- 階層構造のサポート

### 6. Providers (`src/providers/`)

VS Code言語機能の実装：

- **DocumentSymbolProvider**: アウトライン表示
- **HoverProvider**: ホバー時の情報表示
- **DefinitionProvider**: 定義ジャンプ
- **CompletionItemProvider**: 自動補完
- **FormatProvider**: コードフォーマット

### 7. Fliplot VCD Viewer (`src/fliplot/`)

VCD波形ファイルのビューア：

- **FliplotPanel**: コマンドから開くパネル
- **FliplotCustomEditor**: .vcdファイルのカスタムエディタ
- Webviewを使用したHTML/JSベースのUI

## データフロー

### リンティングのフロー

```
1. ドキュメント保存イベント
   ↓
2. LintManager.lint() 呼び出し
   ↓
3. 設定から適切なリンターを選択
   ↓
4. BaseLinter.lint() 実行
   ↓
5. 外部ツール実行 (child_process)
   ↓
6. 出力のパース
   ↓
7. DiagnosticCollection に追加
   ↓
8. VS Code が問題パネルに表示
```

### シンボル解析のフロー

```
1. ドキュメント変更イベント
   ↓
2. CtagsManager.index() 呼び出し
   ↓
3. ctagsプロセス実行
   ↓
4. 出力をパースしてSymbolオブジェクト生成
   ↓
5. シンボルキャッシュに保存
   ↓
6. Providers がキャッシュを参照
   ↓
7. VS Code にシンボル情報を提供
```

### 言語サーバーのフロー

```
1. 拡張機能アクティベーション
   ↓
2. LanguageServerManager 初期化
   ↓
3. 有効な言語サーバーを設定から読み込み
   ↓
4. 各サーバーのクライアント起動
   ↓
5. ドキュメントイベントがサーバーに転送
   ↓
6. サーバーからのレスポンスを VS Code に提供
```

## 拡張性

### 新しいリンターの追加

1. `BaseLinter`を継承した新しいクラスを作成
2. `convertToSeverity()`と`lint()`メソッドを実装
3. `LintManager`に登録
4. `package.json`に設定を追加

詳細は [ADDING_FEATURES.md](./ADDING_FEATURES.md) を参照してください。

### 新しい言語サーバーの追加

1. `definitions.ts`にサーバー定義を追加
2. `package.json`に設定を追加
3. `LanguageServerManager`が自動的に処理

### 新しいProviderの追加

1. VS CodeのProvider APIを実装したクラスを作成
2. `extension.ts`で`context.subscriptions.push()`を使用して登録
3. 必要に応じてCtagsManagerやLoggerを利用

## 設計原則

### 1. 関心の分離 (Separation of Concerns)

- 各コンポーネントは明確な責務を持つ
- リンター、言語サーバー、Ctagsは独立して動作
- Providerは疎結合で実装

### 2. 拡張性 (Extensibility)

- 新機能追加時に既存コードへの影響を最小化
- 抽象基底クラス（BaseLinter等）の使用
- 設定駆動の設計

### 3. エラーハンドリング

- 外部プロセスの失敗を適切に処理
- ユーザーフレンドリーなエラーメッセージ
- ロギングによる問題診断のサポート

### 4. パフォーマンス

- 非同期処理の活用
- キャッシュの使用（シンボルキャッシュ等）
- 必要な時のみ外部ツールを実行

## 技術スタック

- **言語**: TypeScript 5.5+
- **ビルドツール**: esbuild (バンドル), tsc (型チェック)
- **テスト**: VS Code Test Framework (Mocha)
- **リント**: ESLint + TypeScript ESLint
- **フォーマット**: Prettier
- **パッケージマネージャー**: npm

## 参考資料

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Universal Ctags](https://github.com/universal-ctags/ctags)
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 貢献ガイド
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発ガイド
