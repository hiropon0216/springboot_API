# springboot_API — 計算 API（Model / DB 連携あり）

Spring Boot の基本を、**最小構成で一通り通す**ための学習用リポジトリ。
題材は「四則演算をして、その履歴を DB に残す API」。1 リソース・1 テーブル・認証なし。

> 変遷: タスク管理 API（Sprint 0〜4）→ 計算 API に作り替え（[ADR 0006](docs/adr/0006-pivot-to-calc-api.md)）
> → Model クラスと DB 連携を組み込み（[ADR 0007](docs/adr/0007-reintroduce-model-and-database.md)）。
> タスク管理 API の実装は git タグ `archive/task-api` で参照できる。

## これで学べること

`/api/v1/calculations` の CRUD に、REST API のコアが全部入っている:

| 概念 | どこ |
|---|---|
| Controller = HTTP の通訳 | [CalculationController](src/main/java/com/example/calc/calculation/CalculationController.java) |
| Service = 業務ロジック ＋ トランザクション境界 | [CalculationService](src/main/java/com/example/calc/calculation/CalculationService.java) |
| **Model クラス（JPA エンティティ）** | [Calculation](src/main/java/com/example/calc/calculation/Calculation.java) |
| **Repository（Spring Data JPA・派生クエリ）** | [CalculationRepository](src/main/java/com/example/calc/calculation/CalculationRepository.java) |
| **Entity → DTO 変換（内部表現を公開しない）** | [CalculationMapper](src/main/java/com/example/calc/calculation/CalculationMapper.java) |
| DTO（`record`、request / response 分離）| [dto/](src/main/java/com/example/calc/calculation/dto/) |
| Bean Validation（`@Valid` / `@NotNull` / `@Digits` / `@Size`）| `CalculationRequest` / `MemoUpdateRequest` |
| **HTTP メソッドとステータス（201 + Location / 204 / 404）** | Controller の javadoc の表 |
| 例外 → RFC 7807 ProblemDetail 一元化（400 / 404 / 422）| [GlobalExceptionHandler](src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java) |
| テスト 4 層（単体 / `@DataJpaTest` / `@WebMvcTest` / context）| [src/test/](src/test/java/com/example/calc/) |
| OpenAPI / Swagger | `@Operation` アノテーション + [OpenApiConfig](src/main/java/com/example/calc/config/OpenApiConfig.java) |
| CORS | [CorsConfig](src/main/java/com/example/calc/config/CorsConfig.java) |
| ArchUnit で層を機械強制（3 層＋エンティティ非公開）| [LayeredArchitectureTest](src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java) |

登場しない（意図的な保留。[docs/spec.md](docs/spec.md) §6 に候補として整理）:
ページング、1 対多のリレーション、Flyway、認証・認可、Testcontainers。

**学習用の実行ログ**: 処理の流れを掴むため、`[1/5 受信] → [2/5 入口] → [3/5 業務] →
[4/5 保存] → [5/5 応答]` という `System.out.printf` が各層に埋め込まれている
（学習用の一時的なもの。実務では SLF4J のロガーを使う）。

## 進め方

`~/git/CLAUDE.md` にハーネス設計があるが、このマシンにハーネスの実体は無い。
Claude が planner / generator / evaluator を会話の中で果たす。詳細は [CLAUDE.md](CLAUDE.md)。
新しいチャットを始めたら [docs/brainstorm.md](docs/brainstorm.md) → [docs/spec.md](docs/spec.md) → この「現在地」を読む。

### 現在地

- [x] タスク管理 API（Sprint 0〜4）完了 → `archive/task-api` タグに保全
- [x] Sprint 5: 題材リビルド（計算 API）— [ADR 0006](docs/adr/0006-pivot-to-calc-api.md)
- [x] **Sprint 6: Model クラスと DB 連携** — [docs/spec.md](docs/spec.md) §6 / [ADR 0007](docs/adr/0007-reintroduce-model-and-database.md)
  - `Calculation` エンティティ + `CalculationRepository`、REST 6 操作（201 / 204 / 404）
  - PostgreSQL 17（Docker Compose）に永続化、テストは H2、`./mvnw verify` グリーン（46 tests）
  - 実 HTTP で全操作・全エラー・再起動後のデータ残存を確認済み

## 開発環境

前提: Java 21 (Temurin) と **Docker**（PostgreSQL 用）。

```bash
# 起動（docker compose up が自動で走り、PostgreSQL が立ち上がる）
./mvnw spring-boot:run
# → http://localhost:8080/actuator/health  /  http://localhost:8080/swagger-ui.html

# ビルド + 全チェック（テスト / Spotless / Checkstyle / ArchUnit）
# テストは H2 なので Docker を起動していなくても通る
./mvnw verify

# フォーマット自動整形
./mvnw spotless:apply

# DB の中身を直接見る
docker compose exec postgres psql -U calc -d calc -c 'select * from calculations;'

# DB をまっさらにする（ボリュームごと削除）
docker compose down -v

# コンテナ
docker build -t calc-api:local .
```

### 叩いてみる

```bash
# 作成 → 201 + Location
curl -i -XPOST http://localhost:8080/api/v1/calculations \
  -H 'Content-Type: application/json' \
  -d '{"left":10,"operator":"DIVIDE","right":3}'
# HTTP/1.1 201
# Location: http://localhost:8080/api/v1/calculations/1
# {"id":1,"left":10,"operator":"DIVIDE","right":3,"result":3.333333333,"memo":null,...}

# 一覧（新しい順）／演算子で絞り込み
curl -s http://localhost:8080/api/v1/calculations
curl -s 'http://localhost:8080/api/v1/calculations?operator=DIVIDE'

# メモだけ部分更新（PATCH）
curl -s -XPATCH http://localhost:8080/api/v1/calculations/1 \
  -H 'Content-Type: application/json' -d '{"memo":"monthly budget"}'

# 式を全置換して再計算（PUT。memo は null に戻る）
curl -s -XPUT http://localhost:8080/api/v1/calculations/1 \
  -H 'Content-Type: application/json' -d '{"left":7,"operator":"MULTIPLY","right":6}'

# 削除 → 204、もう一度で 404
curl -i -XDELETE http://localhost:8080/api/v1/calculations/1

# エラー: 0 除算は 422、存在しない id は 404
curl -s -XPOST http://localhost:8080/api/v1/calculations \
  -H 'Content-Type: application/json' -d '{"left":1,"operator":"DIVIDE","right":0}'
# {"status":422,"title":"計算できません","type":"urn:problem-type:business-rule",...}
curl -s http://localhost:8080/api/v1/calculations/999999
# {"status":404,"title":"見つかりません","type":"urn:problem-type:not-found",...}
```

### 画面から叩く

- **Swagger UI**（`http://localhost:8080/swagger-ui.html`）が 6 操作すべてに対応している。
- ワークスペース直下の [api-console.html](api-console.html)（`.gitignore` 済み）は
  **まだ POST だけ**対応。CRUD 対応は今後の候補（[docs/spec.md](docs/spec.md) §6）。
  `file://` 直開きは CORS で弾かれるので、VS Code 拡張「Live Server」で開く。

## API

`/api/v1` 配下、認証なし。詳細は [docs/spec.md](docs/spec.md) §3。

| メソッド | パス | 成功 | 説明 |
|---|---|---|---|
| GET | `/calculations` | 200 | 履歴一覧（新しい順、`?operator=` で絞り込み）|
| GET | `/calculations/{id}` | 200 | 履歴 1 件 |
| POST | `/calculations` | 201 + `Location` | 計算して履歴に保存 |
| PUT | `/calculations/{id}` | 200 | 式を全置換して再計算（`memo` は消える）|
| PATCH | `/calculations/{id}` | 200 | `memo` だけ部分更新 |
| DELETE | `/calculations/{id}` | 204 | 履歴 1 件を削除 |
| GET | `/actuator/health` | 200 | ヘルスチェック（DB 接続も見る）|
| GET | `/swagger-ui.html` | 200 | Swagger UI |

`operator` は `ADD` / `SUBTRACT` / `MULTIPLY` / `DIVIDE`。
エラーは RFC 7807 `ProblemDetail`。**入力の形が不正 = 400 / 宛先が無い = 404 / 実行できない = 422**。

## デプロイ（Render）

`render.yaml` の Blueprint で Web Service ＋ PostgreSQL を作る。DB の接続情報は
`fromDatabase` で環境変数（`DB_HOST` など）として注入され、`application.yml` の prod
プロファイルが読む。`main` への push で `.github/workflows/ci.yml` の deploy ジョブが
Render のデプロイフックを呼ぶ（`RENDER_DEPLOY_HOOK_URL` を GitHub Secrets に登録した場合）。

## ドキュメント

| パス | 内容 |
|---|---|
| `docs/brainstorm.md` | 設計合意（末尾に計算 API 化・DB 連携の変更記録）|
| `docs/spec.md` | 現行仕様・データモデル・受け入れ基準・Sprint 6 |
| `docs/adr/` | 軽量 ADR（`0001` 進め方 / `0002` 言語・FW / `0004` package-by-feature / `0006` 題材変更 / `0007` Model と DB）|
| `docs/progress.md` | 実装進捗・検証結果・引き渡し事項 |
| `docs/learning/textbook.md` | **解説書**（IT 初心者向け・全 12 章 + 用語集）|
| `docs/learning/curriculum.md` | **学習カリキュラム**（進め方。全 11 モジュール）|
| `docs/learning/sprint-6.md` | Sprint 6 の学習ノート（Model / DB / REST の要点と復習問）|

タスク管理 API 時代の学習ノート・用語集・旧 ADR（0003 PostgreSQL / 0005 MapStruct）は
git タグ `archive/task-api` に残っている。
