# spec.md — 計算 API 仕様（Model / DB 連携あり）

- 題材変更の合意: [docs/brainstorm.md](brainstorm.md) 2026-09-11 追記 / [ADR 0006](adr/0006-pivot-to-calc-api.md)
- Model / DB 連携の追加: [docs/brainstorm.md](brainstorm.md) 2026-09-25 追記 / [ADR 0007](adr/0007-reintroduce-model-and-database.md)
- REST API としての仕上げ: [docs/brainstorm.md](brainstorm.md) 2026-09-26 追記 / [ADR 0008](adr/0008-rest-api-finishing.md)
- 旧「タスク管理 API 仕様（Sprint 0〜4）」は git タグ `archive/task-api` の同ファイルを参照。

---

## 1. これは何か

四則演算をして、その**履歴を DB に残す** REST API。Spring Boot の
「Controller → Service → Repository → Entity → DB」と
「DTO → バリデーション → 例外 → ProblemDetail → テスト → OpenAPI」の両方を、
1 リソース・1 テーブルの最小構成で一周する学習用。

- 1 リソース（`calculations`）・1 テーブル・認証なし
- REST の 6 操作（一覧 / 取得 / 作成 / 全置換 / 部分更新 / 削除）が全部ある
- 業務ルールは「0 で割れない」「結果が保存できる桁数（整数部 28 桁）を超えない」の 2 つ
- 一覧はページング付き（`?page=&size=`）、PATCH は JSON Merge Patch
- 1 対多のリレーション・スキーマ版管理（Flyway）・楽観ロック・クライアント指定のソートは**スコープ外**

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
| `created_at` | `TIMESTAMP` | NOT NULL・更新不可 | `Instant createdAt` | `@PrePersist` が設定（マイクロ秒に切り捨て）|
| `updated_at` | `TIMESTAMP` | NOT NULL | `Instant updatedAt` | `@PreUpdate` が設定（マイクロ秒に切り捨て）|

- スキーマは `ddl-auto: update` がエンティティから生成する（Flyway は使わない。[ADR 0007](adr/0007-reintroduce-model-and-database.md)）
- 開発・本番は PostgreSQL 17、テストは H2（インメモリ）

## 3. API

ベースパス `/api/v1`。認証なし。エラーは全て RFC 7807 `ProblemDetail`。

### 3.1 一覧: `GET /api/v1/calculations`

| クエリ | 型 | 必須 | 説明 |
|---|---|---|---|
| `operator` | string(enum) | — | 指定するとその演算子の履歴だけ |
| `page` | integer | — | ページ番号（**0 始まり**）。既定 0、0 以上 |
| `size` | integer | — | 1 ページの件数。既定 20、**1〜100** |

- 並びは**サーバー固定**: 新しい順（`created_at` 降順、同時刻は `id` 降順）。`?sort=` は受け付けない（無視される）
- `200` — Spring Data の `PagedModel` 形式。**0 件でも、最終ページより先を指定しても 200** と空の `content`（404 にしない）
- `400` — `operator` が enum に無い値 / `page` が負 / `size` が範囲外（`errors` にパラメータ別の理由）/ 数値でない

```json
{
  "content": [
    { "id": 6, "left": 6, "operator": "DIVIDE", "right": 3, "result": 2, "memo": null,
      "createdAt": "2026-09-26T06:19:50.711635Z", "updatedAt": "2026-09-26T06:19:50.711635Z" }
  ],
  "page": { "size": 20, "number": 0, "totalElements": 6, "totalPages": 1 }
}
```

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
- `422` — `operator` が `DIVIDE` で `right` が 0 / **結果の整数部が 28 桁を超える**
  （`NUMERIC(38,10)` に入らない。例: 28 桁 + 28 桁。入力の `@Digits` だけでは防げない）

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

**JSON Merge Patch（RFC 7396）**の意味で解釈する。`Content-Type` は `application/json` か
`application/merge-patch+json`。

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `memo` | string または null | — | 200 文字以内 |

| 送る本文 | 結果 |
|---|---|
| `{}`（`memo` を省略）| **何も変わらない**（UPDATE も発行されず、`updatedAt` も進まない）|
| `{"memo": null}` | メモを消す |
| `{"memo": "x"}` | メモを `"x"` にする |

- 式は変更しないので再計算も起きない
- 知らないキーは無視する
- `200` / `400`（201 文字以上・JSON オブジェクトでない）/ `404` / `415`（上記以外の Content-Type）

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
| `DIVIDE` で `right` が 0 / 結果の整数部が 28 桁を超える | 422 | `urn:problem-type:business-rule` | `BusinessRuleException` |
| `page` / `size` が範囲外 | 400 | — | `errors` にパラメータ別メッセージ（`HandlerMethodValidationException`）|
| PATCH の Content-Type が JSON / Merge Patch でない | 415 | — | Spring 標準 |
| 想定していない例外（バグ）| 500 | — | `detail` は固定文言（内部情報を出さない）。原因はサーバーログにだけ出す |

線引き: **送り方が間違っている = 400 / 宛先が無い = 404 / 送り方は正しいが実行できない = 422 /
サーバーのバグ = 500**。どの場合も `Content-Type: application/problem+json` で、`instance` にリクエストのパスが入る。

## 5. 受け入れ基準

### 5.1 API の振る舞い（実 HTTP で確認する）

- [ ] `POST` で 4 演算を投げて正しい `result` が返り、`201` と `Location` ヘッダが付く
- [ ] `10 / 3` が `3.333333333`、`50.0 * 2` が `100`、`0.1 + 0.2` が `0.3`
- [ ] `right: 0` の `DIVIDE` で 422（ProblemDetail、`type` 付き）
- [ ] `operator` 欠落で 400 かつ `errors.operator`、`operator: "PLUS"` で 400
- [ ] 小数 11 桁の入力で 400（`errors.left`）— 500 にならない
- [ ] `GET` 一覧が新しい順、`?operator=DIVIDE` で絞り込める、0 件でも 200 と空の `content`
- [ ] 一覧が `{content, page}` 形式で、`?page=1&size=2` で 2 件ずつの 2 ページ目が返り、
      `page.totalElements` / `totalPages` が正しい。最終ページより先は 200 と空の `content`
- [ ] `?size=101` / `?page=-1` が 400 で `errors.size` / `errors.page` 付き
- [ ] 28 桁 + 28 桁の POST / PUT が 422（500 にならない）。PUT の場合、元の式は変わらない
- [ ] 想定外の例外が 500 の ProblemDetail（`application/problem+json`）で、`detail` に内部情報が出ない
- [ ] `GET /{id}` が 200、存在しない id で 404、`/{id}` が数値でなければ 400
- [ ] `PATCH` で `memo` だけ変わり、式と `result` は変わらない。`updatedAt` が進む
- [ ] `PATCH {}` で何も変わらず（`memo` も `updatedAt` もそのまま）、`{"memo": null}` でメモが消える
- [ ] `PATCH` が `application/merge-patch+json` を受け付け、`text/plain` は 415
- [ ] 作成・更新直後のレスポンスと、あとから `GET` したときの `createdAt` / `updatedAt` が同じ値
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

### Sprint 7 — REST API としての仕上げ ✅

合意: [ADR 0008](adr/0008-rest-api-finishing.md)。

含むもの:
- 一覧のページング: `?page=&size=`（`@PositiveOrZero` / `@Min(1)` / `@Max(100)`）、並びはサーバー固定、
  レスポンスは `PagedModel`。Repository は `findAll(Pageable)` / `findByOperator(Operator, Pageable)`
- PATCH を JSON Merge Patch に: `MemoUpdateRequest(boolean memoSpecified, String memo)` を `Map` から組み立てる、
  `consumes` に `application/merge-patch+json` を追加
- 結果の桁あふれ（整数部 28 桁超）を 422 に
- `GlobalExceptionHandler`: 想定外の例外 → 500 ProblemDetail、`HandlerMethodValidationException` にも `errors`
- 時刻をマイクロ秒に切り捨て（書き込み直後と GET で値を揃える）
- テスト: 単体 23 / `@DataJpaTest` 6 / `@WebMvcTest` 25 / context 1 / ArchUnit 6 = **61**
- `api-console.html` をページング・Merge Patch・桁あふれに対応

受け入れ基準: §5 のとおり。

### Sprint 8 — 学習アプリの骨格 ＋ 第 1 部 ✅（ブラウザでの目視確認は利用者に依頼）

合意: [ADR 0009](adr/0009-learning-app.md)。API の実装は変えない（教材のみ）。

含むもの:
- `docs/learning/index.html`: 章の一覧（未解放・解放済み・合格の表示）、本文の表示、4 択テスト
  （プールからランダムに 10 問・選択肢シャッフル・9 問以上で合格）、進捗の保存とリセット、リポジトリの場所の設定
- 章ファイルの形式（本文・コードへのリンク・観察タスク・問題プール）と、その書き方の説明
- リンク検査の JUnit テスト（章ファイル中の全リンクについて、ファイルと目印の文字列が実在することを確認）
- 第 1 部: 1 章 API・HTTP・JSON / 2 章 Spring Boot の役割と DI / 3 章 最低限のアノテーション地図 /
  4 章 1 リクエストの旅（各章 15〜20 問）

受け入れ基準:
- [ ] `index.html` を `file://` で開いて 1 章を読み、10 問を解ける。9 問以上で 2 章が解放され、8 問以下では解放されない
- [ ] 解き直すたびに出題と選択肢の順番が変わる
- [ ] 不正解の問題に解説と、根拠の節・コードへのリンクが出る
- [ ] 「VS Code で開く」で該当ファイルが開き、「GitHub で見る」で該当ファイルが表示される
- [ ] ブラウザを閉じて開き直しても進捗が残り、リセットで初期状態に戻る。localStorage が使えなくても画面は動く
- [ ] 実装がある章では、各節に最低 1 つ実物へのリンクと「確認すること」がある
- [ ] 章ファイル中のリンク先ファイル・目印を 1 つ壊すと `./mvnw verify` が赤くなる
- [ ] 390px 幅（スマホ）でも読める

### 今後の候補（未着手・任意）

- 学習アプリ 第 2〜7 部（5〜26 章。ADR 0009 の章立て）と、`textbook.md` / `curriculum.md` の削除
- **Flyway によるスキーマ版管理**（`ddl-auto: validate` に切り替える）
- **1 対多のリレーション**（タグ / フォルダ、`@ManyToOne`、JOIN、N+1 と `@EntityGraph`）
- **Testcontainers** で本物の PostgreSQL に対してテストする
- 楽観ロック（`@Version` + ETag / `If-Match`）— 同時更新の上書きを 412 で防ぐ（ADR 0008 で見送り）
- Render への実デプロイ
- ~~`api-console.html` を 6 操作に対応させる~~（2026-09-26 対応済み）

## 7. アーキテクチャ不変条件（現行）

1. 層の依存方向は一方向: **Controller → Service → Repository**（逆向き・飛び越しは禁止）
2. package-by-feature: `calculation` ＋ 横断の `common` / `config`
3. 内部表現をそのまま公開しない: API 入出力は Java `record` の DTO。エンティティを
   Controller に登場させず、変換は `CalculationMapper` に閉じる
4. エラー応答は RFC 7807 `ProblemDetail` に統一（`common` のカスタム例外 → `@RestControllerAdvice`）
5. トランザクション境界は Service に置く（Controller / Repository には置かない）
