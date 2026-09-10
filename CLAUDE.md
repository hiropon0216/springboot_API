# CLAUDE.md — springboot_API（計算 API）

Spring Boot による API の基本を、**最小構成で一通り復習する**プロジェクト。
題材は四則演算 API（`POST /api/v1/calculations` の 1 本のみ。DB・認証なし）。

> 以前はタスク管理 API だった。2026-09-11 に計算 API へ作り替えた（[docs/adr/0006-pivot-to-calc-api.md](docs/adr/0006-pivot-to-calc-api.md)）。
> 旧実装は git タグ `archive/task-api`（コミット `cfa1efd`）。

## このプロジェクトでの進め方（重要）

`~/git/CLAUDE.md` にハーネス設計（planner/designer/generator/evaluator と `/harness-*` コマンド）が
書かれているが、**このマシンにハーネスの実体は入っていない**。したがって:

- `/harness-*` コマンドは**使えない**。Claude が planner / generator / evaluator を会話の中で果たす。
- 成果物の書き込み先はハーネスの規約に合わせる:

| パス | 内容 | 誰が書くか |
|---|---|---|
| `docs/brainstorm.md` | 設計合意・不採用案・未決事項 | 承認済み（変更は承認後）|
| `docs/spec.md` | 機能一覧・受け入れ基準・スプリント | Claude（planner 役）|
| `docs/adr/NNNN-*.md` | 軽量 ADR（1 ファイル 1 決定）| 決定発生時 |
| `docs/progress.md` | 実装進捗・自己評価・引き渡し事項 | Claude（generator 役）|
| `docs/feedback/sprint-N.md` | スプリントの合否とバグ一覧 | Claude（evaluator 役）|
| `docs/learning/sprint-N.md` | 概念・用語・つまずき・復習問 | スプリント末 |

作業を始める前に必ず `docs/brainstorm.md` と `docs/spec.md` を読むこと。現在地は `README.md` の「現在地」節。

## プロジェクト種別と検証手段

- 種別: **service**（Spring Boot REST API）
- **Docker 不要**（DB を持たない）。
- 検証（モード B: CLI・API 実行 が主）:
  - `./mvnw spring-boot:run` でアプリ起動
  - `./mvnw verify` でテスト（単体・`@WebMvcTest` スライス・context 起動）+ Spotless + Checkstyle + ArchUnit
  - `curl` / Swagger UI（`/swagger-ui.html`）でエンドポイント確認
  - `GET /actuator/health` が `UP`
- **コードを読むだけで合格を出さない。** 実際に動かす。実施できなかった検証は「検証不能」と正直に記録する。

## アーキテクチャ不変条件

CI（ArchUnit / Checkstyle / Spotless）でも強制する。破る変更は入れない。

1. **層の依存方向は一方向**: Controller → Service。Service は Controller を参照しない
   （このアプリに Repository は無い。DB が要る機能を足すなら Service → Repository を追加）。
2. **package-by-feature**: フィーチャー（現状 `calculation`）＋ 横断の `common` / `config`。
   機能をまたぐ共通処理だけ `common` に置く。
3. **内部表現をそのまま公開しない**: API の入出力は必ず Java `record` の DTO。
   リクエスト用（`XxxRequest`）とレスポンス用（`XxxResponse`）を分ける。
4. **エラー応答は RFC 7807 `ProblemDetail` に統一**: `common/exception` のカスタム例外を投げ、
   `@RestControllerAdvice`（`GlobalExceptionHandler`）で変換。Controller / Service は
   ステータスコードや JSON を組み立てない。

## ゴールデンパス（お手本 feature）

`calculation/` が唯一の実装例。**新しいリソースを足すときはこの構成を鏡写しにする**。
ファイルを触る順序:

1. `docs/spec.md` に受け入れ基準を追記（planner 役）
2. enum / dto（request/response）→ service → controller
3. テスト: 単体（service を `new` して）→ `@WebMvcTest`（controller、service は `@MockitoBean`）
4. OpenAPI アノテーション確認、`docs/progress.md` 更新

DB が必要な機能なら 2 の前に「マイグレーション → entity → repository」を足し、
そのとき不変条件 #1 に Repository 層を、依存に `spring-boot-starter-data-jpa` を戻す。

## コーディング規約

- **学習用コメントを積極的に入れる**（写経しやすさ優先）。非自明な箇所には `// LEARN: なぜこうするか` を付ける。
  → 本プロジェクトの明示規約であり、`~/git/CLAUDE.md` の「周囲と同じコメント密度」より**優先**する。
- DTO は `record`。Lombok は使わない（entity が無いので不要）。
- フォーマットは Spotless（google-java-format）。コミット前に `./mvnw spotless:apply`。
- 命名: Controller は `XxxController`、Service は `XxxService`、
  DTO は `XxxRequest` / `XxxResponse`。API パスは `/api/v1/...`、複数形リソース名。

## Definition of Done（各スプリント共通）

- [ ] 受け入れ基準（`docs/spec.md` の該当スプリント）を全て満たす
- [ ] `./mvnw verify` がグリーン（テスト＋Checkstyle＋Spotless＋ArchUnit）
- [ ] 新規/変更エンドポイントを実際に叩いて確認した（`curl` か Swagger UI か `api-console.html`）
- [ ] `docs/progress.md` を更新した
- [ ] `docs/learning/sprint-N.md` を書き、復習問に答えた
- [ ] 破壊的変更や未解決の課題を「引き渡し事項」に明記した
- [ ] `git tag sprint-N` を打った

## 主要な設計判断（詳細は docs/brainstorm.md、理由は docs/adr/）

- Java 21 / Spring Boot 4.0.8 / Maven（[ADR 0002](docs/adr/0002-language-build-framework.md)）
- 題材は計算 API。永続化・認証なし（[ADR 0006](docs/adr/0006-pivot-to-calc-api.md)）
- 依存: webmvc / validation / actuator / springdoc-openapi ＋ テスト（webmvc-test / archunit）
- CI: GitHub Actions（`./mvnw verify`）/ CD: Render へ Docker デプロイ（Web Service のみ）
- CORS は `WebMvcConfigurer`（Security が無いので MVC 層で完結）
