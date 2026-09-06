# springboot_API

Spring Boot による API の基本を、**環境構築からクラウドデプロイまで一気通貫**で復習するリポジトリ。
題材はタスク管理 API（`Task` ＋ `Category` の 1対多、＋ 認証用 `User`）。

## 進め方

`~/git/CLAUDE.md` にハーネス設計が書かれているが、**このマシンにハーネスの実体（agents / `/harness-*` コマンド）は入っていない**。
そのため Claude が planner / generator / evaluator の役割を会話の中で手動で果たす。詳細は [CLAUDE.md](CLAUDE.md)。

```
壁打ち → 仕様(spec.md) → スプリント実装 + progress.md → 検証 + feedback/sprint-N.md
(合意)                      ↑_______________________________________|
                            不合格なら修正から（同一スプリント差し戻しは3回まで）
```

- UI 設計は不要 — 純粋な REST API で、画面に相当するのは Swagger UI。
- 新しいチャットを始めたら、まず `docs/brainstorm.md` → `docs/spec.md` → この「現在地」を読む。

### 現在地

- [x] 壁打ち完了 — [docs/brainstorm.md](docs/brainstorm.md)（2026-09-06 承認）
- [x] プロジェクト `CLAUDE.md` 作成 — 規約・不変条件・ゴールデンパス
- [x] 仕様・スプリント計画 — [docs/spec.md](docs/spec.md)
- [x] **Sprint 0: 環境構築** — [docs/progress.md](docs/progress.md) / [docs/learning/sprint-0.md](docs/learning/sprint-0.md)
- [ ] **Sprint 1: ドメインと CRUD**（← 次はここ）
- [ ] Sprint 2: 認証・認可
- [ ] Sprint 3: 一覧の高度化と品質
- [ ] Sprint 4: デプロイ

## 開発環境

前提: Java 21 (Temurin)、Docker Desktop。

```bash
# 起動（compose の PostgreSQL は spring-boot-docker-compose が自動起動）
./mvnw spring-boot:run
# → http://localhost:8080/actuator/health  /  http://localhost:8080/swagger-ui.html

# ビルド + 全チェック（テスト / Spotless / Checkstyle / ArchUnit）
./mvnw verify

# フォーマット自動整形
./mvnw spotless:apply

# コンテナ
docker build -t taskapi:local .
```

- DB は `compose.yaml`（PostgreSQL 16、ホスト側ポート **5433**）。直接つなぐ: `psql -h localhost -p 5433 -U taskapi -d taskapi`
- スタック: Java 21 / Spring Boot 4.0.8 / Maven（バージョン経緯は [ADR 0002](docs/adr/0002-language-build-framework.md)）

## ドキュメント

| パス | 内容 |
|---|---|
| `docs/brainstorm.md` | 設計合意・不採用案・未決事項 |
| `docs/spec.md` | 機能一覧・スプリント計画・受け入れ基準 |
| `docs/adr/` | 軽量 ADR（1 ファイル 1 決定）|
| `docs/learning/` | スプリントごとの学習ノート・用語・復習問 |
| `docs/progress.md` | 実装進捗（Claude が generator 役で更新）|
| `docs/feedback/` | スプリントの合否とバグ一覧（Claude が evaluator 役で作成）|
