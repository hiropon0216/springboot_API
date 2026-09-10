# 実装進捗

## Sprint 5 — 題材リビルド（計算 API）✅ 実装完了（2026-09-11）

タスク管理 API を計算 API に作り替え。合意は [brainstorm.md](brainstorm.md) 2026-09-11 追記 /
[ADR 0006](adr/0006-pivot-to-calc-api.md)。旧実装は git タグ `archive/task-api`（`cfa1efd`）。

### やったこと

| 分類 | 内容 |
|---|---|
| 退避 | `git tag archive/task-api` |
| 削除 | `auth` / `user` / `category` / `task` フィーチャー、`common/audit`、`PageResponse`、`ResourceNotFoundException` / `DuplicateResourceException`、`SecurityConfig` / `JpaAuditingConfig`、`db/`（migration/seed）、`application-prod.yml`、`compose.yaml`、対応テスト一式、`application-h2smoke.yml` |
| パッケージ改名 | `com.example.taskapi` → `com.example.calc`、`TaskapiApplication` → `CalcApiApplication`、artifactId `taskapi` → `calc-api` |
| pom.xml | 撤去: data-jpa / security / oauth2-resource-server / flyway / postgresql / docker-compose / testcontainers / h2 / mapstruct / lombok と対応する `annotationProcessorPaths`。残: webmvc / validation / actuator / springdoc / webmvc-test / validation-test / archunit |
| calculation フィーチャー | `Operator`(enum) / `CalculationRequest` / `CalculationResponse`(record) / `CalculationService`（四則演算 + 0除算ガード + 末尾ゼロ正規化）/ `CalculationController`（`POST /api/v1/calculations`）|
| common | `BusinessRuleException`（→422）＋ `GlobalExceptionHandler`（422 と 400 のみに整理）|
| config | `CorsConfig` を `WebMvcConfigurer#addCorsMappings` 方式に変更（Security 撤去のため）、`OpenApiConfig` から BearerAuth を削除 |
| resources | `application.yml` を actuator + springdoc だけに最小化。prod プロファイルは logging 設定のみ inline |
| テスト | `CalculationServiceTest`（7）/ `CalculationControllerTest`（`@WebMvcTest`、4）/ `CalcApiApplicationTests`（context loads、1）/ `LayeredArchitectureTest`（ArchUnit 3 ルール）。旧 `services_are_transactional` / `repositories_are_interfaces` は対象消滅で削除 |
| infra | `Dockerfile` 維持、`render.yaml` から DB とシークレットを撤去、`ci.yml` の文言更新、`.gitignore` に `/api-console.html` |
| コンソール | `api-console.html` を 1 エンドポイント用に全面刷新（left/operator/right フォーム、health ドット、レスポンス整形、cURL、履歴、テーマ）|
| ドキュメント | `brainstorm` / `spec` / `README` / `CLAUDE.md` / ADR 0006 / 本ファイル。陳腐化した ADR 0003・0005・学習ノート・用語集は削除 |

### 検証結果（実際に動かした）

| 受け入れ基準（spec.md §4）| 結果 |
|---|---|
| 4 演算が正しい `result` を返す | ✅ `curl` で ADD/SUBTRACT/MULTIPLY/DIVIDE 確認（`2+3=5`, `7×6=42` 等）|
| `10/3`→`3.333333333`、`50.0×2`→`100` | ✅ `curl` + `CalculationServiceTest` |
| `0.1 + 0.2` → `0.3`（BigDecimal）| ✅ `curl` 確認 |
| 0 除算で 422（ProblemDetail、`type` 付き）| ✅ `curl` → `{"status":422,"type":"urn:problem-type:business-rule",...}` |
| `operator` 欠落で 400 + `errors.operator` | ✅ `curl` → `{"status":400,"errors":{"operator":"null は許可されていません"}}` |
| `operator:"PLUS"` で 400 | ✅ `curl` → 400 |
| `/actuator/health` = UP、`/swagger-ui.html` 表示 | ✅ health `{"status":"UP"}`、swagger-ui 200、api-docs title "Calc API" |
| `./mvnw verify` グリーン | ✅ **15 tests / 0 failures / 0 skipped**、Checkstyle 0 違反、Spotless clean、ArchUnit 3 pass |
| 別オリジンから CORS で叩ける | ✅ `Origin: http://localhost:5500` のプリフライトに `Access-Control-Allow-*` が返る。許可外オリジンには返らないことも確認 |

### 検証不能・未実施

- Render への実デプロイは未実施（アカウント未設定）。`render.yaml` / `ci.yml` は構成のみ。
- `docker build` は未検証（Docker Desktop がこの環境で起動しないため）。
- `git tag sprint-5` と `docs/learning/sprint-5.md` は未着手（任意）。

### 引き渡し事項

- `main` にコミット・プッシュ済み。`archive/task-api` タグで旧実装を保全。
- タスク管理 API 時代の陳腐化したドキュメントは削除した:
  `docs/adr/0003`（PostgreSQL）、`docs/adr/0005`（MapStruct）、`docs/feedback/sprint-1.md`、
  `docs/learning/sprint-0.md` / `sprint-1.md` / `review-deck.md`、`docs/glossary.md`。
  内容は git 履歴と `archive/task-api` タグに残る。
- ローカル作業ツリーに空ディレクトリ `src/main/java/com/example/taskapi` と
  `src/test/java/com/example/calc/calc` が残存（git 管理外・ビルド無影響。環境が削除コマンドを
  ブロックするため手動 `rmdir` が必要）。
- DB や認証が必要な機能を将来足すなら、`archive/task-api` タグの `category/` 実装と
  当時の `pom.xml` / `SecurityConfig` が参考になる。

---

## Sprint 0〜4 — タスク管理 API（アーカイブ済み）

`User` / `Category` / `Task` の CRUD、JWT 認証・所有者ベース認可、ページング・絞り込み、
MapStruct、PostgreSQL + Flyway、Render デプロイ基盤までを 5 スプリントで実装。

詳細な実装ログ・検証結果・学習ノートは git タグ **`archive/task-api`**（コミット `cfa1efd`）の
`docs/progress.md` / `docs/learning/` を参照。
