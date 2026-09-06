# spec.md — タスク管理 API 仕様とスプリント計画

- 元にした合意: `docs/brainstorm.md`（2026-09-06 承認）
- planner 役（Claude）が作成。実装は本ドキュメントの受け入れ基準を契約とする。
- 未確定事項は各スプリントの「Sprint 0 で確定」を参照。

---

## 1. ドメインモデル

### User
| カラム | 型 | 制約 |
|---|---|---|
| id | BIGINT | PK, IDENTITY |
| email | VARCHAR(255) | NOT NULL, UNIQUE（ログイン ID）|
| password | VARCHAR(255) | NOT NULL（BCrypt ハッシュ）|
| display_name | VARCHAR(100) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, enum(USER, ADMIN), 既定 USER |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL（JPA Auditing）|

### Category（ユーザーごと）
| カラム | 型 | 制約 |
|---|---|---|
| id | BIGINT | PK, IDENTITY |
| name | VARCHAR(50) | NOT NULL |
| color | VARCHAR(7) | NULL 可（`#RRGGBB`）|
| owner_id | BIGINT | NOT NULL, FK → user(id) |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |
| — | — | **UNIQUE(owner_id, name)** |

### Task
| カラム | 型 | 制約 |
|---|---|---|
| id | BIGINT | PK, IDENTITY |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NULL 可 |
| status | VARCHAR(20) | NOT NULL, enum(TODO, IN_PROGRESS, DONE), 既定 TODO |
| priority | VARCHAR(10) | NULL 可, enum(LOW, MEDIUM, HIGH) |
| due_date | DATE | NULL 可 |
| category_id | BIGINT | NULL 可, FK → category(id) |
| owner_id | BIGINT | NOT NULL, FK → user(id) |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |
| completed_at | TIMESTAMPTZ | NULL 可（status が DONE に遷移した時刻）|

### 関連
- User 1 — * Category（`Category.owner`）
- User 1 — * Task（`Task.owner`）
- Category 1 — * Task（`Task.category`、NULL 可）
- Category 削除時、その Category を参照する Task の `category_id` は NULL にする（タスク自体は消さない）

### 業務ルール
- `status` を DONE にしたとき `completed_at` を現在時刻でセット。DONE から他へ戻したら `completed_at` を NULL に戻す。
- Task に別ユーザーの Category は紐付けられない（指定 Category の owner がリクエストユーザーと一致すること）。

---

## 2. API 一覧

ベースパス `/api/v1`。認証が必要なエンドポイントは `Authorization: Bearer <accessToken>`。

### 認証（認証不要）
| メソッド | パス | 説明 | 成功 |
|---|---|---|---|
| POST | `/auth/register` | ユーザー登録（email, password, displayName）| 201 + UserResponse |
| POST | `/auth/login` | ログイン（email, password）| 200 + `{ accessToken, tokenType, expiresIn }` |

### Category（認証必須・自分のもののみ）
| メソッド | パス | 説明 | 成功 |
|---|---|---|---|
| GET | `/categories` | 一覧（ページングなし、name 昇順）| 200 + CategoryResponse[] |
| POST | `/categories` | 作成（name, color?）| 201 + CategoryResponse |
| GET | `/categories/{id}` | 単一取得 | 200 + CategoryResponse |
| PUT | `/categories/{id}` | 更新（name, color?）| 200 + CategoryResponse |
| DELETE | `/categories/{id}` | 削除（紐づく Task の category は NULL に）| 204 |

### Task（認証必須・自分のもののみ）
| メソッド | パス | 説明 | 成功 |
|---|---|---|---|
| GET | `/tasks` | 一覧。クエリ: `status`, `categoryId`, `dueBefore`(ISO date), `page`, `size`, `sort`。既定 `size=20`, `sort=createdAt,desc` | 200 + Page&lt;TaskResponse&gt; |
| POST | `/tasks` | 作成（title, description?, priority?, dueDate?, categoryId?）| 201 + TaskResponse |
| GET | `/tasks/{id}` | 単一取得 | 200 + TaskResponse |
| PUT | `/tasks/{id}` | 更新（title, description?, priority?, dueDate?, categoryId?）| 200 + TaskResponse |
| PATCH | `/tasks/{id}/status` | ステータス変更（status）| 200 + TaskResponse |
| DELETE | `/tasks/{id}` | 削除 | 204 |

### 運用
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/actuator/health` | ヘルスチェック |
| GET | `/swagger-ui.html` | Swagger UI |
| GET | `/v3/api-docs` | OpenAPI JSON |

### バリデーション（Bean Validation）
- `email`: `@Email` `@NotBlank`
- `password`: `@NotBlank` `@Size(min=8, max=72)`（BCrypt の 72 バイト上限）
- `displayName`: `@NotBlank` `@Size(max=100)`
- `Category.name`: `@NotBlank` `@Size(max=50)`
- `Category.color`: `@Pattern(regexp="^#[0-9A-Fa-f]{6}$")`（null は許容）
- `Task.title`: `@NotBlank` `@Size(max=200)`
- `Task.status` / `priority`: enum に一致

### エラー応答（RFC 7807 ProblemDetail）
| 状況 | HTTP | type / 補足 |
|---|---|---|
| バリデーション違反 | 400 | フィールド別エラーを `errors` に格納 |
| 認証なし・トークン不正 | 401 | — |
| 他人のリソースへアクセス | 404 | 存在秘匿のため 403 ではなく 404 |
| リソース not found | 404 | — |
| Category 名の重複 | 409 | — |
| 不正なステータス遷移など業務違反 | 422 | — |

---

## 3. スプリント計画

### Sprint 0 — 環境構築
**目的**: 空の Spring Boot アプリが PostgreSQL 付きで起動し、CI が回る土台を作る。機能は作らない。

含むもの:
- Maven プロジェクト（Spring Initializr 相当）。依存: Web, Data JPA, Validation, Actuator, PostgreSQL Driver, Flyway, `spring-boot-docker-compose`, springdoc-openapi, Testcontainers, Spring Security（設定は最小）
- `compose.yaml`（PostgreSQL 16）
- `application.yml` ＋ プロファイル `local` / `test` / `prod`（値は環境変数参照）
- Flyway の置き場（`src/main/resources/db/migration/`）だけ用意。マイグレーション本体は Sprint 1 から
- `Dockerfile`（multi-stage: build → 実行イメージ）
- GitHub Actions（`.github/workflows/ci.yml`）: `./mvnw verify`
- Spotless / Checkstyle / ArchUnit の依存とルール雛形（ArchUnit は最初は緩く）
- `.claude/settings.json` を正式化（許可コマンド allowlist、編集後 `spotless:apply` hook）
- README に起動手順

受け入れ基準:
- [ ] `docker compose up -d` で PostgreSQL が起動する
- [ ] `./mvnw spring-boot:run` でアプリが起動し、`GET /actuator/health` が `{"status":"UP"}`
- [ ] `GET /swagger-ui.html` が表示される
- [ ] `./mvnw verify` がローカルでグリーン
- [ ] GitHub Actions の CI が push でグリーン
- [ ] `docker build .` が成功し、生成イメージが起動する

**Sprint 0 で確定した事項**:
- Spring Boot **4.0.8** / Java 21（3.5 系はサポート切れで Initializr 生成不可だったため 4 系へ。[ADR 0002](adr/0002-language-build-framework.md)）
- ルートパッケージ **`com.example.taskapi`**
- フォーマットは Spotless（google-java-format）、規約は Checkstyle 最小構成（`config/checkstyle/checkstyle.xml`）
- ADR: [0001](adr/0001-claude-workflow.md) / [0002](adr/0002-language-build-framework.md) / [0003](adr/0003-postgres-with-docker-compose.md) / [0004](adr/0004-package-by-feature-and-guardrails.md)

学習ポイント: プロジェクト構造、依存管理、プロファイル、Flyway、Docker multi-stage、CI パイプライン、Actuator。

---

### Sprint 1 — ドメインと CRUD（認証なしで先行）
**目的**: User / Category / Task の CRUD をひと通り。認証はまだ入れず、「固定の owner（seed した 1 ユーザー）」前提で実装する。Sprint 2 でリクエストユーザーに差し替える。

含むもの:
- 3 エンティティ ＋ Flyway マイグレーション（`V1__create_user_category_task.sql`。Sprint 0 は migration 0 本）
- JPA Auditing 設定（`@EnableJpaAuditing`、`@CreatedDate` / `@LastModifiedDate`）
- `common`: `ResourceNotFoundException`, `DuplicateResourceException`, `BusinessRuleException`, `GlobalExceptionHandler`（`@RestControllerAdvice` → ProblemDetail）
- Category: entity/repository/dto/mapper/service/controller（**ゴールデンパスのお手本**）
- Task: 同上。ステータス変更 `PATCH /tasks/{id}/status`、`completed_at` の業務ルール
- Bean Validation
- repeatable seed migration（`R__seed_dev_data.sql`、local のみ）: 固定ユーザー 1 名＋サンプル Category/Task
- テスト: Category/Task それぞれ `@DataJpaTest` / service 単体 / `@WebMvcTest` を各 1 本以上

受け入れ基準:
- [ ] 5 種の Category エンドポイントが仕様どおり動く（`curl` で確認）
- [ ] 6 種の Task エンドポイントが仕様どおり動く
- [ ] 存在しない ID で 404、Category 名重複で 409、バリデーション違反で 400（いずれも ProblemDetail 形式）
- [ ] status を DONE にすると `completedAt` が入り、TODO に戻すと消える
- [ ] Category 削除で、紐づく Task の `categoryId` が null になる（Task は残る）
- [ ] `./mvnw verify` グリーン、ArchUnit の層チェックが通る

学習ポイント: エンティティ設計、関連マッピング、`FetchType`、DTO 変換、Bean Validation、例外ハンドリング、ProblemDetail、スライステスト。

---

### Sprint 2 — 認証・認可
**目的**: JWT でエンドポイントを保護し、「自分のリソースだけ」を実現する。

含むもの:
- `V3__*.sql`（必要なら user テーブル調整）
- `auth`: `AuthController`, `AuthService`, `JwtService`（`JwtEncoder` / `JwtDecoder`, HMAC 秘密鍵）
- 登録（BCrypt でハッシュ）、ログイン（照合 → アクセストークン発行、`exp` 15〜60 分）
- `config/SecurityConfig`: `SecurityFilterChain`, `oauth2ResourceServer().jwt()`, `/auth/**` と Swagger と `/actuator/health` は許可、それ以外は認証必須
- リクエストユーザーの解決（`Authentication` → `User`）。Sprint 1 の「固定 owner」を全て差し替え
- 所有者ベース認可: 各 service で `owner == currentUser` を検証。他人のリソースは 404
- `UserDetailsService` 実装 or カスタム。`@AuthenticationPrincipal`
- テスト: 認証フロー統合テスト（登録 → ログイン → トークンで API 呼び出し）、401 / 他人リソース 404、`@WithMockUser` 相当

受け入れ基準:
- [ ] `POST /auth/register` → `POST /auth/login` でアクセストークンが取れる
- [ ] トークンなしで `/tasks` を呼ぶと 401（ProblemDetail）
- [ ] ユーザー A のトークンでユーザー B の Task を GET すると 404
- [ ] 新規作成した Task / Category の owner が常にリクエストユーザーになる
- [ ] パスワードは DB に平文で保存されない（BCrypt）
- [ ] `./mvnw verify` グリーン

学習ポイント: Spring Security のフィルタチェーン、`oauth2-resource-server`、JWT の署名と検証、BCrypt、認可の実装場所、セキュリティのテスト。

---

### Sprint 3 — 一覧の高度化と品質
**目的**: 一覧 API を実用レベルにし、テストピラミッドを一周する。

含むもの:
- `GET /tasks` のページング・ソート・絞り込み（`Pageable`、`status` / `categoryId` / `dueBefore`）。実装は Spring Data のクエリメソッド or `Specification`（両方試して learning ノートに比較）
- `Page` レスポンスの DTO 整形（`content`, `page`, `size`, `totalElements`, `totalPages`）
- エラーケースの網羅（不正な sort キー、範囲外 page、不正な enum 値 → 400）
- Testcontainers 統合テスト（`@SpringBootTest` + 実 PostgreSQL）を主要シナリオで
- MapStruct を Task マッパーだけ導入し、手書きと比較（ADR に記録）
- OpenAPI の仕上げ（`@Operation`, `@ApiResponse`, スキーマ説明、認証の `securityScheme`）
- Checkstyle / ArchUnit ルールを本気の強度に上げる

受け入れ基準:
- [ ] `GET /tasks?status=TODO&categoryId=1&dueBefore=2026-12-31&page=0&size=5&sort=dueDate,asc` が正しく動く
- [ ] 不正な sort キーや enum 値で 400（ProblemDetail）
- [ ] Testcontainers 統合テストが CI で通る
- [ ] Swagger UI 上で「Authorize」してから保護エンドポイントを試せる
- [ ] `./mvnw verify` グリーン、カバレッジを README にバッジ or 数値で記載

学習ポイント: `Pageable`、`Specification`、クエリメソッド、Testcontainers、MapStruct、OpenAPI カスタマイズ。

---

### Sprint 4 — デプロイ
**目的**: Render 上で動く公開 API にし、CD を通す。

含むもの:
- `prod` プロファイルの実値（`DATABASE_URL`, `JWT_SECRET` 等を環境変数から）
- `ddl-auto: validate`、Flyway 本番モード
- Render の Blueprint（`render.yaml`）: Web Service（Docker）＋ Managed PostgreSQL
- GitHub Actions に deploy ジョブ（main へのマージで Render デプロイ or Render の自動デプロイ連携）
- 起動時マイグレーション、ヘルスチェックパス設定
- デプロイ後のスモークテスト（`register` → `login` → `POST /tasks` → `GET /tasks` を公開 URL に対して）
- README にデプロイ手順と公開 URL

受け入れ基準:
- [ ] Render 上でアプリが起動し、`/actuator/health` が `UP`
- [ ] 公開 URL に対してスモークテストが通る
- [ ] main へのマージで自動的に再デプロイされる
- [ ] シークレットがリポジトリに含まれていない（`git secrets` 相当の目視確認 ＋ `.gitignore`）

**Sprint 4 着手前に再確認**: Render 無料枠の仕様（無料 PostgreSQL の保持期間、Web Service のスリープ挙動）。

学習ポイント: プロファイル分離、シークレット管理、コンテナデプロイ、マネージド DB、CD、スモークテスト。

---

### 残る未決（Sprint 4 前に再確認）

- Render 無料枠の最新仕様（無料 PostgreSQL の保持期間・Web Service のスリープ挙動）

## 4. 全スプリント横断の受け入れ基準

各スプリントの完了時、`CLAUDE.md` の Definition of Done を満たすこと。特に:
- 実際に動かして検証した（コードレビューだけで合格にしない）
- `docs/progress.md` と `docs/learning/sprint-N.md` を更新した
- `git tag sprint-N` を打った
