# Sprint 7 学習ノート — REST API としての仕上げ

対象: 2026-09-26 / 仕様は [spec.md](../spec.md)、決定は [ADR 0008](../adr/0008-rest-api-finishing.md)

---

## 1. この Sprint で変わったところ

```
GET /calculations?page=1&size=2&operator=DIVIDE
      │
      ▼ @PositiveOrZero / @Min / @Max（範囲外は 400）
Controller ── PagedModel で包む ◀──────────────┐
      │ page, size                              │ Page<CalculationResponse>
      ▼                                         │
Service ── PageRequest.of(page, size, 新しい順) ─┤
      │ Pageable                                │ Page<Calculation> を map
      ▼                                         │
Repository.findByOperator(op, pageable) ────────┘
      → SELECT … WHERE operator=? ORDER BY created_at DESC, id DESC LIMIT 2 OFFSET 2
      → SELECT COUNT(*) … WHERE operator=?
```

| 用語 | 一言で | このリポジトリでは |
|---|---|---|
| ページング | 一覧を「何ページ目・何件ずつ」に区切って返すこと | `?page=`（0 始まり）`&size=`（1〜100）|
| `Pageable` / `PageRequest` | ページ番号・件数・並び順をまとめた Spring Data の型 | Service が `PageRequest.of(...)` で作る |
| `Page` | 1 ページ分の中身 ＋ 総件数・総ページ数 | Repository と Service の戻り値 |
| `PagedModel` | `Page` を安定した JSON 形にする DTO | Controller の戻り値。`{content, page}` |
| JSON Merge Patch | 「書いた項目だけ変わる。null を書いたら消える」という PATCH の規則（RFC 7396）| `MemoUpdateRequest` |
| メソッドバリデーション | `@RequestParam` などの引数に直接付けた制約の検証 | `size` の `@Max(100)` |

## 2. 概念の核心

### 2.1 一覧は必ずページングする

全件を返す一覧は、データが増えるほど応答が遅く・重くなり、いつか壊れる。
「件数が少ないうちは要らない」ではなく、**API の形として最初から入れておく**のが定石。
あとから入れると、レスポンスが配列 → オブジェクトに変わる破壊的変更になる（今回まさにそうなった）。

- `page` は 0 始まり（Spring Data の流儀）
- `size` には上限を置く。上限が無いと `?size=1000000` で全件取得と同じになる
- 範囲外は**黙って丸めず 400**。クライアントが自分の誤りに気づける
- 最終ページより先は 200 と空の `content`。コレクション自体は存在するので 404 ではない
- 総件数を返すために `COUNT(*)` が 1 本余計に飛ぶ（件数が膨大ならこれが重くなる → カーソル方式の出番）

### 2.2 並び順をクライアントに開放しない理由

`Pageable` を Controller の引数で直接受けると、`?sort=leftOperand,asc` が効くようになる。
`leftOperand` は**エンティティのフィールド名**で、API の項目名（`left`）ではない。つまり内部表現が
API の仕様に漏れる。存在しない名前を送られると例外（500）にもなる。
今回は `page` / `size` だけを受け取り、並び順はサーバーが決めた。

### 2.3 PATCH は「省略」と「null」を区別する

| 送る本文 | 意味 |
|---|---|
| `{}` | 何も変えない |
| `{"memo": null}` | メモを消す |
| `{"memo": "x"}` | メモを x にする |

Java の `String memo` では、省略も null もどちらも `null` になり区別できない。
ここを雑にすると「別の項目だけ更新したつもりが、送らなかった項目まで消えた」という事故になる。

### 2.4 エラーの形は 500 も含めて 1 種類

クライアントは「エラーなら ProblemDetail」と 1 通りだけ解釈すればよい、という状態が理想。
想定外の例外（バグ）も `@ExceptionHandler(Exception.class)` で ProblemDetail にする。
ただし `detail` に例外メッセージを**載せない**（SQL・クラス名などの内部情報が漏れる）。原因はログにだけ残す。

### 2.5 入口の検証だけでは守れない制約がある

入力は `@Digits(integer = 28)` を通っても、**計算結果**は 29 桁以上になりうる（28 桁 + 28 桁）。
入口で決まらない制約は、計算した直後に業務ルールとして確かめる（→ 422）。
確かめないと DB が拒否して 500 になる。「バリデーションはスキーマと対で考える」（Sprint 6）の続き。

## 3. つまずいたところ（実際に起きたこと）

### 3.1 `Optional<String>` では「省略」を見分けられなかった

最初は `record MemoUpdateRequest(Optional<String> memo)` で「省略 = null / null = `Optional.empty()`」と
区別するつもりだった（Jackson 2 系の一部ではそう動くと言われる）。テストを書いたら、**Jackson 3 は
項目が無いときも `Optional.empty()` を入れる**ことが分かり、失敗した。
→ JSON を `Map<String, String>` で受けて `containsKey("memo")` で判定する形に変えた
（`@JsonCreator(mode = DELEGATING)`）。**ライブラリの挙動は思い込まずテストで確かめる**。

### 3.2 古いアプリが 8080 番を握ったままだった

修正後に叩いたのに、レスポンスが配列のまま・500 も古い形のままだった。原因は、前回止めたつもりの
`./mvnw spring-boot:run` の**子プロセス（java）が生き残っていた**こと。新しいアプリはポート競合で起動に
失敗していた。→「直したのに変わらない」ときは、まず**本当に新しいプロセスに当たっているか**を疑う。

### 3.3 同じ時刻なのに見た目が違った

作成直後のレスポンスは `…51.948067100Z`、GET すると `…51.948067Z`。Java の `Instant.now()` はナノ秒まで
持つが、DB の `timestamp` はマイクロ秒まで。Sprint 6 の「末尾ゼロ」と同じ種類の問題で、
**DB の精度に先に揃える**（`truncatedTo(ChronoUnit.MICROS)`）ことで解決した。

### 3.4 OpenAPI に内部の目印が出た

`MemoUpdateRequest` に足した `memoSpecified` が、Swagger UI に「送る項目」として載った。
DTO の項目は API の契約として外に見える。内部の目印は `@Schema(hidden = true)` で隠した。

## 4. 復習問（答えは下）

1. 一覧 API にページングを最初から入れておくべきなのはなぜ？
2. `?size=1000` を 100 に丸めて返すのではなく 400 にするのはなぜ？
3. `?page=99`（最終ページより先）が 404 ではなく 200 なのはなぜ？
4. `Pageable` を Controller の引数で直接受けると、何が漏れる？
5. PATCH で「省略」と「null」を区別しないと、どんな事故が起きる？
6. 500 の ProblemDetail の `detail` に、例外のメッセージを入れてはいけないのはなぜ？
7. `@Digits` で入力を検証しているのに 500 が起きたのはなぜ？ どこで防ぐべき？
8. `Page` をそのまま JSON にせず `PagedModel` に包むのはなぜ？ なぜ Service ではなく Controller で包む？
9. `PATCH {}` を送ったとき UPDATE 文が発行されないのはなぜ？
10. 楽観ロックを今回入れなかったのはなぜ？ `@Version` だけでは何が足りない？

### 答え

1. 全件返しはデータ量に比例して重くなり、いつか壊れる。あとから入れるとレスポンスの形が変わる
   破壊的変更になり、すべてのクライアントに影響する。
2. 丸めると、クライアントは「1000 件頼んだのに 100 件しか来ない」理由が分からず、誤りに気づけない。
   受け付けられない指定ははっきり 400 で返す方が、契約として分かりやすい。
3. コレクション（`/calculations`）は存在していて、そのページに該当する中身が 0 件なだけ。
   「宛先が無い」わけではない。総件数（`page.totalElements`）も一緒に返るので、クライアントは状況が分かる。
4. `?sort=` でエンティティのフィールド名（`leftOperand` など）を指定できるようになり、内部表現が
   API の仕様になる。存在しない名前では 500 にもなる。
5. 「別の項目を更新したつもりが、送らなかった項目が消えた」。このアプリでは `{}` でメモが消えていた。
6. SQL・テーブル名・クラス名など、攻撃の手がかりになる内部情報が外に漏れるから。原因はサーバーの
   ログ（スタックトレース付き）に残し、利用者には固定の文言を返す。
7. 入力は 28 桁以内でも、計算結果が 29 桁以上になったため DB（`NUMERIC(38,10)`）が拒否した。
   結果は計算するまで分からないので、Service で計算直後に検査して 422 にする。
8. `Page` の JSON は内部構造（`pageable`・`sort` など）が出て形も安定しない。`PagedModel` は Spring Data が
   用意した安定した形の DTO。ただし web 層の型なので、Service を web に依存させないよう Controller で包む。
9. `memo` を変えていないのでエンティティに変更が無く、Hibernate のダーティチェックが「変更なし」と
   判定するから。`@PreUpdate` も走らないので `updatedAt` も進まない。
10. `@Version` はサーバー内の同時実行しか防げない。REST 越しの「読んでから書くまでの間に誰かが更新した」を
    防ぐには、クライアントにバージョンを渡す ETag と、書き込み時にそれを送り返す `If-Match` が要る。
    そこまで入れると「必要最低限」を超えるので見送った。

## 5. 次にやるなら（[spec.md](../spec.md) §6）

Flyway → 1 対多リレーションと N+1 → Testcontainers → 楽観ロック（ETag / `If-Match`）。
