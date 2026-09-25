# spec.md — 計算 API 仕様（Model / DB 連携あり）

- 題材変更の合意: [docs/brainstorm.md](brainstorm.md) 2026-09-11 追記 / [ADR 0006](adr/0006-pivot-to-calc-api.md)
- Model / DB 連携の追加: [docs/brainstorm.md](brainstorm.md) 2026-09-25 追記 / [ADR 0007](adr/0007-reintroduce-model-and-database.md)
- 旧「タスク管理 API 仕様（Sprint 0〜4）」は git タグ `archive/task-api` の同ファイルを参照。

---

## 1. これは何か

四則演算をして、その**履歴を DB に残す** REST API。Spring Boot の
「Controller → Service → Repository → Entity → DB」と
「DTO → バリデーション → 例外 → ProblemDetail → テスト → OpenAPI」の両方を、
1 リソース・1 テーブルの最小構成で一周する学習用。

- 1 リソース（`calculations`）・1 テーブル・認証なし
- REST の 6 操作（一覧 / 取得 / 作成 / 全置換 / 部分更新 / 削除）が全部ある
- 業務ルールは「0 で割れない」の 1 つだけ
- ページング・1 対多のリレーション・スキーマ版管理（Flyway）は**今回のスコープ外**

## 2. データモデル

テーブル `calculations`（エンティティ `Calculation`）。

| カラム | 型 | 制約 | Java フィールド | 説明 |
|---|---|---|---|---|
| `id` | `BIGINT` | PK・DB 採番 | `Long id` | `GenerationType.IDENTITY` |
| `left_operand` | `NUMERIC(38,10)` | NOT NULL | `BigDecimal leftOperand` | `left` は SQL 予約語なので別名 |
| `operator` | `VARCHAR(16)` | NOT NULL | `Operator operator` | `@Enumerated(STRING)`。`ORDINAL` は使わない |
| `right_operand` | `NUMERIC(38,10)` | NOT NULL | `BigDecimal rightOperand` | |
| `result` | `NUMERIC(38,10)` | NOT NULL | `BigDecimal result` | 保存前に小数 10 桁へ丸める |
| `memo` | `VARCHAR(200)` | NULL 可 | `String memo` | PATCH で更新する対象 |
| `created_at` | `TIMESTAMP` | NOT NULL・更新不可 | `Instant createdAt` | `@PrePersist` が設定 |
| `updated_at` | `TIMESTAMP` | NOT NULL | `Instant updatedAt` | `@PreUpdate` が設定 |

- スキーマは `ddl-auto: update` がエンティティから生成する（Flyway は使わない。[ADR 0007](adr/0007-reintroduce-model-and-database.md)）
- 開発・本番は PostgreSQL 17、テストは H2（インメモリ）

## 3. API

ベースパス `/api/v1`。認証なし。エラーは全て RFC 7807 `ProblemDetail`。

### 3.1 一覧: `GET /api/v1/calculations`

| クエリ | 型 | 必須 | 説明 |
|---|---|---|---|
| `operator` | string(enum) | — | 指定するとその演算子の履歴だけ |

- `200` — 新しい順（`created_at` 降順、同時刻は `id` 降順）の配列。**0 件でも 200 と空配列**（404 にしない）
- `400` — `operator` が enum に無い値

### 3.2 取得: `GET /api/v1/calculations/{id}`

- `200` — 1 件
- `400` — `{id}` が数値でない
- `404` — その id の履歴が無い

### 3.3 作成: `POST /api/v1/calculations`

リクエスト（`application/json`）:

| フィールド | 型 | 必須 | 制約 | 説明 |
|---|---|---|---|---|
| `left` | number | ○ | 整数 28 桁・小数 10 桁以内 | 左オペランド（`BigDecimal`）|
| `operator` | string(enum) | ○ | `ADD` / `SUBTRACT` / `MULTIPLY` / `DIVIDE` | |
| `right` | number | ○ | 整数 28 桁・小数 10 桁以内 | 右オペランド |

- `201` — 作成成功。`Location: /api/v1/calculations/{id}` を返す。body は作成された 1 件
- `400` — 項目欠落 / 数値でない / `operator` が enum に無い / 桁数超過
- `422` — `operator` が `DIVIDE` で `right` が 0

レスポンス例:

```json
{
  "id": 1,
  "left": 10,
  "operator": "DIVIDE",
  "right": 3,
  "result": 3.333333333,
  "memo": null,
  "createdAt": "2026-09-25T12:03:05.157681Z",
  "updatedAt": "2026-09-25T12:03:05.157681Z"
}
```

- 割り算は有効数字 10 桁で四捨五入（`10 / 3` → `3.333333333`）
- 保存は小数 10 桁に丸める。レスポンスでは末尾ゼロを落とす（`50.0 * 2` → `100`、DB には `100.0000000000`）

### 3.4 全置換: `PUT /api/v1/calculations/{id}`

- リクエストは 3.3 と同じ（`left` / `operator` / `right` が**全て必須**）
- 式を差し替えて**再計算**し、`memo` は `null` に戻る（＝全置換の意味）
- `200` / `400` / `404` / `422`
- 冪等: 同じ body を何度送っても結果は同じ

### 3.5 部分更新: `PATCH /api/v1/calculations/{id}`

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `memo` | string | — | 200 文字以内。`null` を送るとメモを消す |

- 式は変更しないので再計算も起きない
- `200` / `400`（201 文字以上）/ `404`

### 3.6 削除: `DELETE /api/v1/calculations/{id}`

- `204` — 削除成功（body なし）
- `404` — その id の履歴が無い（「無い id の削除も成功扱い」にはしない）

### 3.7 運用・ドキュメント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/actuator/health` | ヘルスチェック（DB 接続も見る。`{"status":"UP"}`）|
| GET | `/swagger-ui.html` | Swagger UI |
| GET | `/v3/api-docs` | OpenAPI JSON |

## 4. エラー（RFC 7807 ProblemDetail）

| 状況 | HTTP | `type` | 補足 |
|---|---|---|---|
| 必須項目の欠落 / 桁数超過 / `memo` が長すぎる | 400 | — | `errors` にフィールド別メッセージ |
| JSON が壊れている / `operator` が enum に無い / `{id}` が数値でない | 400 | — | Spring 標準の `ResponseEntityExceptionHandler` |
| その id の履歴が無い | 404 | `urn:problem-type:not-found` | `ResourceNotFoundException` |
| `DIVIDE` で `right` が 0 | 422 | `urn:problem-type:business-rule` | `BusinessRuleException` |

線引き: **送り方が間違っている = 400 / 宛先が無い = 404 / 送り方は正しいが実行できない = 422**。

## 5. 受け入れ基準

### 5.1 API の振る舞い（実 HTTP で確認する）

- [ ] `POST` で 4 演算を投げて正しい `result` が返り、`201` と `Location` ヘッダが付く
- [ ] `10 / 3` が `3.333333333`、`50.0 * 2` が `100`、`0.1 + 0.2` が `0.3`
- [ ] `right: 0` の `DIVIDE` で 422（ProblemDetail、`type` 付き）
- [ ] `operator` 欠落で 400 かつ `errors.operator`、`operator: "PLUS"` で 400
- [ ] 小数 11 桁の入力で 400（`errors.left`）— 500 にならない
- [ ] `GET` 一覧が新しい順、`?operator=DIVIDE` で絞り込める、0 件でも 200 と `[]`
- [ ] `GET /{id}` が 200、存在しない id で 404、`/{id}` が数値でなければ 400
- [ ] `PATCH` で `memo` だけ変わり、式と `result` は変わらない。`updatedAt` が進む
- [ ] `PUT` で再計算され、`memo` が `null` に戻る
- [ ] `DELETE` が 204、同じ id をもう一度 `DELETE` すると 404、その後 `GET` も 404
- [ ] アプリを再起動しても履歴が残っている（PostgreSQL に永続化されている）
- [ ] `GET /actuator/health` が `UP`、`/swagger-ui.html` が表示され、`/v3/api-docs` に
      get / post / put / patch / delete が載っている
- [ ] ブラウザの別オリジン（`http://localhost:*`）から CORS で叩ける

### 5.2 コードとテスト

- [ ] `./mvnw verify` がグリーン（テスト + Spotless + Checkstyle + ArchUnit）
- [ ] テストが 4 層に分かれている: 単体（Repository をモック）/ `@DataJpaTest` /
      `@WebMvcTest` / `@SpringBootTest`（context loads）
- [ ] `./mvnw verify` は **Docker を起動していなくても通る**（テストは H2）
- [ ] ArchUnit: Controller は Repository に依存しない / Repository は interface /
      エンティティが Controller に登場しない

## 6. スプリント

### Sprint 5 — 題材リビルド（計算 API）✅

タスク管理 API を撤去し、計算 API に作り替えた。詳細は [docs/progress.md](progress.md)。

### Sprint 6 — Model クラスと DB 連携 ✅

合意: [ADR 0007](adr/0007-reintroduce-model-and-database.md)。

含むもの:
- 依存追加: `spring-boot-starter-data-jpa` / `postgresql`(runtime) /
  `spring-boot-docker-compose`(runtime, optional) / `spring-boot-starter-data-jpa-test`(test) / `h2`(test)
- `compose.yaml`（PostgreSQL 17 + healthcheck + 名前付きボリューム）
- `calculation`: `Calculation`（エンティティ）/ `CalculationRepository`（`JpaRepository` + 派生クエリ）/
  `CalculationMapper`（entity → DTO）
- DTO: `CalculationResponse` に `id` / `memo` / `createdAt` / `updatedAt` を追加、
  `MemoUpdateRequest` を新規、`CalculationRequest` に `@Digits`
- `CalculationService`: CRUD 6 操作、`@Transactional(readOnly = true)` ＋ 書き込みメソッドで上書き
- `CalculationController`: GET 一覧 / GET 1 件 / POST(201 + Location) / PUT / PATCH / DELETE(204)
- `common/exception`: `ResourceNotFoundException` ＋ ハンドラ（404）
- `application.yml`: `open-in-view: false`、local（PostgreSQL・`ddl-auto: update`・`show-sql`）と
  prod（環境変数から接続情報）、`src/test/resources/application-test.yml`（H2）
- テスト: 単体 15 / `@DataJpaTest` 6 / `@WebMvcTest` 18 / context 1 / ArchUnit 6 = **46**
- `render.yaml` に PostgreSQL を追加、`ci.yml` の文言更新

受け入れ基準: §5 のとおり。

### 今後の候補（未着手・任意）

- **ページングとソート**（`Pageable`、`?page=&size=&sort=`）と `PageResponse` DTO
- **Flyway によるスキーマ版管理**（`ddl-auto: validate` に切り替える）
- **1 対多のリレーション**（タグ / フォルダ、`@ManyToOne`、JOIN、N+1 と `@EntityGraph`）
- **Testcontainers** で本物の PostgreSQL に対してテストする
- 楽観ロック（`@Version`）— 同時更新の衝突を 409 で返す
- Render への実デプロイ
- `api-console.html` を 6 操作に対応させる

## 7. アーキテクチャ不変条件（現行）

1. 層の依存方向は一方向: **Controller → Service → Repository**（逆向き・飛び越しは禁止）
2. package-by-feature: `calculation` ＋ 横断の `common` / `config`
3. 内部表現をそのまま公開しない: API 入出力は Java `record` の DTO。エンティティを
   Controller に登場させず、変換は `CalculationMapper` に閉じる
4. エラー応答は RFC 7807 `ProblemDetail` に統一（`common` のカスタム例外 → `@RestControllerAdvice`）
5. トランザクション境界は Service に置く（Controller / Repository には置かない）
