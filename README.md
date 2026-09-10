# springboot_API — 計算 API

Spring Boot の基本を、**最小構成で一通り通す**ための学習用リポジトリ。
題材は「四則演算をするだけの API」。エンドポイントは 1 本、DB も認証も無い。

> 以前はタスク管理 API（`User` / `Category` / `Task`、JWT 認証、PostgreSQL、Render デプロイ）だった。
> 学習の足場としては大きすぎたため計算 API に作り替えた（[ADR 0006](docs/adr/0006-pivot-to-calc-api.md)）。
> 旧実装は git タグ `archive/task-api` で参照できる。

## これで学べること

`POST /api/v1/calculations` の 1 本に、Spring Boot API のコアが全部入っている:

| 概念 | どこ |
|---|---|
| Controller = HTTP の通訳 | [CalculationController](src/main/java/com/example/calc/calculation/CalculationController.java) |
| Service = 業務ロジック | [CalculationService](src/main/java/com/example/calc/calculation/CalculationService.java) |
| DTO（`record`、request/response 分離）| [dto/](src/main/java/com/example/calc/calculation/dto/) |
| Bean Validation（`@Valid` / `@NotNull`）| `CalculationRequest` + Controller |
| 例外 → RFC 7807 ProblemDetail 一元化 | [GlobalExceptionHandler](src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java) |
| テスト（単体 / `@WebMvcTest` / context）| [src/test/](src/test/java/com/example/calc/) |
| OpenAPI / Swagger | `@Operation` アノテーション + [OpenApiConfig](src/main/java/com/example/calc/config/OpenApiConfig.java) |
| CORS | [CorsConfig](src/main/java/com/example/calc/config/CorsConfig.java) |
| ArchUnit で層を機械強制 | [LayeredArchitectureTest](src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java) |

登場しない: DB、JPA、Repository、認証、認可、ページング、マイグレーション。
「すべての API が DB や認証を必要とするわけではない」ということ自体が学びになる。

## 進め方

`~/git/CLAUDE.md` にハーネス設計があるが、このマシンにハーネスの実体は無い。
Claude が planner / generator / evaluator を会話の中で果たす。詳細は [CLAUDE.md](CLAUDE.md)。
新しいチャットを始めたら [docs/brainstorm.md](docs/brainstorm.md) → [docs/spec.md](docs/spec.md) → この「現在地」を読む。

### 現在地

- [x] タスク管理 API（Sprint 0〜4）完了 → `archive/task-api` タグに保全
- [x] **Sprint 5: 題材リビルド（計算 API）** — [docs/spec.md](docs/spec.md) §5 / [ADR 0006](docs/adr/0006-pivot-to-calc-api.md)
  - `com.example.calc` へ改名、`calculation` フィーチャー、`./mvnw verify` グリーン（15 tests）
  - 実 HTTP で 4 演算 / 422 / 400 / CORS を確認済み

## 開発環境

前提: Java 21 (Temurin) のみ。**Docker は不要**（DB が無い）。

```bash
# 起動
./mvnw spring-boot:run
# → http://localhost:8080/actuator/health  /  http://localhost:8080/swagger-ui.html

# ビルド + 全チェック（テスト / Spotless / Checkstyle / ArchUnit）
./mvnw verify

# フォーマット自動整形
./mvnw spotless:apply

# コンテナ
docker build -t calc-api:local .
```

### 叩いてみる

```bash
curl -s -XPOST http://localhost:8080/api/v1/calculations \
  -H 'Content-Type: application/json' \
  -d '{"left":6,"operator":"DIVIDE","right":3}'
# {"left":6,"operator":"DIVIDE","right":3,"result":2}

curl -s -XPOST http://localhost:8080/api/v1/calculations \
  -H 'Content-Type: application/json' \
  -d '{"left":1,"operator":"DIVIDE","right":0}'
# 422  {"title":"計算できません","detail":"0 で割ることはできません", ...}
```

### 画面から叩く（api-console.html）

ワークスペース直下の [api-console.html](api-console.html)（`.gitignore` 済み、コミットされない）を
ブラウザで開くと、フォームから叩いて結果を見られる。`file://` 直開きは CORS で弾かれるので:

- **VS Code 拡張「Live Server」**で `api-console.html` を右クリック → Open with Live Server
  （`http://127.0.0.1:5500` は [CorsConfig](src/main/java/com/example/calc/config/CorsConfig.java) が許可済み）

## API

`/api/v1` 配下、認証なし。

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/calculations` | `{left, operator, right}` → `{left, operator, right, result}` |
| GET | `/actuator/health` | ヘルスチェック |
| GET | `/swagger-ui.html` | Swagger UI |

`operator` は `ADD` / `SUBTRACT` / `MULTIPLY` / `DIVIDE`。
エラーは RFC 7807 `ProblemDetail`。入力不足・不正な operator は 400、0 除算は 422。

## デプロイ（Render）

`render.yaml` の Blueprint で Web Service を 1 つ作るだけ（DB なし）。
`main` への push で `.github/workflows/ci.yml` の deploy ジョブが Render のデプロイフックを呼ぶ
（`RENDER_DEPLOY_HOOK_URL` を GitHub Secrets に登録した場合）。

## ドキュメント

| パス | 内容 |
|---|---|
| `docs/brainstorm.md` | 設計合意（末尾に計算 API への変更記録）|
| `docs/spec.md` | 現行仕様・受け入れ基準・Sprint 5 |
| `docs/adr/` | 軽量 ADR（`0001` 開発の進め方 / `0002` 言語・FW / `0004` package-by-feature / `0006` 題材変更）|
| `docs/progress.md` | 実装進捗 |

タスク管理 API 時代の学習ノート・用語集・旧 ADR（0003 PostgreSQL / 0005 MapStruct）は
git タグ `archive/task-api` に残っている。
