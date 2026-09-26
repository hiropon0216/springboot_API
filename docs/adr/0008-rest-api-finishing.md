# ADR 0008 — REST API としての仕上げ（ページング・Merge Patch・500 の ProblemDetail・結果の桁あふれ）

- ステータス: 承認済み（2026-09-26）
- 関連: [0007](0007-reintroduce-model-and-database.md)（「ページングは入れない」の判断だけを覆す）

## 背景

Sprint 6 で REST の 6 操作が揃った。利用者から「最新のポピュラーな REST API の実装を、徹底的に、
それでいて必要最低限に」という要望を受けて全体を見直し、H2 で起動したアプリに実際に HTTP を送って
確かめたところ、次の 4 点が見つかった。

| # | 観察した事実 | 何が問題か |
|---|---|---|
| 1 | `9999…(28 桁) + 9999…(28 桁)` の POST が **500** | 入力は 28 桁以内でも**結果は 29 桁以上になりうる**。DB の `NUMERIC(38,10)` に入らず INSERT で落ちる |
| 2 | その 500 が `{"timestamp","status","error","path"}`（Boot 既定）で返る | 不変条件 #4「エラー応答は ProblemDetail に統一」に違反 |
| 3 | `memo` がある状態で PATCH に `{}` を送ると `memo: null` になる | PATCH の定番（JSON Merge Patch）では「省略 = 変更しない」。省略と `null` を区別できていない |
| 4 | 一覧が全件を配列で返す | 件数に比例して際限なく重くなる。一覧 API の最低限の作法が欠けている |

## 決定

| 項目 | 決定 |
|---|---|
| 結果の桁あふれ | Service で「結果の整数部が 28 桁を超える」を検査し `BusinessRuleException` → **422** |
| 想定外の例外 | `GlobalExceptionHandler` に `@ExceptionHandler(Exception.class)` → **500 の ProblemDetail**。`detail` は固定文言（内部情報を出さない）、スタックトレースはサーバーのログにだけ出す |
| PATCH | **JSON Merge Patch（RFC 7396）の意味**にする。`MemoUpdateRequest(boolean memoSpecified, String memo)` を `@JsonCreator(mode = DELEGATING)` で `Map<String, String>` から組み立て、`containsKey("memo")` で 3 状態を区別する: 項目なし（変更しない）/ `"memo": null`（消す）/ 値あり。`Content-Type` は `application/json` と `application/merge-patch+json` の両方を受け付ける |
| ページング | `GET /calculations?page=0&size=20`。`page` ≥ 0、`1 ≤ size ≤ 100`（違反は 400）。並びは**サーバー固定**（新しい順）。レスポンスは Spring Data の **`PagedModel`**（`{"content":[…],"page":{"size","number","totalElements","totalPages"}}`）|

### 採用した技術判断

| 項目 | 決定 | 理由 |
|---|---|---|
| ページのパラメータ | `@RequestParam int page / size` ＋ `@PositiveOrZero` / `@Min` / `@Max` | `Pageable` を直接受けると `?sort=leftOperand` のように**エンティティのフィールド名**でソートできてしまい、内部表現が漏れる（不存在の名前は 500 にもなる）。範囲外を黙って丸めず 400 で返せる |
| ページのレスポンス型 | Spring Data の `PagedModel` | `Page` をそのまま JSON にすると内部構造（`pageable`・`sort` など）が出て形も安定しない。Spring Data 自身がこの問題の答えとして用意した、安定した JSON 形の DTO |
| Service の戻り値 | `Page<CalculationResponse>`（`org.springframework.data.domain`）| `PagedModel` は web 層の型なので Controller で包む。Service を web に依存させない |
| Merge Patch の実現方法 | `Map` から組み立てる record（追加依存なし）| Map は「キーが無い」と「値が null」を最初から区別できる。DTO は record のまま、`@Size` の検証もそのまま効く。当初は `Optional<String>` を採る予定だったが、**Jackson 3 は項目が無いときも `Optional.empty()` を入れる**ため区別できないことがテストで判明した |
| 時刻の精度 | `@PrePersist` / `@PreUpdate` でマイクロ秒に切り捨てる | 見直し中に発見。DB はマイクロ秒までしか持たないので、書き込み直後のレスポンス（ナノ秒）と GET（マイクロ秒）で値が違って見えた |
| 500 のログ | `ResponseEntityExceptionHandler` が持つ `logger` で `error` を出す | 学習用の `System.out` ではなく、本番でも残るログにする |

## 影響

- **一覧のレスポンスが配列 → オブジェクト**（破壊的変更）。`$.length()` ではなく `$.content` と `$.page` を見る
- Repository の派生クエリが `findAllByOrderBy…` / `findByOperatorOrderBy…` から
  `findAll(Pageable)`（継承）/ `findByOperator(Operator, Pageable)` に変わる。並び順は `Pageable` の `Sort` が持つ
- 一覧は `SELECT … LIMIT/OFFSET` と `SELECT COUNT(*)` の **2 本の SQL** になる（総件数を返すため）
- PATCH に `{}` を送っても何も変わらず、UPDATE も発行されない（`updatedAt` も進まない）
- 422 の原因が 2 つになる（0 除算・結果の桁あふれ）
- `api-console.html` を一覧のページング・Merge Patch・桁あふれに対応させる

## 不採用案

| 案 | 不採用の理由 |
|---|---|
| 楽観ロック（`@Version` + ETag / `If-Match`、412 / 428）| 同時更新の上書き防止の定番だが、`@Version` だけでは REST 越しに効かず、ETag まで入れて初めて意味がある。「必要最低限」を超える |
| クライアント指定のソート（`?sort=`）| 上記の内部表現漏れ。API 名 → フィールド名の対応表を持つほどの需要がない |
| カーソル（keyset）ページング | 大量データ・無限スクロールでは定番だが、学習用の規模ではオフセット方式で十分。`page/size` の方が概念が素直 |
| 一覧を配列のまま `Link` / `X-Total-Count` ヘッダで返す | Spring の標準的な書き方から外れる。ボディにメタ情報を持つ方が主流 |
| `JsonNullable`（openapitools）で Merge Patch | 依存が増える。項目 1 つには過剰 |
| `Optional<String>` で Merge Patch | Jackson 3 では「項目なし」も `Optional.empty()` になり、「null を明示」と区別できない（テストで確認）|
| `JsonNode` を Controller で受ける | DTO（record）を経由しなくなり、`@Valid` による検証も型変換も手書きになる |
| 未知のプロパティを 400 にする（`FAIL_ON_UNKNOWN_PROPERTIES`）| Boot の既定（無視する＝寛容な受け手）が一般的。互換性の面でも有利 |
| Spring Framework 7 のネイティブ API バージョニング | パスの `/api/v1` が今も最もポピュラーで分かりやすい。複数バージョンを並走させる需要がない |
