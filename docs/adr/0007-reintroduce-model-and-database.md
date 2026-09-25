# ADR 0007 — Model クラスと DB 連携を計算 API に組み込む

- ステータス: 承認済み（2026-09-25）
- 関連: [0002](0002-language-build-framework.md)（スタックは維持）、
  [0004](0004-package-by-feature-and-guardrails.md)（層・命名規約は維持）、
  [0006](0006-pivot-to-calc-api.md)（題材＝計算 API は維持。「永続化なし」の判断だけを覆す）

## 背景

ADR 0006 で題材を計算 API に絞り、永続化・認証を撤去した。エンドポイントは
`POST /api/v1/calculations` の 1 本だけになり、Controller → Service → DTO → バリデーション →
例外 → ProblemDetail → テスト → OpenAPI の流れは学べる状態になった。

一方で、利用者から「REST API の基本が詰まった仕様にしたい。Model クラスや DB 連携まで含めたい」
という要望が出た。実際、現状では次の「基本」が一つも登場していない。

- **Model クラス（エンティティ）と DB の対応** — `@Entity` / `@Column` / 主キーの採番
- **Repository 層** — Spring Data JPA、派生クエリ
- **トランザクション** — `@Transactional` の境界、読み取り専用
- **REST の全メソッドとステータスコード** — GET / POST / PUT / PATCH / DELETE、
  201 + `Location`、204、404
- **エンティティと DTO を分ける理由** — 「内部表現を公開しない」を実際に体験する場面

「計算するだけ」の API では 404 も 201 も出番が無く、不変条件 #3（内部表現を公開しない）も
守るべき対象が存在しない状態だった。学習教材としてここが弱い。

## 決定

題材は計算 API のまま、**計算履歴（calculation）を DB に永続化するリソース**にする。
`Calculation` エンティティ 1 つ、テーブル 1 つ、REST の 6 操作を持つ。

| 操作 | メソッド + パス | 成功 | 失敗 |
|---|---|---|---|
| 作成（計算して保存）| POST `/api/v1/calculations` | 201 + `Location` | 400 / 422 |
| 一覧（新しい順・`?operator=` で絞り込み）| GET `/api/v1/calculations` | 200（0 件でも空配列）| 400 |
| 取得 | GET `/api/v1/calculations/{id}` | 200 | 400 / 404 |
| 全置換（式を入れ替えて再計算）| PUT `/api/v1/calculations/{id}` | 200 | 400 / 404 / 422 |
| 部分更新（メモだけ）| PATCH `/api/v1/calculations/{id}` | 200 | 400 / 404 |
| 削除 | DELETE `/api/v1/calculations/{id}` | 204 | 404 |

### 採用した技術判断

| 項目 | 決定 | 理由 |
|---|---|---|
| DB | **PostgreSQL 17（Docker Compose）** | 現場で一番よく出会う。`spring-boot-docker-compose` により起動と接続情報の受け渡しが自動 |
| テストの DB | **H2（インメモリ）** | Docker を起動していなくても `./mvnw verify` が緑になる。CI も速い |
| スキーマ生成 | **`ddl-auto: update`（Flyway なし）** | 学習の足場を小さく保つ。マイグレーションは別スプリントの題材にする |
| 一覧の絞り込み | クエリパラメータ（`?operator=ADD`）| パスは「リソースの場所」、クエリは「絞り込み方」 |
| ページング | **入れない** | 今回のスコープ外（利用者の選択）。必要になった時点で `Pageable` を導入する |
| Entity ↔ DTO | 手書きの `CalculationMapper` | 項目が少ないうちは MapStruct を入れる必要が無い。「変換が 1 か所」が本質 |
| 時刻 | `@PrePersist` / `@PreUpdate` + `Instant` | 追加の設定（`@EnableJpaAuditing`）なしで動き、仕組みが見える |
| PUT と PATCH の役割 | PUT = 式の全置換（`memo` は null に戻る）/ PATCH = `memo` だけ | 「全置換」と「部分更新」の違いを体験できる最小の形 |
| 認証 | **入れない** | ADR 0006 の判断を維持。DB と REST に集中する |

### 維持するもの

- スタック: Java 21 / Spring Boot 4.0.8 / Maven
- package-by-feature（`calculation` フィーチャー ＋ 横断の `common` / `config`）
- DTO は Java `record`、request / response を分ける
- エラーは RFC 7807 `ProblemDetail` に一元化（400 / 404 / 422）
- Spotless / Checkstyle / ArchUnit / GitHub Actions / Dockerfile / Render Blueprint
- 学習用コメント規約（`// LEARN:`）と、処理の流れを追う学習ログ（`[n/5]`）

## 影響

- **アーキテクチャ不変条件 #1 が 3 層になる**: Controller → Service → Repository。
  ArchUnit に「Controller は Repository に依存しない」「Repository は interface」
  「エンティティを Controller に登場させない」の 3 ルールを追加した。
- **Docker が必要になった**（ADR 0006 で「Docker 不要」としたのを覆す）。ただし
  テストは H2 なので、`./mvnw verify` だけなら Docker なしで通る。
- **POST の成功が 200 → 201 + `Location` に変わった**（破壊的変更）。
  計算するだけで何も残らなかった頃は 200 が正しく、リソースを作るようになった今は 201 が正しい。
- 入力に `@Digits(integer = 28, fraction = 10)` を追加（破壊的変更）。DB のカラムが
  `NUMERIC(38, 10)` なので、入らない値は 500 ではなく 400 で弾く。
- `render.yaml` に PostgreSQL を追加し、接続情報は `fromDatabase` で注入する。
- Sprint 5 時点の「DB・JPA・Repository は登場しない」という README / CLAUDE.md の記述は撤回。

## 不採用案

| 案 | 不採用の理由 |
|---|---|
| H2 だけで完結させる（Docker 不要のまま）| 「現場と同じ DB を触る」経験が抜ける。Docker Desktop はこの環境で起動できることを確認済み |
| 計算履歴に加えてタグ等を足し 1 対多にする | `@ManyToOne`・JOIN・N+1 まで一度に入ると概念が埋もれる（ADR 0006 の反省）。次の候補として残す |
| 計算 API は DB なしのまま、別リソース（メモ帳など）を追加 | アプリの用途が 2 つに割れる。1 リソースで REST を一周できる方が教材として素直 |
| Flyway を同時に入れる | スキーマ版管理は独立した大きな題材。`ddl-auto` の限界を体験してから移る方が理解が残る |
| ページングを同時に入れる | 利用者の選択（今回のスコープ外）。件数が増えてから入れる |
| PUT で upsert（無い id なら作成）| id は DB が採番するので、クライアントが id を決められない。この設計では 404 が素直 |
