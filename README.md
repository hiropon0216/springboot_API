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
- [x] **Sprint 1: ドメインと CRUD** — User/Category/Task、CRUD、ProblemDetail、テスト一式。[feedback](docs/feedback/sprint-1.md) / [learning](docs/learning/sprint-1.md)
- [x] **Sprint 2: 認証・認可** — JWT HS256、BCrypt、所有者ベース認可。[progress](docs/progress.md)
- [x] **Sprint 3: 一覧の高度化と品質** — ページング・絞り込み、MapStruct、OpenAPI 仕上げ、ArchUnit 強化。
- [x] **Sprint 4: デプロイ** — prod プロファイル、render.yaml、GitHub Actions CD

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
| `docs/learning/` | スプリントごとの学習ノート・用語・復習問（`review-deck.md` は復習 Q&A の累積）|
| `docs/glossary.md` | 累積用語集 |
| `docs/progress.md` | 実装進捗（Claude が generator 役で更新）|
| `docs/feedback/` | スプリントの合否とバグ一覧（Claude が evaluator 役で作成）|

## API（Sprint 3 時点、認証必須）

`/api/v1` 配下。`Authorization: Bearer <token>` が必要（`/auth/**` 除く）。

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/auth/register` | ユーザー登録 |
| POST | `/auth/login` | ログイン → JWT 発行 |
| GET / POST | `/categories` | 一覧 / 作成 |
| GET / PUT / DELETE | `/categories/{id}` | 取得 / 更新 / 削除 |
| GET | `/tasks` | 一覧（`?status=TODO&categoryId=1&dueBefore=2026-12-31&page=0&size=20&sort=createdAt,desc`）|
| POST | `/tasks` | 作成 |
| GET / PUT / DELETE | `/tasks/{id}` | 取得 / 更新 / 削除 |
| PATCH | `/tasks/{id}/status` | ステータス変更（DONE で completedAt 記録）|
| GET | `/actuator/health` | ヘルスチェック |
| GET | `/swagger-ui.html` | Swagger UI（「Authorize」ボタンで JWT 入力可）|

エラーは RFC 7807 `ProblemDetail`。バリデーション 400 / 認証なし 401 / not found 404 / 名前重複 409 / 業務ルール違反 422。

## デプロイ手順（Render）

### 必要な環境変数

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 接続 URL（Render が自動設定）|
| `DATABASE_USERNAME` | DB ユーザー名（省略可）|
| `DATABASE_PASSWORD` | DB パスワード（省略可）|
| `APP_JWT_SECRET` | JWT 署名鍵（256 bit 以上のランダム文字列）|
| `APP_JWT_EXPIRES_IN_SECONDS` | トークン有効期限（秒）、省略時 3600 |
| `SPRING_PROFILES_ACTIVE` | `prod` 固定 |

### Render Blueprint デプロイ手順

1. Render ダッシュボード → "New" → "Blueprint"
2. このリポジトリを接続
3. `render.yaml` が自動検出され、Web Service + Managed PostgreSQL が作成される
4. `APP_JWT_SECRET` は `generateValue: true` で自動生成される

### GitHub Actions 自動デプロイ設定

`main` へのマージで自動デプロイするには Render のデプロイフックを設定：

1. Render ダッシュボード → サービス → Settings → "Deploy Hook" で URL を取得
2. GitHub リポジトリ → Settings → Secrets and variables → Actions
3. `RENDER_DEPLOY_HOOK_URL` に取得した URL を登録
4. 以降は `main` への push/マージで自動デプロイされる
