# 実装進捗

## Sprint 9 — 学習アプリ 全章 ＋ 学習記録 ✅ 実装完了（2026-09-26）

学習アプリの第 2〜7 部（5〜26 章）と、学習記録（A: 問題ごとの正誤と受験の記録・間違えた問題の優先出題・復習、
B: 書き出しと読み込み）を入れた。合意は [ADR 0009](adr/0009-learning-app.md) と 2026-09-26 の追加合意。API の実装は変えていない。

### やったこと

| 分類 | 内容 |
|---|---|
| 章 | 5〜26 章（22 章）。全 26 章・**424 問**（各章 15〜19 問）・図 306 個・対話型ステッパー 6 個・コードへのリンク 246 個（目印 194 か所）|
| 座学の章 | 13 外部 API / 17 N+1・インデックス / 18 認証・認可 / 19 API セキュリティ（OWASP API Top 10 とこのリポジトリの対応表）。8・16・24 章は実装＋座学 |
| 学習記録 | 問題ごとの正誤（`qstats`：解いた回数・間違えた回数・最後の正誤）と受験の記録（`attempts`：章・点数・日時・通常/復習、最大 300 件）を localStorage に保存。問題の識別子は章番号＋問題文のハッシュ |
| 出題 | 通常のテストは重み付き抽選（未回答 2、最後に間違えた問題 +4、誤答率 ×2）。「間違えた問題だけ復習」（`#ch/N/review`）は合否・最高点に影響しない |
| ホーム | 苦手な問題（章ごとの数と復習への導線）、学習の記録（直近 10 件）|
| 書き出し・読み込み | 設定画面から JSON を書き出し／読み込み。形を確かめ、壊れていれば何も変えずにエラー文 |
| リンク検査 | `LearningLinksTest`：YAML・Dockerfile の `#` コメントを避けて目印の行を決める（`needs: build` がコメント行を指していた）、目印に `\` を使ったら失敗 |
| 修正 | 第 2 章の verify の順番の図を実際の順（Checkstyle → コンパイル → テスト → jar → Spotless）に |
| 削除 | `docs/learning/textbook.md` / `curriculum.md`（ADR 0009。git の履歴には残る）|

### 検証結果

`./mvnw verify` グリーン（64 tests）。Node の簡易 DOM で学習アプリ全体を動かして確認（すべて OK）:

| 受け入れ基準（spec.md Sprint 9）| 結果 |
|---|---|
| 26 章すべてが開け、自己検査に問題なし。各章 15 問以上 | ✅ 全章の本文・テスト画面を描画し undefined / NaN なし。実装の章は全節に refs と checks、全節に図 |
| verify グリーン（リンク実在・行番号最新）| ✅ 目印 194 か所の行を目視で確認（コメント行を指していた 1 件を修正）|
| 間違えた問題が優先され、復習で出題される。復習では合否・最高点が変わらない | ✅ 間違えた 2 問が両方出題された割合 93%（一様なら約 29%）。復習は 2 問だけ出題、best / passed 不変 |
| ホームに記録と苦手の数 | ✅ |
| 書き出した JSON で復元、壊れたファイルは変更なし | ✅ 合格・最高点・記録 4 件を復元。not json・別アプリ・形違いの 3 種で状態不変・エラー文 |

本文で「こうなる」と書いた挙動を H2 で起動したアプリで確認: CORS の許可外オリジンのプリフライトは 403「Invalid CORS request」、
許可オリジンは Allow-Methods と Max-Age 3600、`/actuator/env` は 404、余計な `"id"` / `"result"` は無視、
`DELETE /calculations` は 405、PUT の 0 除算は 422 で元の値のまま、OpenAPI の page / size の min / max / default、
未知の URL も problem+json。**health の応答に `groups: [liveness, readiness]` が含まれていた**ので、14・24 章の記述を実際に合わせた。

### 総点検（push 前）

全 26 章の本文・確認・問題と、README・CLAUDE.md・spec を通しで読み、事実・文言・表記を点検した。直したもの:

| 種類 | 内容 |
|---|---|
| 表示の不具合 | 確認・選択肢の `Optional<String>` / `Optional<Calculation>` が HTML のタグとして消えていた（7・15 章の 3 か所）→ `&lt;…&gt;` に。検証スクリプトに「素の `<Xxx>` の検出」を追加 |
| 事実 | 12 章：Spring の既定のロールバックは「非検査例外と Error」（検査例外は取り消さない）と正確に。9 章：「本番では絞る」の出どころは javadoc ではなくメソッド内のコメント。25 章：sprint タグは全スプリントには無い |
| 図のラベル | 1 章の URL・14 章の JDBC URL の分解で、欄の名前と値が同じだった → 「スキーム」「種類」 |
| 参照 | 節の参照を「1.3 節」の形に統一（1・2 章）。18 章で内部 id「s6」が表に出ていた → 「18.6 節」。26 章の章番号の並び（22・19 → 19・22）。4 章「右側のログ」→ 幅によって位置が変わるので「黒い枠のログ」 |
| 表記 | RFC 7807 → 「RFC 9457（旧 RFC 7807）」（README・CLAUDE.md・spec・GlobalExceptionHandler の javadoc。ADR 0006・0007 は当時の記録なので残す）。ADR 0001 の「1つ」→「1 つ」 |
| 古い記述 | README（変遷に ADR 0009、docs 表の brainstorm / spec の説明）、CLAUDE.md（経緯・verify にリンク検査・学習アプリ）、spec（冒頭の合意リンク、health の応答例）|

機械的な検査（表記ゆれ・数字と和文のスペース・全角英数・章参照の存在確認）もスクリプトで行い、残っていないことを確認した。

### 検証不能・未実施

- **ブラウザでの画面確認は未実施**（この環境にブラウザ操作の手段が無い）。表示崩れ・スマホ幅・ステッパーの操作感・
  書き出しのダウンロード（Blob）・読み込みのファイル選択は利用者の確認待ち。
- 22 章（Docker）の `docker build`・23 章（CI/CD）の Actions の画面・16 章の ddl-auto の実験は、Docker が起動しておらず未確認。
- PostgreSQL（Docker）での動作は今回も未確認。

### 引き渡し事項

- 次は **アジャイル・スクラム編**（brainstorm 2026-09-26、着手時に ADR 0010）。
- 教材は実装と一緒に古くなる。実装を変える Sprint では、関係する章の本文も読み直す（リンク切れと行ずれは `LearningLinksTest` が検出）。
- 問題文を直すと、その問題の学習記録は別の問題として扱われる（識別子が問題文のハッシュのため）。
- `git tag sprint-9` とコミット・push は 2026-09-26 に実施（総点検の後）。

---

## Sprint 8 — 学習アプリの骨格 ＋ 第 1 部 ✅ 実装完了（2026-09-26）

このリポジトリを題材にした教科書 ＆ 問題集アプリを作り始めた。合意は
[brainstorm.md](brainstorm.md) 2026-09-26 追記 / [ADR 0009](adr/0009-learning-app.md)。API の実装は変えていない。

### やったこと

| 分類 | 内容 |
|---|---|
| アプリ | `docs/learning/index.html`（外部ライブラリなし・`file://` で動く）: 目次（合格 ✓ / 学習中 ▶ / 未解放 🔒 / 準備中 —）、本文、「確認すること」（答えは折りたたみ）、動かして観察、AI 駆動の観点、章末テスト（プールからランダム 10 問・選択肢シャッフル・9 問以上で合格・不正解に解説と本文へのリンク）、進捗の保存（localStorage）とリセット、リポジトリの場所の設定、章データの自己検査（問題があれば画面上部に赤で表示）|
| 章 | 第 1 部: 1 章 API・HTTP・JSON（18 問）/ 2 章 Spring Boot の役割と DI（17 問）/ 3 章 最低限のアノテーション地図（19 問）/ 4 章 1 リクエストの旅（17 問）。コードへのリンク 55 か所 |
| 目次 | `chapters/outline.js` に全 26 章。未作成の章は「準備中」 |
| リンク | 「VS Code で開く」（`vscode://file/…:行`）＋「GitHub で見る」（`…/blob/main/…#L行`、Markdown / YAML は `?plain=1`）|
| 検査 | `LearningLinksTest`（3 件）: 全リンクのファイルと目印が実在する / 行番号の一覧 `chapters/anchors.js` が最新 / `index.html` が全章ファイルを読み込んでいる |
| 書き方 | `chapters/AUTHORING.md`（章ファイルの形・約束・章を足す手順）|
| テスト | 61 → **64**（`LearningLinksTest` 3 件）|

### 検証結果

| 受け入れ基準（spec.md Sprint 8）| 結果 |
|---|---|
| 1 章を読み 10 問を解ける。9 問で 2 章が解放、8 問では解放されない | ✅ Node の簡易 DOM で実行して確認（8/10 → 不合格・ロックのまま、9/10 → 合格・解放）|
| 解き直すたびに出題と選択肢の順番が変わる | ✅ 同上 |
| 不正解に解説と、根拠の節・コードへのリンク | ✅ 同上（`本文で確認: #ch/1/sN`）|
| 「VS Code で開く」「GitHub で見る」の URL | ✅ URL の形を確認（`…CalculationController.java:77` / `#L77`、`spec.md?plain=1#L41`）。**実際にクリックして開くのは未確認** |
| 進捗が残り、リセットで戻る。localStorage が使えなくても動く | ✅ 保存と、例外を投げる localStorage でも落ちないことを確認 |
| 実装がある章の各節にリンクと「確認すること」 | ✅ 第 1〜4 章の全 26 節 |
| 目印を 1 つ壊すと `./mvnw verify` が赤くなる | ✅ `@PostMapping` を壊して 2 件失敗することを確認し、元に戻した |
| 390px 幅で読める | ⚠ CSS のメディアクエリ（860px 以下で 1 カラム）は入れたが、**実機・ブラウザでは未確認** |

**図解化（利用者の指摘「文字だけで退屈」を受けて）**: 図の部品 11 種（`Fig.flow` / `http` / `cards` / `compare` / `stack` /
`pairs` / `matrix` / `term` / `timeline` / `code` / `stepper`）を追加し、第 1〜4 章を図中心に書き直した（図 66 個、
1 コマずつ進める対話型のステッパー 2 つ）。すべての節に図がある。色はテーマの変数に揃えてダークモードでも読めるようにし、
箱と矢印は HTML/CSS で組んで 640px 以下では縦並びになるようにした。Node の簡易 DOM で、全章の描画に `undefined` が無いこと、
ステッパーの初期表示を確認。**見た目そのものはブラウザで未確認**。

本文の記述も実物で確かめた: 第 3 章の実験（`@Valid` を外すと 400 のテストが 2 件落ちる、`@Service` を外すと起動テストが
`NoSuchBeanDefinitionException` で落ちる）、第 2 章の起動ログの文言（`HikariPool-1 - Start completed` / `Tomcat started on port 8080` /
`Started CalcApiApplication`）。

### 検証不能・未実施

- **ブラウザでの画面確認は未実施**（この環境にブラウザ操作の手段が無い）。表示崩れ・スマホ幅・リンクのクリックは利用者の確認待ち。
- 第 4 章の「動かして観察」のログの順番はコードと H2 での起動から確認した。PostgreSQL（Docker）での起動は今回も未確認。

### 引き渡し事項

- **まず利用者に第 1 部を使ってもらい、形式（分量・問題の難易度・画面）を確認してから** Sprint 9（第 2 部 5〜9 章）に進む。
- コードを変えたら `./mvnw verify` がリンク切れや行番号のずれを教えてくれる。
  直し方は `./mvnw test -Dtest=LearningLinksTest -Dlearning.writeAnchors=true`（AUTHORING.md）。
- 第 3 章の実験を試すと、`LearningLinksTest` も落ちる（教材がリンクしている行を書き換えるため）。本文にもそう書いた。
- `textbook.md` / `curriculum.md` は全章が揃うまで残す（ADR 0009）。
- `git tag sprint-8` とコミットは 2026-09-26 に実施済み。

---

## Sprint 7 — REST API としての仕上げ ✅ 実装完了（2026-09-26）

「最新のポピュラーな REST API の実装を、徹底的に、それでいて必要最低限に」という要望を受けて全体を見直し、
実 HTTP で見つかった不具合 3 件と、欠けていた定番 1 件（ページング）を入れた。
合意は [brainstorm.md](brainstorm.md) 2026-09-26 追記 / [ADR 0008](adr/0008-rest-api-finishing.md)。

### 見直しで見つかったこと（修正前に実際に叩いて確認）

| # | 事象 | 対応 |
|---|---|---|
| 1 | 28 桁 + 28 桁の POST が **500**（H2: `Value too long for column "RESULT NUMERIC(38, 10)"`）| Service で結果の整数部を検査 → 422 |
| 2 | その 500 が Boot 既定の `{"timestamp","status","error","path"}`（不変条件 #4 違反）| `@ExceptionHandler(Exception.class)` → 500 ProblemDetail |
| 3 | `memo` がある状態で `PATCH {}` を送るとメモが消えた | JSON Merge Patch（省略 = 変更なし / null = 削除）|
| 4 | 一覧が全件を配列で返す | `?page=&size=` + `PagedModel` |
| 5 | 書き込み直後の時刻（ナノ秒）と GET の時刻（マイクロ秒）が違う（実装中に発見）| `@PrePersist` / `@PreUpdate` でマイクロ秒に切り捨て |

### やったこと

| 分類 | 内容 |
|---|---|
| Repository | 派生クエリ 2 本（`…OrderBy…`）を撤去し、`findAll(Pageable)`（継承）/ `findByOperator(Operator, Pageable)` に |
| Service | `findAll(operator, page, size)` → `Page<CalculationResponse>`（並びは `NEWEST_FIRST` 固定）、`MAX_INTEGER_DIGITS = 28` の検査、PATCH は `memoSpecified` のときだけ変更 |
| Controller | 一覧に `page`（`@PositiveOrZero`）/ `size`（`@Min(1)` `@Max(100)`）、戻り値 `PagedModel`。PATCH の `consumes` に `application/merge-patch+json` |
| DTO | `MemoUpdateRequest(boolean memoSpecified, String memo)` を `@JsonCreator(DELEGATING)` で `Map` から組み立て。`memoSpecified` は OpenAPI から隠す |
| Entity | 時刻をマイクロ秒に切り捨てる `now()` |
| common | `handleUnexpected`（500・固定文言・`logger.error`）、`handleHandlerMethodValidationException`（`errors` にパラメータ別理由）|
| テスト | 単体 15 → **23** / `@DataJpaTest` 6 / `@WebMvcTest` 18 → **25** / context 1 / ArchUnit 6 = **61** |
| コンソール | `api-console.html`: 一覧に page / size、PATCH に Content-Type 切替と `{}` / null / merge-patch / 415 のサンプル、桁あふれ 422 のサンプル |
| ドキュメント | ADR 0008 新規、brainstorm 追記、spec（§1〜§6）、README、本ファイル、`learning/sprint-7.md` |

### 検証結果（実際に動かした）

`./mvnw verify` グリーン（61 tests、Spotless / Checkstyle / ArchUnit 含む）。
実 HTTP は **H2 で起動したアプリ**に対して実施（下記「検証不能」参照）。

| 受け入れ基準（spec.md §5）| 結果 |
|---|---|
| 一覧が `{content, page}` | ✅ `"page":{"size":20,"number":0,"totalElements":6,"totalPages":1}` |
| `?page=1&size=2` で 2 ページ目 | ✅ id 4, 3 が返り `totalPages: 3` |
| 最終ページより先は 200 + 空 | ✅ `{"content":[],"page":{…"number":99…}}` |
| `?size=101` / `?page=-1` が 400 + errors | ✅ `{"errors":{"size":"100 以下の値にしてください"}}` / `{"errors":{"page":"0 以上の値にしてください"}}` |
| `?sort=leftOperand,asc` は効かない | ✅ 先頭は最新の id のまま |
| 28 桁 + 28 桁が 422 | ✅ POST / PUT とも `urn:problem-type:business-rule`。PUT 後の GET で元の式のまま |
| ちょうど 28 桁は保存できる | ✅ 201 |
| `PATCH {}` で何も変わらない | ✅ `memo` も `updatedAt` もそのまま |
| `{"memo": null}` で削除、merge-patch+json を受け付ける | ✅ 200 |
| `text/plain` の PATCH は 415、配列の本文は 400 | ✅ |
| 500 が ProblemDetail で内部情報なし | ✅ `@WebMvcTest` で確認（実 HTTP では 500 を起こす手段が無くなったため）|
| 書き込み直後と GET の時刻が同じ | ✅ `createdAt` が両方 `…10.518571Z` |
| OpenAPI | ✅ `page`（min 0）/ `size`（1〜100）、PATCH は 2 つの Content-Type、`MemoUpdateRequest` は `memo`（nullable）のみ |

### 検証不能・未実施

- **PostgreSQL での実 HTTP 確認は未実施**。Docker デーモンが起動しておらず（`DockerNotRunningException`）、
  H2 に差し替えて起動した。ページングの `LIMIT/OFFSET`・`COUNT(*)` と `NUMERIC(38,10)` の境界は
  PostgreSQL でも同じ挙動のはずだが、確認はしていない。
- `api-console.html` はスクリプトの構文チェック（`node --check`）のみ。**ブラウザでの画面操作は未確認**。

### 引き渡し事項

- **破壊的変更**: 一覧のレスポンスが**配列 → `{content, page}`**。`?page=&size=` の範囲外は 400。
- **挙動の変更**: `PATCH {}` はメモを消さなくなった（消すには `{"memo": null}`）。
- 422 の原因が 2 つになった（0 除算・結果の桁あふれ）。
- 並び順はサーバー固定。`?sort=` を開放する場合は、API 名 → フィールド名の対応表を持つこと（ADR 0008）。
- `git tag sprint-7` とコミットは未実施。

---

## Sprint 6 — Model クラスと DB 連携 ✅ 実装完了（2026-09-25）

計算 API に Model クラス（JPA エンティティ）と DB 連携を組み込み、REST の 6 操作を持つ 1 リソースにした。
合意は [brainstorm.md](brainstorm.md) 2026-09-25 追記 / [ADR 0007](adr/0007-reintroduce-model-and-database.md)。

### やったこと

| 分類 | 内容 |
|---|---|
| pom.xml | 追加: `spring-boot-starter-data-jpa` / `postgresql`(runtime) / `spring-boot-docker-compose`(runtime・optional) / `spring-boot-starter-data-jpa-test`(test) / `h2`(test) |
| インフラ | `compose.yaml` 新規（PostgreSQL 17-alpine + healthcheck + 名前付きボリューム `calc-pgdata`） |
| Model | `Calculation`（`@Entity`、`calculations` テーブル、`IDENTITY` 採番、`NUMERIC(38,10)`、`@Enumerated(STRING)`、`@PrePersist`/`@PreUpdate`、`left`/`right` は予約語なので `left_operand`/`right_operand`） |
| Repository | `CalculationRepository`（`JpaRepository` + 派生クエリ 2 本: 新しい順全件 / 演算子で絞り込み） |
| Mapper | `CalculationMapper`（entity → response DTO。末尾ゼロの正規化も担当） |
| DTO | `CalculationResponse` に `id` / `memo` / `createdAt` / `updatedAt` を追加、`MemoUpdateRequest` を新規、`CalculationRequest` に `@Digits(integer = 28, fraction = 10)` |
| Service | CRUD 6 操作、クラスに `@Transactional(readOnly = true)` ＋ 書き込みメソッドで上書き、`orElseThrow` で 404、保存前に小数 10 桁へ丸め、更新は `saveAndFlush` |
| Controller | GET 一覧（`?operator=`）/ GET 1 件 / POST（**201 + `Location`**、`UriComponentsBuilder`）/ PUT（全置換）/ PATCH（memo）/ DELETE（**204**） |
| common | `ResourceNotFoundException` ＋ ハンドラ（404・`urn:problem-type:not-found`） |
| resources | `application.yml`: `open-in-view: false`、local（PostgreSQL・`ddl-auto: update`・`show-sql: true`）/ prod（`${DB_HOST}` 等）。`src/test/resources/application-test.yml`（H2・`create-drop`） |
| テスト | 単体 15（repository をモック）/ `@DataJpaTest` 6（新規）/ `@WebMvcTest` 18 / context 1（`@ActiveProfiles("test")`）/ ArchUnit 6（+3 ルール）= **46** |
| ArchUnit | 追加: Controller は Repository に依存しない / Repository は interface / エンティティは Controller に登場しない |
| infra | `render.yaml` に PostgreSQL（`fromDatabase` で接続情報を注入）、`ci.yml` の文言更新（テストは H2 なので DB サービス不要） |
| 学習ログ | `[n/4]` → `[n/5]`（受信 → 入口 → 業務 → **保存** → 応答）に拡張 |
| ドキュメント | `spec`（全面改訂）/ `brainstorm`（追記）/ `README`（全面改訂）/ `CLAUDE.md` / ADR 0007 / 本ファイル / `docs/learning/sprint-6.md` |

### 検証結果（実際に動かした）

PostgreSQL 17（Docker Compose）に対して実 HTTP で確認。

| 受け入れ基準（spec.md §5）| 結果 |
|---|---|
| POST で 201 + `Location` | ✅ `HTTP/1.1 201` / `Location: http://localhost:8080/api/v1/calculations/1` |
| 4 演算が正しい `result` | ✅ `2+3=5` / `9-4=5` / `7×6=42` / `6÷3=2` |
| `10/3`→`3.333333333`、`50.0×2`→`100`、`0.1+0.2`→`0.3` | ✅ curl + 単体テスト |
| 0 除算で 422（`type` 付き）| ✅ `{"status":422,"type":"urn:problem-type:business-rule"}` |
| `operator` 欠落で 400 + `errors.operator` | ✅ `{"errors":{"operator":"null は許可されていません"}}` |
| `operator:"PLUS"` で 400 | ✅ |
| 小数 11 桁の入力で 400（500 にならない）| ✅ `{"errors":{"left":"値は次の範囲にしてください (<整数 28 桁>.<小数点以下 10 桁>)"}}` |
| 一覧が新しい順 / `?operator=DIVIDE` で絞り込み / 0 件でも 200 と `[]` | ✅ |
| 一覧の不正な `operator` で 400 | ✅ |
| `GET /{id}` 200 / 存在しない id で 404 / `/abc` で 400 | ✅ 404 は `urn:problem-type:not-found` |
| PATCH で memo だけ変わり `updatedAt` が進む | ✅ `updatedAt` 12:10:41.629 → 12:10:41.911（式と `result` は不変）|
| PATCH で `{"memo":null}` によりメモを消せる | ✅ |
| PATCH で 201 文字の memo は 400 | ✅ `errors.memo` |
| PUT で再計算され memo が null に戻る | ✅ `1+2=3`（memo あり）→ `9-4=5`（memo null）|
| PUT の項目欠落で 400 / 存在しない id で 404 | ✅ |
| DELETE 204 → 同じ id を再度 DELETE で 404 → `GET` も 404 | ✅ |
| **アプリ再起動後も履歴が残る** | ✅ 再起動後の `GET` で同じ行が返る。`psql` でも 2 行確認 |
| `/actuator/health` = UP（DB 接続込み）| ✅ `{"groups":["liveness","readiness"],"status":"UP"}` |
| `/swagger-ui.html` 200、`/v3/api-docs` に 5 メソッド | ✅ `get` / `post` / `put` / `patch` / `delete` |
| `./mvnw verify` グリーン | ✅ **46 tests / 0 failures / 0 skipped**、Checkstyle 0 違反、Spotless clean、ArchUnit 6 pass |
| `./mvnw verify` が Docker なしでも通る | ✅ テストは H2。`@SpringBootTest` は `@ActiveProfiles("test")` |
| 別オリジンから CORS で叩ける | ✅ `Origin: http://localhost:5500` の PATCH プリフライトに `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`。許可外オリジンは 403 |

実装中に見つけて直した 2 件（どちらも実際に叩いて気づいたもの）:

1. **同じリソースなのに表示が違う** — DB は `NUMERIC(38,10)` なので読み戻すと `7.0000000000`。
   作成直後（メモリ上）は `7`。→ `CalculationMapper` で末尾ゼロを落とし、DTO 境界で統一した。
2. **PATCH / PUT のレスポンスの `updatedAt` が古い** — `@PreUpdate` はフラッシュ時に走るため、
   DTO を組んだ時点ではまだ更新されていなかった。→ `saveAndFlush` してから変換するようにした。

### 検証不能・未実施

- Render への実デプロイは未実施（アカウント未設定）。`render.yaml` / `ci.yml` は構成のみ。
- `docker build`（Dockerfile のイメージビルド）は未検証。Docker デーモン自体は今回起動できたので、
  Sprint 5 時点の「Docker Desktop が起動しない」という記録は解消している。

### 引き渡し事項

- **破壊的変更**: POST の成功が 200 → **201 + `Location`**、入力に桁数制約（`@Digits`）追加。
  既存クライアント（`api-console.html` を含む）は 200 前提なら直す必要がある。
- `api-console.html` を 6 操作に対応させた（2026-09-26。`.gitignore` 済み・未コミット）。
  201 の `Location` をブラウザから読めるよう `CorsConfig` に `exposedHeaders("Location")` を追加。
  検証: `./mvnw verify` グリーン（46 件）。Docker が起動していなかったため PostgreSQL ではなく
  H2 でアプリを起動し、`Origin` 付き curl で 6 操作・プリフライト・`Access-Control-Expose-Headers` を確認。
  **ブラウザ上での画面操作は未確認**。
- スキーマは `ddl-auto: update` に任せている。**列の削除・リネーム・型変更はできない**ので、
  そうした変更が必要になったら先に Flyway を入れる（[spec.md](spec.md) §6）。
- テストだけ H2 という割り切りをしている。DB 固有の SQL（ネイティブクエリ・`jsonb` など）を
  書き始めた時点で Testcontainers に移行すべき。
- `git tag sprint-6` は未実施。
- DB のデータは Docker ボリューム `calc-pgdata` に残る。まっさらにするなら `docker compose down -v`。

---


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
