# 実装進捗

## Sprint 1 — ドメインと CRUD ✅ 実装完了（2026-09-08）

### やったこと

| 分類 | 内容 |
|---|---|
| マイグレーション | `V1__create_user_category_task.sql`（users / categories / tasks、複合ユニーク、FK `on delete set null`、インデックス）|
| シード | `db/seed/R__seed_dev_data.sql`（local のみ）: 開発ユーザー `dev@example.com` ＋ サンプル Category/Task |
| 共通基盤 | `common/audit/AuditableEntity`（`@MappedSuperclass` + Auditing）、`config/JpaAuditingConfig`、`common/exception`（`ResourceNotFoundException` / `DuplicateResourceException` / `BusinessRuleException` / `GlobalExceptionHandler` → RFC 7807 ProblemDetail）|
| 現在ユーザー | `user/CurrentUserProvider` インターフェース ＋ `user/FixedCurrentUserProvider`（seed ユーザーを返す暫定実装。Sprint 2 で差し替え）|
| user | `User` / `Role` / `UserRepository`（CRUD API は Sprint 2）|
| category（お手本）| entity / repository / dto(record 3種) / mapper（手書き）/ service / controller。5エンドポイント |
| task | entity（`applyStatus` に completedAt ルール）/ enum 2種 / repository / dto 4種 / mapper / service / controller。6エンドポイント |
| バリデーション | Bean Validation（`@NotBlank` / `@Size` / `@Pattern` / `@NotNull`）|
| テスト | 単体（`TaskStatusTransitionTest`、`CategoryServiceTest`、`TaskServiceTest`）／スライス（`CategoryControllerTest`、`TaskControllerTest` = `@WebMvcTest`）／リポジトリ（`CategoryRepositoryTest`、`TaskCategoryLinkTest` = `@DataJpaTest` + Testcontainers）／全レイヤ疎通（`CrudFlowSmokeTest` = `@SpringBootTest` + H2、Docker 不要）|
| ガードレール調整 | Checkstyle: `ConstantName` を ArchUnit 用に緩和済（Sprint 0）＋ テストの日本語メソッド名を `suppressions.xml` で許可 |
| 依存追加 | `com.h2database:h2`（スモークテスト専用）|

### 検証結果

| 受け入れ基準（spec.md Sprint 1）| 結果 |
|---|---|
| Category 5エンドポイントが仕様どおり動く | ✅ `CrudFlowSmokeTest` で実 HTTP 経由で確認（作成/一覧/取得相当/更新は単体・スライスで、削除は smoke で） |
| Task 6エンドポイントが仕様どおり動く | ✅ 同上（作成・一覧・取得・PATCH status・削除を smoke で通し、更新は controller/service テストで） |
| 404 / 409 / 400（ProblemDetail 形式）| ✅ `CategoryControllerTest` / `TaskControllerTest` / `CrudFlowSmokeTest` |
| status→DONE で completedAt、TODO で消える | ✅ `TaskStatusTransitionTest` / `TaskServiceTest` / `CrudFlowSmokeTest` |
| Category 削除で Task.categoryId が null（Task は残る）| ✅ `CrudFlowSmokeTest`（H2 + `@OnDelete`）で確認。実 PostgreSQL 版は `TaskCategoryLinkTest`（Docker 必要）|
| `./mvnw verify` グリーン、ArchUnit の層チェック | ✅ 34 tests / 0 failures / **6 skipped**（下記）、`LayeredArchitectureTest` pass |

### 検証不能（正直に記録）

- **Docker Desktop がこの環境で起動できず**（GUI プロセスが即終了、`com.docker.service` を非管理者で起動不可）。
  そのため以下は**未実行**（CI では Docker があるので実行される）:
  - `./mvnw spring-boot:run` での手動起動 → `/actuator/health` / Swagger UI の目視（Sprint 0 で同一スタックを確認済み）
  - `@DataJpaTest` + Testcontainers（`CategoryRepositoryTest` 4件、`TaskCategoryLinkTest` 1件）
  - `@SpringBootTest` フルコンテキスト（`TaskapiApplicationTests` 1件）
  - 実 PostgreSQL に対する Flyway `V1` の適用
- これらは `@Testcontainers(disabledWithoutDocker = true)` で **失敗ではなくスキップ**扱い。GitHub Actions（Linux runner、Docker あり）で実行される想定。
- 代替として `CrudFlowSmokeTest`（H2 PostgreSQL 互換モード、Docker 不要）が Controller→Service→Repository→DB を実 HTTP で1本通し、主要シナリオを網羅している。

### 引き渡し事項 / Sprint 2 への注意

- **`SecurityConfig` は全許可のまま。** Sprint 2 で JWT（`oauth2-resource-server`）に置換し、`FixedCurrentUserProvider` を
  `SecurityContext` ベースの実装に差し替える。`CurrentUserProvider` インターフェースを Service が使っているので、
  実装 Bean を1つ入れ替えるだけで済む設計。
- **`db/seed/R__seed_dev_data.sql` の dev ユーザーは password `{noop}...`。** Sprint 2 で BCrypt に。
- `GET /api/v1/tasks` はページング無しの単純リスト。Sprint 3 で `Page` 化。
- Docker が使える環境で一度 `./mvnw verify` を回し、スキップ6件が実行され green になることを確認してほしい。

### 学習ノート

- [docs/learning/sprint-1.md](learning/sprint-1.md) — 概念・詰まった点・復習問
- [docs/learning/review-deck.md](learning/review-deck.md) — Sprint 0 の復習問（未回答）

---

## Sprint 0 — 環境構築 ✅ 完了（2026-09-07）

### やったこと

| 分類 | 内容 |
|---|---|
| プロジェクト雛形 | Spring Initializr で生成（Maven / Java 21 / Spring Boot 4.0.8）。`com.example.taskapi` |
| 依存 | webmvc / data-jpa / validation / security / actuator / flyway(+postgresql) / docker-compose / postgresql driver / lombok / springdoc-openapi 3.1.0 / testcontainers |
| DB | `compose.yaml`（PostgreSQL 16、ホスト側 5433）。`spring-boot-docker-compose` で自動起動 |
| プロファイル | `application.yml`（共通 ＋ local ＋ test）、`application-prod.yml`（環境変数ベース） |
| マイグレーション | `src/main/resources/db/migration/` を用意（本体は Sprint 1 から） |
| 暫定 Security | `config/SecurityConfig` — Sprint 0 は全許可。Sprint 2 で JWT に置換 |
| API ドキュメント | `config/OpenApiConfig`。`/swagger-ui.html`、`/v3/api-docs` |
| フォーマット/規約 | Spotless（google-java-format）、Checkstyle（`config/checkstyle/checkstyle.xml`、最小構成） |
| アーキテクチャ検証 | `LayeredArchitectureTest`（ArchUnit）— 層の依存方向 3 ルール |
| コンテナ | `Dockerfile`（multi-stage、layered jar、非 root）、`.dockerignore` |
| CI | `.github/workflows/ci.yml` — `./mvnw verify` を Temurin 21 で |
| 権限 | `.claude/settings.json` に mvnw/docker/git 等の allowlist |

### 検証結果（実際に動かした）

| 受け入れ基準 | 結果 |
|---|---|
| `docker compose up -d` で PostgreSQL 起動 | ✅ healthy（5433） |
| `./mvnw spring-boot:run` → `GET /actuator/health` = UP | ✅ `{"status":"UP"}` |
| `GET /swagger-ui.html` 表示 | ✅ 302 → `/swagger-ui/index.html` → 200 |
| `GET /v3/api-docs` | ✅ OpenAPI 3.1.0、タイトル "Task Management API" |
| `./mvnw verify` グリーン | ✅ Checkstyle 0 / テスト 4 pass（contextLoads + ArchUnit 3）/ Spotless clean |
| `docker build .` → イメージ起動 | ✅ health UP（prod プロファイル、compose DB に接続） |
| GitHub Actions CI グリーン | ⏳ push 後に確認（ワークフローは標準構成） |

### 引き渡し事項 / 次スプリントへの注意

- **Flyway は現在 migration 0 本。** Sprint 1 の最初のマイグレーションは `V1__create_user_category_task.sql`。
- **`SecurityConfig` は全許可の暫定版。** Sprint 2 で JWT ベースに完全置換する。デフォルトの
  `inMemoryUserDetailsManager`（起動ログにパスワードが出る）もそのとき消える。
- **Docker Desktop 起動が前提。** ローカルで `./mvnw verify`（Testcontainers）を回すには Docker が要る。
- Checkstyle の `violationSeverity=warning` / `failOnViolation=true`。Sprint 3 で強度を上げる予定。
- `spring-boot-docker-compose` は他プロジェクトの 5432 と衝突するため 5433 にずらしてある。
- 未コミットの `.claude/settings.json` は、権限付与のたびにセッションが追記して形が崩れることがある。
  コミット時に整形済みの内容へ戻すこと。

### 学習ノート

- [docs/learning/sprint-0.md](learning/sprint-0.md) — 概念・詰まった点・復習問
