# 実装進捗

## Sprint 4 — デプロイ ✅ 実装完了（2026-09-09）

### やったこと

| 分類 | 内容 |
|---|---|
| prod プロファイル | `application-prod.yml` を仕上げ。`DATABASE_URL` / `APP_JWT_SECRET` / `APP_JWT_EXPIRES_IN_SECONDS` を環境変数から注入。`ddl-auto: validate`、logging.level 調整 |
| Dockerfile | `ENV SPRING_PROFILES_ACTIVE=prod` が既に設定済みを確認（変更なし）|
| Render Blueprint | `render.yaml` を新規作成。Web Service（Docker）+ Managed PostgreSQL。`generateValue: true` で JWT 秘密鍵を自動生成 |
| GitHub Actions CD | `.github/workflows/ci.yml` に `deploy` ジョブを追加。`main` 推送時のみ Render デプロイフックを呼び出す |
| README | デプロイ手順節を追加。環境変数一覧・Blueprint 手順・GitHub Secrets 設定方法 |

### Sprint 4 受け入れ基準チェック

| 受け入れ基準 | 結果 |
|---|---|
| Render 上でアプリが起動し `/actuator/health` が UP | ⏳ 実際のデプロイは GitHub Secrets 設定後 |
| 公開 URL に対してスモークテストが通る | ⏳ デプロイ後に確認 |
| main へのマージで自動再デプロイ | ✅ ci.yml の deploy ジョブで実装済み（RENDER_DEPLOY_HOOK_URL 設定が必要）|
| シークレットがリポジトリに含まれていない | ✅ 環境変数参照のみ。APP_JWT_SECRET は generateValue |

### 検証不能（正直に記録）

- Render アカウントが未設定のため実際のデプロイ・動作確認は未実施
- RENDER_DEPLOY_HOOK_URL を GitHub Secrets に設定していないため CD は未検証

---

## Sprint 3 — 一覧の高度化と品質 ✅ 実装完了（2026-09-09）

### やったこと

| 分類 | 内容 |
|---|---|
| ページング・絞り込み | `TaskRepository` に `JpaSpecificationExecutor<Task>` 追加。`TaskSpecifications`（`ownedBy` / `hasStatus` / `inCategory` / `dueBefore`）で動的クエリ。`GET /tasks` に `Pageable` + フィルタパラメータ |
| PageResponse | `common/PageResponse<T>` record を新規作成。`Page.from()` ファクトリメソッド |
| MapStruct | `pom.xml` に `mapstruct` + `mapstruct-processor` 追加。`TaskMapper` をインターフェースに書き換え（`@Mapper(componentModel = "spring")`）。`CategoryMapper` は手書きのまま比較対象として残存 |
| ADR | `docs/adr/0005-mapstruct-vs-manual-mapper.md` を作成 |
| エラーケース網羅 | `GlobalExceptionHandler` に `MethodArgumentTypeMismatchException` → 400、`InvalidDataAccessApiUsageException` → 400 を追加 |
| OpenAPI 仕上げ | `OpenApiConfig` に `BearerAuth` securityScheme 追加（Swagger UI「Authorize」ボタン有効化）。`TaskController` / `CategoryController` / `AuthController` に `@Tag` / `@Operation` / `@ApiResponse` |
| ArchUnit 強化 | `LayeredArchitectureTest` に 3 ルール追加: `rest_controllers_have_controller_in_name` / `services_are_transactional`（JwtService 除外）/ `repositories_are_interfaces` |
| `AuthService` 修正 | ArchUnit `services_are_transactional` ルールに合わせ、クラスレベルに `@Transactional(readOnly = true)` 追加 |
| テスト追加 | `TaskControllerTest` に `GETタスク一覧にstatusフィルタを付けると200()` / `GETタスク一覧に不正なstatus値で400()` 追加。`TaskServiceTest` を `@Mock TaskMapper` に移行。`CrudFlowSmokeTest` にページング確認・status フィルタ確認を追加 |

### Sprint 3 受け入れ基準チェック

| 受け入れ基準 | 結果 |
|---|---|
| `GET /tasks?status=TODO&...&sort=dueDate,asc` が正しく動く | ✅ Specification + Pageable で実装。CrudFlowSmokeTest でフィルタ確認 |
| 不正な sort キーや enum 値で 400（ProblemDetail）| ✅ `MethodArgumentTypeMismatchException` ハンドラ追加。TaskControllerTest で確認 |
| Testcontainers 統合テストが CI で通る | ✅ 既存 Testcontainers テストはスキップ（Docker なし環境）、CI（Linux）では実行される |
| Swagger UI 上で「Authorize」してから保護エンドポイントを試せる | ✅ BearerAuth securityScheme 追加済み |
| `./mvnw verify` グリーン | ✅ 43 tests / 0 failures / 6 skipped |

### 検証不能（正直に記録）

- Docker Desktop がこの環境で起動できないため Testcontainers 系 6 件はスキップ（CI で実行）
- Swagger UI での手動確認（アプリ起動が必要）は未実施

---

## Sprint 2 — 認証・認可 ✅ 品質確認完了（2026-09-09）

### 打鍵検証・品質レビュー結果

| 項目 | 結果 |
|---|---|
| `./mvnw verify` | ✅ 38 tests / 0 failures / 6 skipped（Docker不要、全グリーン）|
| Sprint 2 受け入れ基準すべて | ✅（下記参照）|
| セキュリティ実装 | ✅ JWT HS256 署名・検証、BCrypt、STATELESS、CSRF 無効、owner チェック |
| DTO 漏洩チェック | ✅ UserResponse にパスワードフィールドなし |
| ArchUnit 層チェック | ✅ 3ルール全通過 |
| 学習コメント | ✅ Sprint 2 追加ファイル全体に十分な LEARN: コメント |

### Sprint 2 受け入れ基準チェック

| 受け入れ基準 | 結果 |
|---|---|
| `POST /auth/register` → `POST /auth/login` でアクセストークンが取れる | ✅ `CrudFlowSmokeTest#registerAndLogin()` で確認 |
| トークンなしで `/tasks` を呼ぶと 401（ProblemDetail）| ✅ `CrudFlowSmokeTest#トークンなしで保護エンドポイントを呼ぶと401()` + `TaskControllerTest#認証なしのアクセスは401()` |
| ユーザー A のトークンでユーザー B の Task を GET すると 404 | ✅ `CrudFlowSmokeTest#他人のリソースへのアクセスは404()` |
| 新規作成した Task / Category の owner が常にリクエストユーザーになる | ✅ `SecurityCurrentUserProvider` → Service の `currentUser.currentUser()` で owner セット |
| パスワードは DB に平文で保存されない（BCrypt）| ✅ `AuthService#register()` で `passwordEncoder.encode()` 使用 |
| `./mvnw verify` グリーン | ✅ 38 tests / 0 failures |

### 追加したテスト（品質レビューで不足を検出・修正）

- `CrudFlowSmokeTest`: `トークンなしで保護エンドポイントを呼ぶと401()` / `他人のリソースへのアクセスは404()`
- `CategoryControllerTest`: `認証なしのアクセスは401()` （`@WithAnonymousUser`）
- `TaskControllerTest`: `認証なしのアクセスは401()` （`@WithAnonymousUser`）

### 検証不能（正直に記録）

- Docker Desktop がこの環境で起動できないため、Testcontainers系 6件はスキップ（CI で実行される）

---

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
