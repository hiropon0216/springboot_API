# 実装進捗

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
