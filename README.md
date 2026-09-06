# springboot_API

Spring Boot による API の基本を、**環境構築からクラウドデプロイまで一気通貫**で復習するリポジトリ。
題材はタスク管理 API（`Task` ＋ `Category` の 1対多、＋ 認証用 `User`）。

## 進め方

開発は `~/git/CLAUDE.md` のハーネス設計に沿う。

```
壁打ち → /harness-init → /harness-plan → /harness-sprint → /harness-eval
(合意)   (足場作り)      (spec.md)       (1スプリント実装)   (検証)
                                            ↑__________________|
                                            不合格なら修正から
```

- UI 設計（`/harness-design`）は不要 — 純粋な REST API で、画面に相当するのは Swagger UI。
- 迷ったら `/harness-status` で現在地を確認。

### 現在地

- [x] 壁打ち完了 — `docs/brainstorm.md`（2026-09-06 承認）
- [ ] `/harness-init` — プロジェクト種別判定と足場作り、プロジェクト固有 `CLAUDE.md` の作成
- [ ] `/harness-plan` — `docs/spec.md`（機能一覧・スプリント計画・受け入れ基準）
- [ ] Sprint 0: 環境構築 → Sprint 1: ドメインと CRUD → Sprint 2: 認証・認可 → Sprint 3: 一覧の高度化と品質 → Sprint 4: デプロイ

## ドキュメント

| パス | 内容 |
|---|---|
| `docs/brainstorm.md` | 設計合意・不採用案・未決事項 |
| `docs/spec.md` | 機能一覧・スプリント計画・受け入れ基準（`/harness-plan` で作成）|
| `docs/adr/` | 軽量 ADR（1 ファイル 1 決定）|
| `docs/learning/` | スプリントごとの学習ノート・用語・復習問 |
| `docs/progress.md` | 実装進捗（Generator が作成）|
| `docs/feedback/` | スプリントの合否とバグ一覧（Evaluator が作成）|
