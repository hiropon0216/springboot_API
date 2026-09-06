# 壁打ち合意事項 — タスク管理API

- 承認日: 2026-09-06
- 目的: Spring Boot による API の基本を、環境構築からクラウドデプロイまで一気通貫で復習する。
  API 自体の複雑さは重視せず、「基礎を一通り通す」ことと「学んだ知識を蓄積・復習できる状態で残す」ことを重視する。

---

## 1. スコープと題材

- **題材**: タスク管理 API。`Task`(タスク) ＋ `Category`(分類) の 1対多、＋ 認証用の `User`。
  - 「関連を最低1つ持つ」ことを重視して選定（JPA の関連マッピングを学ぶため）。
- **ゴール（= 完成の定義）**: CI（GitHub Actions）＋ クラウドデプロイ（Render）まで到達。
- **UI 設計（claude.ai / input.md）は不要**。純粋な REST API であり、「画面」に相当するのは springdoc が生成する Swagger UI。
  → ハーネスの `/harness-design` は全スプリントで飛ばす。designer エージェントは今回未使用。

---

## 2. アーキテクチャ合意

| 項目 | 決定 |
|---|---|
| 言語 / FW | Java 21 / Spring Boot（**安定最新版を Sprint 0 で確定**。3.5 系か 4.0 系かは着手時に確認し決め打ちしない）/ Maven |
| DB | PostgreSQL 16 + Docker Compose。Flyway でスキーマ管理。`spring-boot-docker-compose` モジュールで `mvnw spring-boot:run` 時に compose 自動起動 |
| パッケージ構成 | package-by-feature（`auth` / `user` / `category` / `task` ＋ 横断の `common` / `config`）|
| レイヤー | 3層（Controller → Service → Repository）。依存方向は一方向 |
| ドメイン | User 1–* Category / User 1–* Task / Category 1–* Task（`Task.category` は NULL 可）|
| ID 戦略 | `Long` + IDENTITY（PostgreSQL 自動採番）|
| ドメインで学ぶ要素 | enum（status / priority / role）、NULL 可 FK、複合ユニーク制約 `UNIQUE(owner_id, name)`、監査カラム（JPA Auditing）、所有者ベース認可（自分のリソースのみ操作可）|
| DTO | Java `record`。リクエスト / レスポンス DTO を分離（`TaskCreateRequest` / `TaskResponse` 等）。変換は手書きマッパー。Sprint 3 で MapStruct を一部導入して比較 |
| Lombok | Entity のみ最小限（`@Getter` / `@Setter` / `@NoArgsConstructor`）。DTO は record |
| 認証 / 認可 | Spring Security + JWT。実装は `spring-boot-starter-oauth2-resource-server`（Spring ネイティブ、フィルタ自作なし）。HMAC 署名、**アクセストークンのみ**。パスワードは BCrypt。role = USER / ADMIN |
| エラー応答 | RFC 7807 `ProblemDetail`（Spring Boot 3 標準）に `@RestControllerAdvice` で統一。`ResourceNotFoundException` / `DuplicateResourceException` 等を定義 |
| API | `/api/v1` 固定。一覧は Spring Data `Page`（既定 `size=20`, `sort=createdAt,desc`）＋ 絞り込みクエリ（`status` / `categoryId` / `dueBefore` 等）|
| 削除 | 物理削除（ソフトデリートはやらない）|
| 初期データ | Flyway の repeatable migration（`R__seed_dev_data.sql`）を local プロファイルのみで適用 |
| CORS | `application.yml` から許可オリジンを設定可能に（既定は無効）|
| API ドキュメント | springdoc-openapi（Swagger UI）|
| 設定 | プロファイル `local` / `test` / `prod`。シークレット（JWT 秘密鍵・DB 認証情報）は環境変数 |
| テスト戦略 | 単体（Service + Mockito）／スライス（`@WebMvcTest`, `@DataJpaTest`）／統合（`@SpringBootTest` + Testcontainers/PostgreSQL）を各層で最低1本。カバレッジは参考値 |
| ガードレール | **ArchUnit** で層の依存方向を強制（例: Controller は Repository を直接呼ばない、entity は controller に import されない）。Spotless / Checkstyle を CI で強制 |
| CI | GitHub Actions で build + test（Testcontainers 込み）|
| CD | Render へ Docker デプロイ（multi-stage Dockerfile）。マネージド PostgreSQL。GitHub 連携で push → デプロイ |

### エンドポイント（初期案）

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login          -> { accessToken }
GET    /api/v1/categories          （自分のもののみ）
POST   /api/v1/categories
GET    /api/v1/categories/{id}
PUT    /api/v1/categories/{id}
DELETE /api/v1/categories/{id}
GET    /api/v1/tasks?status=&categoryId=&dueBefore=&page=&size=&sort=
POST   /api/v1/tasks
GET    /api/v1/tasks/{id}
PATCH  /api/v1/tasks/{id}/status
PUT    /api/v1/tasks/{id}
DELETE /api/v1/tasks/{id}
GET    /actuator/health
```

---

## 3. スプリント計画（骨子。詳細は spec.md で確定）

| # | 名前 | 中身 |
|---|---|---|
| 0 | 環境構築 | Maven 雛形 / Java 21・Spring Boot 安定最新 / docker-compose(PostgreSQL) / Flyway / プロファイル(local,test,prod) / Actuator / springdoc / Dockerfile(multi-stage) / GitHub Actions(build+test) / Spotless・Checkstyle・ArchUnit の土台 / `.claude/settings.json`。動くのは `/actuator/health` のみ |
| 1 | ドメインと CRUD | 3 エンティティ ＋ Flyway マイグレーション、Category CRUD、Task CRUD、Bean Validation、`@RestControllerAdvice` ＋ ProblemDetail、`@DataJpaTest` / `@WebMvcTest` |
| 2 | 認証・認可 | 登録・ログイン、BCrypt、JWT 発行 / 検証、SecurityConfig、エンドポイント保護、所有者ベース認可、認証統合テスト |
| 3 | 一覧の高度化と品質 | ページング・ソート・絞り込み、エラーケース網羅、Testcontainers 統合テスト、MapStruct 比較、OpenAPI 仕上げ |
| 4 | デプロイ | prod プロファイル、シークレット管理、コンテナレジストリ、Render デプロイ、GitHub Actions で CD、スモークテスト |

---

## 4. 学習の蓄積・復習の設計

「コードが動くこと」と「基礎を説明できること」は別物。後者を担保する仕組みを成果物として組み込む。

| 仕組み | 内容 | 所有 |
|---|---|---|
| `docs/learning/sprint-N.md` | ①登場した概念・用語（用語＋1〜2行）②なぜこの技術/パターンを選んだか ③つまずきと解決 ④復習用の問い（5問前後）| スプリント末に作成 |
| **スプリント末の対話レビュー** | Evaluator の検証後、Claude が復習問を出題 → ユーザーが回答 → ズレを learning ノートと `docs/learning/review-deck.md` に蓄積。過去問を後スプリントで再出題する | Claude ⇄ ユーザー |
| `docs/adr/NNNN-*.md` | 軽量 ADR（1 ファイル 1 決定：採用理由・不採用案・トレードオフ）。この壁打ちの決定がそのまま初期 ADR 群になる | 決定発生時 |
| `docs/glossary.md` | 累積用語集（1 行/語）。learning ノートから参照 | 随時追記 |
| コード内注釈 | **写経しやすさを優先し、積極的にコメントを入れる**（なぜ LAZY か、なぜ Service に `@Transactional` か 等）。これを本プロジェクトの明示規約とし、CLAUDE.md と ADR に記載する。共通ルールの「周囲のコードと同じコメント密度」よりプロジェクト規約を優先 | 実装時 |
| Git | スプリントごとに `git tag sprint-N`。概念単位の細粒度コミット。`git diff sprint-0..sprint-1` で「その工程が何を足したか」を差分で復習 | 各スプリント |
| README | 「この順で読むと理解できる」読書ガイド ＋ 起動手順 | 随時 |
| Claude のメモリ | ユーザーの学習ゴールと主要な設計判断を記録（個人リコール用。チーム共有はしない）| — |

---

## 5. チーム × Claude 前提の設計

大人数 × Claude で破綻しないための原則：**共有コンテキストを git に集約し、境界を機械で強制する**。

| 領域 | 決定 |
|---|---|
| CLAUDE.md 階層 | 共通 `~/git/CLAUDE.md`（ハーネス）→ プロジェクト `<repo>/CLAUDE.md`（`/harness-init` で生成、内容をこの設計に沿って練る）→ 機能配下 `.../task/CLAUDE.md`（必要に応じ）|
| プロジェクト CLAUDE.md に書く | 層の依存方向、package-by-feature、命名規約、Definition of Done、テスト実行コマンド、**お手本 feature（`category/`）の指定**、コメント規約、既知の落とし穴。長い解説や lint/CI が強制できることは書かない |
| ゴールデンパス | `category/` を正典の実装例にする。CLAUDE.md に「新しいリソースは `category/` の構成を鏡写しにし、この順でファイルを触る」と明記 |
| skills（`.claude/skills/`、git 配布）| **フル整備**：`add-feature`（お手本複製で controller〜test を雛形生成）/ `add-migration`（Flyway 命名規約に沿ったファイル生成）/ `review-checklist`（プロジェクト固有レビュー観点）/ `contract-check`（実装と OpenAPI の整合確認）|
| agents | 追加しない。planner / designer / generator / evaluator のまま（designer 未使用）。学習ノートは対話レビューで担保する |
| 共有の単一情報源 | CLAUDE.md・docs/・.claude/skills/・.claude/settings.json・ArchUnit テストを git 管理。チャット履歴と個人メモリに知識を溜めない。新セッションは常に git からブートストラップできる状態を保つ |
| メタ ADR | `docs/adr/0001-claude-workflow.md` に「本プロジェクトでの Claude の使い方」を記録 |
| settings.json | 許可コマンド allowlist と、編集後に `spotless:apply` を走らせる hook を git 管理（Sprint 0 で整備）|

---

## 6. 不採用案（検討したが採らなかった）

| 案 | 不採用の理由 |
|---|---|
| ID に UUID(v7) | 分散環境向きだが、マイグレーション・デバッグがやや煩雑。学習の初手は Long + IDENTITY を優先。将来 ADR で再検討可 |
| JWT を jjwt で手組み（`OncePerRequestFilter` 自作）| 仕組みは見えるがコード量が多く落とし穴も増える。Spring ネイティブの `oauth2-resource-server` を採用。手組みは learning ノートで概念だけ補足 |
| リフレッシュトークン | 実務的だが Sprint 2 が重くなる。まずアクセストークンのみで基礎を固める。将来の拡張候補 |
| package-by-layer（`controller/` `service/` `repository/` を最上位）| 機能単位のほうが変更範囲が読みやすい。package-by-feature を採用 |
| H2 インメモリのみ | Docker 不要で最速だが、DB 運用・マイグレーションの実感が薄い。環境構築の学習価値を優先し PostgreSQL + Docker Compose |
| 学習ノート専任の mentor エージェント新設 | 責務分離は明確だがハーネスが増える。対話レビュー方式で代替 |
| コード内注釈を入れず docs に集約 | 写経しやすさを優先し、注釈は積極的に入れる方針を採用 |
| ADR を作らず spec.md / brainstorm.md に集約 | 決定ごとの粒度・履歴が追いにくい。軽量 ADR を採用 |

---

## 7. 未決事項（Sprint 0 で確定する）

- Spring Boot の具体バージョン（安定最新版。3.5 系か 4.0 系か）。あわせて Java 21 で問題ないか（Spring Boot 4.0 系なら Java 17+ / 推奨 21）
- ルートパッケージ名（`com.example.taskapi` 仮）
- Checkstyle / Spotless のルールセット（Google Java Format を軸にするか）
- Render 無料枠の最新仕様（Sprint 4 着手前に再確認。無料 PostgreSQL の保持期間・スリープ挙動）
- Testcontainers を GitHub Actions で動かす際の Docker 環境（標準 runner で可）
