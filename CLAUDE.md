# CLAUDE.md — springboot_API

Spring Boot による API の基本を、環境構築からクラウドデプロイまで一気通貫で復習するプロジェクト。
題材はタスク管理 API（`Task` ＋ `Category` の 1対多、＋ 認証用 `User`）。

## このプロジェクトでの進め方（重要）

`~/git/CLAUDE.md` にハーネス設計（planner/designer/generator/evaluator の各エージェントと `/harness-*` コマンド）が
書かれているが、**このマシンにはハーネスの実体が入っていない**。したがって:

- `/harness-init` `/harness-plan` `/harness-sprint` `/harness-eval` 等のコマンドは**使えない**。
- Claude が planner / generator / evaluator の役割を会話の中で手動で果たす。designer 役は不要（純粋な REST API で UI 設計なし）。
- 成果物の書き込み先はハーネスの規約に合わせる:

| パス | 内容 | 誰が書くか |
|---|---|---|
| `docs/brainstorm.md` | 設計合意・不採用案・未決事項 | 承認済み（変更は承認後）|
| `docs/spec.md` | 機能一覧・スプリント計画・受け入れ基準 | Claude（planner 役）|
| `docs/adr/NNNN-*.md` | 軽量 ADR（1 ファイル 1 決定）| 決定発生時 |
| `docs/progress.md` | 実装進捗・自己評価・引き渡し事項 | Claude（generator 役）|
| `docs/feedback/sprint-N.md` | スプリントの合否とバグ一覧 | Claude（evaluator 役）|
| `docs/learning/sprint-N.md` | 概念・用語・つまずき・復習問 | スプリント末 |
| `docs/learning/review-deck.md` | 復習 Q&A の累積（過去問を再出題）| スプリント末 |
| `docs/glossary.md` | 累積用語集（1 行/語）| 随時 |

作業を始める前に必ず `docs/brainstorm.md` と `docs/spec.md` を読むこと。現在地は `README.md` の「現在地」節。

## プロジェクト種別と検証手段

- 種別: **service**（Spring Boot REST API）
- 検証（モード B: CLI・API 実行 が主）:
  - `docker compose up -d`（または `./mvnw spring-boot:run` で compose 自動起動）でアプリ＋PostgreSQL 起動
  - `./mvnw test` でテスト実行（単体・スライス・Testcontainers 統合）
  - `curl` / Swagger UI（`/swagger-ui.html`）でエンドポイント確認
  - `GET /actuator/health` が `UP`
- **コードを読むだけで合格を出さない。** 実際に動かす。実施できなかった検証は「検証不能」と正直に記録する。

## アーキテクチャ不変条件

これらは CI（ArchUnit / Checkstyle）でも強制する。破る変更は入れない。

1. **層の依存方向は一方向**: Controller → Service → Repository。Controller は Repository を直接呼ばない。
2. **package-by-feature**: `auth` / `user` / `category` / `task` ＋ 横断の `common` / `config`。機能をまたぐ共通処理だけ `common` に置く。
3. **entity をそのまま公開しない**: API の入出力は必ず DTO（Java `record`）。リクエスト用とレスポンス用を分ける。
4. **エラー応答は RFC 7807 `ProblemDetail` に統一**: 例外は `common` のカスタム例外 → `@RestControllerAdvice` で変換。
5. **所有者ベース認可**: ユーザーは自分が所有する Category / Task しか参照・変更・削除できない。
6. **DB スキーマ変更は必ず Flyway マイグレーション**。`ddl-auto` は `validate`（本番）/ `none`。エンティティ直変更で済ませない。

## ゴールデンパス（お手本 feature）

`category/` を正典の実装例とする。**新しいリソースを追加するときは `category/` の構成を鏡写しにする**。
ファイルを触る順序:

1. `docs/spec.md` に受け入れ基準を追記（planner 役）
2. Flyway マイグレーション（`db/migration/V__*.sql`）
3. entity → repository → dto（request/response）→ mapper → service → controller
4. テスト: `@DataJpaTest`（repository）→ 単体（service + Mockito）→ `@WebMvcTest`（controller）→ 統合（`@SpringBootTest` + Testcontainers）
5. OpenAPI アノテーション確認、`docs/progress.md` 更新

## コーディング規約

- **学習用コメントを積極的に入れる**（写経しやすさ優先）。非自明な箇所には `// LEARN: なぜこうするか` を付ける
  （例: `FetchType.LAZY` の理由、`@Transactional` の境界、`@Validated` の位置）。
  → これは本プロジェクトの明示規約であり、`~/git/CLAUDE.md` の「周囲のコードと同じコメント密度で書く」より**優先**する。
- Lombok は entity のみ最小限（`@Getter` / `@Setter` / `@NoArgsConstructor`）。DTO は `record`。
- フォーマットは Spotless（Google Java Format 想定、Sprint 0 で確定）。コミット前に `./mvnw spotless:apply`。
- 命名: Controller は `XxxController`、Service は `XxxService`、Repository は `XxxRepository`、
  DTO は `XxxCreateRequest` / `XxxUpdateRequest` / `XxxResponse`、マッパーは `XxxMapper`。
- API パスは `/api/v1/...`。複数形リソース名（`/tasks`, `/categories`）。

## Definition of Done（各スプリント共通）

- [ ] 受け入れ基準（`docs/spec.md` の該当スプリント）を全て満たす
- [ ] `./mvnw verify` がグリーン（テスト＋Checkstyle＋Spotless＋ArchUnit）
- [ ] 新規/変更エンドポイントを実際に叩いて確認した（`curl` か Swagger UI）
- [ ] `docs/progress.md` を更新した
- [ ] `docs/learning/sprint-N.md` を書き、復習問に答えた
- [ ] 破壊的変更や未解決の課題を「引き渡し事項」に明記した
- [ ] `git tag sprint-N` を打った

## 主要な設計判断（詳細は docs/brainstorm.md、理由は docs/adr/）

- Java 21 / Spring Boot 安定最新（Sprint 0 で確定）/ Maven
- PostgreSQL 16 + Docker Compose、Flyway、`spring-boot-docker-compose`
- Spring Security + JWT（`oauth2-resource-server`、HMAC 署名、アクセストークンのみ）
- ID は `Long` + IDENTITY
- CI: GitHub Actions（build + test）/ CD: Render へ Docker デプロイ
