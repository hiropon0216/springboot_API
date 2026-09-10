# spec.md — 計算 API 仕様

- 題材変更の合意: [docs/brainstorm.md](brainstorm.md) 2026-09-11 追記 / [ADR 0006](adr/0006-pivot-to-calc-api.md)
- 旧「タスク管理 API 仕様（Sprint 0〜4）」は git タグ `archive/task-api` の同ファイルを参照。

---

## 1. これは何か

四則演算をするだけの REST API。Spring Boot の「Controller → Service → DTO → バリデーション →
例外 → ProblemDetail → テスト → OpenAPI」というコアの流れを、DB も認証も無い最小構成で通す学習用。

- 永続化なし・認証なし・状態なし
- エンドポイントは 1 本
- 業務ルールは「0 で割れない」の 1 つだけ

## 2. API

ベースパス `/api/v1`。認証なし。

### POST /api/v1/calculations

リクエスト（`application/json`）:

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `left` | number | ○ | 左オペランド（小数可、`BigDecimal` で扱う）|
| `operator` | string(enum) | ○ | `ADD` / `SUBTRACT` / `MULTIPLY` / `DIVIDE` |
| `right` | number | ○ | 右オペランド |

レスポンス `200`:

```json
{ "left": 6, "operator": "DIVIDE", "right": 3, "result": 2 }
```

- 割り算は 10 桁で四捨五入（`10 / 3` → `3.333333333`）
- 末尾ゼロは正規化（`50.0 * 2` → `100`、`1.50 + 1.50` → `3`）

### 運用・ドキュメント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/actuator/health` | ヘルスチェック（`{"status":"UP"}`）|
| GET | `/swagger-ui.html` | Swagger UI |
| GET | `/v3/api-docs` | OpenAPI JSON |

## 3. バリデーションとエラー（RFC 7807 ProblemDetail）

| 状況 | HTTP | 補足 |
|---|---|---|
| `left` / `operator` / `right` のいずれか欠落 | 400 | `errors` に欠落フィールドを列挙（`@NotNull`）|
| JSON が壊れている / `operator` が enum に無い（`"PLUS"` 等）| 400 | Spring 標準の `ResponseEntityExceptionHandler` が処理 |
| `right` が 0 で `operator` が `DIVIDE` | 422 | `type: urn:problem-type:business-rule`、`BusinessRuleException` |

400 と 422 の線引き: **入力の形が壊れている = 400 / 形は正しいが計算できない = 422**。

## 4. 受け入れ基準

- [ ] `POST /api/v1/calculations` に 4 演算を投げて正しい `result` が返る（`curl` かコンソールで確認）
- [ ] `10 / 3` が `3.333333333`、`50.0 * 2` が `100` になる
- [ ] `right: 0` の `DIVIDE` で 422（ProblemDetail、`type` 付き）
- [ ] `operator` 欠落で 400 かつ `errors.operator` が返る
- [ ] `operator: "PLUS"` で 400
- [ ] `GET /actuator/health` が `UP`、`/swagger-ui.html` が表示される
- [ ] `./mvnw verify` グリーン（テスト + Spotless + Checkstyle + ArchUnit）
- [ ] ブラウザの別オリジン（`http://localhost:*` / Claude サンドボックス）から CORS で叩ける

## 5. スプリント

### Sprint 5 — 題材リビルド（計算 API）✅

タスク管理 API を撤去し、計算 API に作り替える。

含むもの:
- ルートパッケージ `com.example.calc` へ改名、`CalcApiApplication`
- `pom.xml` から JPA / Security / Flyway / Testcontainers / MapStruct / Lombok を撤去
- `calculation` フィーチャー: `Operator` / `CalculationRequest` / `CalculationResponse` /
  `CalculationService` / `CalculationController`
- `common/exception`: `BusinessRuleException` ＋ `GlobalExceptionHandler`（422 / 400）
- `config`: `CorsConfig`（`WebMvcConfigurer`）、`OpenApiConfig`
- `application.yml` を最小化（actuator + springdoc のみ）、`application-prod.yml` は撤去
- テスト: `CalculationServiceTest`（計算 7 件）/ `CalculationControllerTest`（`@WebMvcTest` 4 件）/
  `CalcApiApplicationTests`（context loads）/ `LayeredArchitectureTest`（ArchUnit 3 ルール）
- `Dockerfile` は維持、`render.yaml` から DB を撤去、`ci.yml` の文言更新
- `api-console.html` を 1 エンドポイント用に作り直し
- ドキュメント一式（本ファイル / brainstorm / ADR 0006 / README / CLAUDE.md / progress）更新

受け入れ基準: §4 のとおり。

### 今後の候補（未着手・任意）

- 学習ノート `docs/learning/sprint-5.md` を計算 API の切り口で新規作成
- `git tag sprint-5`
- Render へ実デプロイして公開 URL を得る

## 6. アーキテクチャ不変条件（現行）

1. 層の依存方向は一方向: Controller → Service（このアプリに Repository は無い）
2. package-by-feature: `calculation` ＋ 横断の `common` / `config`
3. entity/内部表現をそのまま公開しない: API 入出力は Java `record` の DTO、request と response を分ける
4. エラー応答は RFC 7807 `ProblemDetail` に統一（`common` のカスタム例外 → `@RestControllerAdvice`）

（旧 #5 所有者ベース認可 / #6 Flyway は対象が無くなったため削除。[ADR 0006](adr/0006-pivot-to-calc-api.md)）
