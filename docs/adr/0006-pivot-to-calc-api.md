# ADR 0006 — 題材をタスク管理 API から計算 API に変更

- ステータス: 承認済み（2026-09-11）
- 関連: [0002](0002-language-build-framework.md)（スタックは維持）、[0004](0004-package-by-feature-and-guardrails.md)（層・命名規約は維持）

## 背景

Sprint 0〜4 でタスク管理 API（`User` / `Category` / `Task`、JWT 認証、所有者ベース認可、
ページング、Flyway、Render デプロイ）を一通り実装した。

学習を再開するにあたり、利用者から次の指摘があった。

- タスク管理 API は「何をしたいのか」が伝わりにくく、`Task` / `Category` / `status` を見ても
  用途がイメージできない。
- AI 駆動開発が主流になる中で、フレームワーク内部の詳細を追うより、
  **少数のコア概念を確実に説明できる**ことが重要。現状は題材が大きすぎて概念が埋もれる。
- 学習の足場としては、機能は 1 つ、DB も認証も無い、極小の API で十分。

## 決定

題材を **四則演算をするだけの計算 API** に作り替える。

- エンドポイントは 1 本: `POST /api/v1/calculations`
  （`{ left, operator, right }` → `{ left, operator, right, result }`）
- 業務ルールは 1 つ: 0 除算は 422（`BusinessRuleException` → `ProblemDetail`）
- 入力不足・不正な operator は 400
- 永続化なし・認証なし・状態なし（純粋な計算）

### 維持するもの

- スタック: Java 21 / Spring Boot 4.0.8 / Maven
- 層: Controller → Service の一方向（Repository は無い）
- package-by-feature（`calculation` フィーチャー ＋ 横断の `common` / `config`）
- DTO は Java `record`、request / response を分ける
- エラーは RFC 7807 `ProblemDetail` に一元化
- Spotless / Checkstyle / ArchUnit / GitHub Actions / Dockerfile / Render Blueprint
- 学習用コメント規約（`// LEARN:`）

### 撤去するもの

- `auth` / `user` / `category` / `task` フィーチャー
- Spring Security、`oauth2-resource-server`、JWT、BCrypt
- Spring Data JPA、Hibernate、エンティティ、Repository
- PostgreSQL、Docker Compose、Flyway、Testcontainers、H2
- 対応する依存・設定・テスト・マイグレーション・シード

### パッケージ名

ルートパッケージを `com.example.taskapi` → `com.example.calc` に変更（`CalcApiApplication`）。
残るファイルが 10 個程度なので、題材と齟齬のある名前を引きずらない。
artifactId も `taskapi` → `calc-api`。

## 影響

- アーキテクチャ不変条件のうち **#5 所有者ベース認可** と **#6 Flyway** は対象が無くなるため削除。
  残りの #1〜#4 は維持。
- Sprint 0〜4 の成果は git 履歴に残る。タグ `archive/task-api`（コミット `cfa1efd`）で参照可能。
- `docs/learning/sprint-0〜1.md`、`docs/adr/0003`（PostgreSQL）、`glossary.md` の一部は
  もう現行コードに対応しないが、学習記録として残す。

## 不採用案

| 案 | 不採用の理由 |
|---|---|
| タスク管理のまま命名・ドキュメントだけ改善 | 題材の分かりにくさが本質。表面的な改善では解決しない |
| 読書ログ / 映画リスト等の別ドメインへ差し替え | 1対多・認証・DB を残すと結局同じ規模。学習の足場としては重い |
| タスク API を残し計算 API を追加 | 利用者が「機能は 1 つでいい」と明言。二本立ては焦点がぼける |
| 別リポジトリで新規プロジェクト | 既存の CI / Docker / lint 資産を再利用できるので同一リポジトリで作り替え |
