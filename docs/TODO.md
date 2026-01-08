# 既知の課題と改善項目 / Known Issues and Improvements

このドキュメントは、コードベースに残っているTODO/FIXMEコメントと、それらに関連する改善提案をまとめています。

## コード内のTODO項目

### 1. SlangLinter のリファクタリング

**場所**: `src/linter/SlangLinter.ts`

**現状**: コードにリファクタリングが必要というコメントがある

**提案**:
- エラーパース処理を共通化
- 設定読み込みロジックを整理
- テストカバレッジを向上

**優先度**: 中

### 2. Ctags の Promise.race 実装

**場所**: `src/ctags.ts`

**現状**: タイムアウト処理にPromise.raceの使用が提案されている

**提案**:
```typescript
// 現在: 手動タイムアウト処理
// 改善案: Promise.race を使用
const result = await Promise.race([
  ctagsProcess,
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]);
```

**優先度**: 低

**関連Issue**: なし（作成推奨）

### 3. Language Server の svls 設定分離

**場所**: `src/languageServer/definitions.ts`

**現状**: svls固有の設定がハードコードされている

**提案**:
- svls拡張機能として設定を分離
- より柔軟な設定システムに移行
- 他の言語サーバーとの一貫性を保つ

**優先度**: 中

### 4. HoverProvider の機能拡張

**場所**: `src/providers/HoverProvider.ts`

**現状**: 基本的なホバー実装のみ

**提案**:
- シンボルの詳細情報を表示
- ドキュメントコメントのサポート
- 型情報の表示
- 使用例の提供

**優先度**: 中

**参考**: VS Code の [Hover Provider API](https://code.visualstudio.com/api/language-extensions/programmatic-language-features#show-hovers)

### 5. DocumentSymbolProvider の階層構造サポート

**場所**: `src/providers/DocumentSymbolProvider.ts`

**現状**: シンボルの親子関係が完全には反映されていない

**提案**:
- `Symbol`クラスの`parentScope`と`parentType`を活用
- 階層的な`vscode.DocumentSymbol[]`を構築
- アウトラインビューでのネスト表示を実現

**実装例**:
```typescript
function buildHierarchy(symbols: Symbol[]): vscode.DocumentSymbol[] {
  const roots: vscode.DocumentSymbol[] = [];
  const map = new Map<string, vscode.DocumentSymbol>();
  
  // First pass: create all DocumentSymbols
  for (const symbol of symbols) {
    const docSymbol = symbol.getDocumentSymbol();
    map.set(symbol.name, docSymbol);
  }
  
  // Second pass: build hierarchy
  for (const symbol of symbols) {
    const docSymbol = map.get(symbol.name);
    if (!docSymbol) continue;
    
    if (symbol.parentScope) {
      const parent = map.get(symbol.parentScope);
      if (parent) {
        parent.children.push(docSymbol);
        continue;
      }
    }
    roots.push(docSymbol);
  }
  
  return roots;
}
```

**優先度**: 高

### 6. CompletionItemProvider のコンテキスト対応

**場所**: `src/providers/CompletionItemProvider.ts`

**現状**: 基本的な補完のみ

**提案**:
- コンテキストに応じた補完候補
- モジュールインスタンス化時のポート名補完
- パラメータ名の補完
- SystemVerilogキーワードの補完
- スニペットの統合

**優先度**: 高

**参考**: [Completion Item Provider API](https://code.visualstudio.com/api/language-extensions/programmatic-language-features#show-code-completion-proposals)

## 全般的な改善提案

### コード品質

1. **型安全性の向上**
   - `any`型の使用を削減
   - より厳密な型定義
   - ジェネリクスの活用

2. **エラーハンドリングの標準化**
   - 統一的なエラー処理パターン
   - ユーザーフレンドリーなエラーメッセージ
   - エラーリカバリー機能

3. **テストカバレッジの向上**
   - 各リンターの包括的なテスト
   - エッジケースのテスト
   - 統合テストの追加

### パフォーマンス

1. **キャッシング戦略**
   - シンボルキャッシュの最適化
   - 設定変更時の差分更新
   - 不要な再解析の削減

2. **非同期処理の改善**
   - より効率的な並列処理
   - リソース使用量の最適化

### 開発者エクスペリエンス

1. **ドキュメント**
   - ✅ アーキテクチャドキュメント
   - ✅ 開発ガイド
   - ✅ 新機能追加ガイド
   - API リファレンス（将来的に）

2. **ツール**
   - デバッグツールの改善
   - プロファイリングツールの統合
   - 開発用スクリプトの追加

## 優先度の定義

- **高**: ユーザー体験に大きく影響する機能
- **中**: 改善が望ましいが、現状でも動作する
- **低**: ニーズがあれば実装

## コントリビューションの機会

これらの項目は、コミュニティからのコントリビューションを歓迎します：

1. **初心者向け**:
   - ドキュメントの改善
   - テストの追加
   - 軽微なリファクタリング

2. **中級者向け**:
   - 新しいリンターの追加
   - Providerの機能拡張
   - パフォーマンス改善

3. **上級者向け**:
   - 言語サーバーの統合
   - 大規模なリファクタリング
   - アーキテクチャの改善

## Issue の作成

これらの項目に取り組みたい場合は、[GitHub Issues](https://github.com/mshr-h/vscode-verilog-hdl-support/issues) で以下の情報を含めて新しいIssueを作成してください：

- 取り組みたい項目の説明
- 実装アプローチ
- 必要に応じて設計案
- タイムライン（可能であれば）

## 参考資料

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
