# カリキュラム — 計算 API で学ぶ「API の基本」と「AI 駆動開発の大局」

- 対象リポジトリ: この `calc-api`（`POST /api/v1/calculations` の 1 本だけ）
- 前提知識: Java の文法が読める程度。Spring の経験は不要
- 全 11 モジュール / 1 モジュール 30〜60 分 / 合計 8〜10 時間
- 作成: 2026-09-12

> 📖 **解説本体は [textbook.md](textbook.md)（全 12 章 + 用語集）。**
> このファイルは「何をどの順でやるか」の**進め方**、textbook.md は「それが何で、なぜそうなのか」の**解説**。
> 各モジュールを始める前に、対応する章を読むとよい。

---

## 0. このカリキュラムの設計思想

### 二軸で学ぶ

| 軸 | 問い | 到達点 |
|---|---|---|
| **A. API の基本** | HTTP のリクエストが、コードのどこを通って、どうレスポンスになるか | 1 本のリクエストの旅を、ファイル名を挙げながら口で説明できる |
| **B. AI 駆動開発の大局** | AI がコードを書く時代に、人間が持っていなければならない解像度は何か | 「何を自分で決め、何を AI に任せ、何を機械に強制させるか」を線引きできる |

B を強く意識する、という要望に沿って、**各モジュールに「AI 駆動の観点」節を必ず付けた**。
最後の M9 / M10 が B 軸の本丸。

### 合格条件は「動かせた」ではなく「説明できる」

[ADR 0006](../adr/0006-pivot-to-calc-api.md) の背景にあるとおり、このプロジェクトの狙いは
**フレームワーク内部の詳細を追うことではなく、少数のコア概念を確実に説明できること**。
だから各モジュールに「口頭試問」を置いた。手が動いても答えられなければ次に進まない。

### 各モジュールの型

```
読む  →  動かす  →  壊す  →  説明する
         （必ず実際に叩く。コードを読むだけで合格にしない ← CLAUDE.md の明示ルール）
              ↑
       「壊して、落ちるのを見る」のが一番効く。
       正常系は読めば分かるが、その部品が「何を守っていたか」は壊さないと分からない。
```

> 壊す実験は必ず `git stash` / `git checkout -- .` で元に戻す。コミットしない。

---

## 1. 最初に頭に入れる 2 枚の地図

この 2 枚が「大局」そのもの。以降のモジュールは、この地図のどこを拡大しているかを常に意識する。

### 地図 1 — 1 リクエストの旅（A 軸の全体像）

```
curl / ブラウザ
  │  POST /api/v1/calculations   {"left":6,"operator":"DIVIDE","right":3}
  ▼
[ 組み込み Tomcat ]                spring-boot-starter-webmvc が起動時に立てる Web サーバー
  │
  ├─ 別オリジンからの fetch なら、先に OPTIONS プリフライト → CorsConfig が許可を返す
  ▼
[ DispatcherServlet ]              全リクエストの単一の入口。担当メソッドを探す
  ▼
[ HandlerMapping ]                 @RequestMapping("/api/v1/calculations") + @PostMapping
  ▼                                  → CalculationController#calculate
[ Jackson ]                        JSON → CalculationRequest (record)
  │                                  型が違う / operator が enum に無い → 400
  ▼
[ Bean Validation ]                @Valid が @NotNull を検査
  │                                  欠落 → MethodArgumentNotValidException → 400
  ▼
[ CalculationController ]          HTTP の通訳。計算は一切しない
  ▼
[ CalculationService ]             業務ロジック。BigDecimal で四則演算
  │                                  0 除算 → BusinessRuleException ───────────┐
  ▼                                                                           │
[ CalculationResponse (record) ]                                              │
  ▼                                                                           ▼
[ Jackson ]  DTO → JSON                               [ GlobalExceptionHandler ]
  ▼                                                      RFC 7807 ProblemDetail
200 OK                                                 400 / 422
{"left":6,"operator":"DIVIDE",...,"result":2}          application/problem+json
```

**ポイント: 登場人物は 5 人しかいない。** Controller / DTO / Service / 例外ハンドラ / 設定。
これが「Spring Boot の API」のコアで、DB や認証はこの上に乗る**追加**であって、前提ではない。

### 地図 2 — 誰が何を決めているか（B 軸の全体像）

```
     ┌────────────────────────────────────────────────────────────┐
 人  │ docs/adr/*.md      なぜそう決めたか（1 ファイル 1 決定・不可逆な判断）│
 間  │ CLAUDE.md          恒久ルール（AI に毎回読ませる常時指示）           │
 が  │ docs/brainstorm.md 合意事項・不採用案                              │
 決  │ docs/spec.md       何を作るか・受け入れ基準（planner 役）            │
 め  └────────────────────────────────────────────────────────────┘
 る                                  │ 指示
                                     ▼
     ┌────────────────────────────────────────────────────────────┐
 AI  │ src/main/**  src/test/**   実装（generator 役）                     │
 が  └────────────────────────────────────────────────────────────┘
 書                                  │ 提出
 く                                  ▼
     ┌────────────────────────────────────────────────────────────┐
 機  │ Spotless（書式）/ Checkstyle（規約）/ ArchUnit（層の向き）           │
 械  │ ./mvnw verify  →  GitHub Actions CI  →  Render へ CD               │
 が  └────────────────────────────────────────────────────────────┘
 通                                  │ 結果
 す                                  ▼
     ┌────────────────────────────────────────────────────────────┐
 記  │ docs/progress.md   やったこと・検証結果・**検証不能**・引き渡し事項    │
 録  │ docs/feedback/     スプリントの合否（evaluator 役）                  │
     │ docs/learning/     概念・つまずき（← このファイル）                  │
     └────────────────────────────────────────────────────────────┘
```

**ポイント: AI 駆動開発で人間が持つべきものは「コードを書く力」ではなく、この上下の枠。**
上（決める・書き残す）と下（機械で強制する・正直に記録する）が無いと、AI の出力は
その場では動いても、次のセッションで方針が揺れて崩れる。

---

## 2. モジュール一覧

| # | テーマ | 軸 | 目安 |
|---|---|---|---|
| M0 | 環境を立て、外から観測する | A | 60 分 |
| M1 | HTTP の境界 — Controller は何をする人か | A | 45 分 |
| M2 | データの形 — record / enum / BigDecimal | A | 45 分 |
| M3 | 入力検証とエラー設計 — 400 と 422 を分ける | A | 60 分 |
| M4 | 業務ロジック — Service と層分離の価値 | A | 45 分 |
| M5 | テスト戦略 — 3 つの粒度の使い分け | A | 60 分 |
| M6 | 契約としての API — OpenAPI と CORS | A | 45 分 |
| M7 | 設定・運用・配達 — profile / actuator / Docker / CI-CD | A | 60 分 |
| M8 | ガードレール — ArchUnit / Checkstyle / Spotless | A+B | 45 分 |
| M9 | **AI 駆動開発の運用設計**（本丸） | B | 90 分 |
| M10 | 卒業課題 — 自分が planner、AI が generator | A+B | 3 段階 |

---

## M0 — 環境を立て、外から観測する

### ねらい

中身を読む前に、**外から見た API の振る舞い**を先に体で知る。
実装を知らない利用者と同じ順序で出会うことで、「API とは契約である」が腹に落ちる。

### ⚠ 最初にやること（2026-09-12 時点の環境）

**このマシンには現在 JDK が入っていない。** 確認済み:
`java -version` が無い / `JAVA_HOME` 未設定 / winget に Java パッケージ無し /
`Program Files` 配下に JDK 無し。そのため `./mvnw verify` は
`The JAVA_HOME environment variable is not defined correctly` で止まる。

[docs/progress.md](../progress.md) には 2026-09-11 に `./mvnw verify` グリーン（15 tests）と
記録があるので、**その後に JDK が消えた**（環境の作り直し等）と考えられる。まずこれを直す。

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
# インストール後、ターミナルを開き直してから
java -version   # → openjdk version "21..." が出れば OK
```

### 動かす

```bash
./mvnw verify              # テスト 15 件 + Spotless + Checkstyle + ArchUnit が全部通ることを確認
./mvnw spring-boot:run     # 別ターミナルで起動したまま以下を叩く
```

```bash
# 正常系 — 4 演算を全部
curl -s -XPOST localhost:8080/api/v1/calculations -H 'Content-Type: application/json' \
  -d '{"left":2,"operator":"ADD","right":3}'
# {"left":2,"operator":"ADD","right":3,"result":5}

# 小数の罠が無いことを確認（M2 の伏線）
#   {"left":0.1,"operator":"ADD","right":0.2}      → 0.3（0.30000000000000004 ではない）
# 丸めと正規化
#   {"left":10,"operator":"DIVIDE","right":3}      → 3.333333333（10 桁で四捨五入）
#   {"left":50.0,"operator":"MULTIPLY","right":2}  → 100（100.0 ではない）

# 異常系 4 種 — ここが本番。ステータスコードを -i で必ず見る
#   {"left":1,"operator":"DIVIDE","right":0}  → 422
#   {"left":6,"right":3}                      → 400 + errors.operator
#   {"left":6,"operator":"PLUS","right":3}    → 400
#   not json                                  → 400

# 運用面
curl -s localhost:8080/actuator/health         # {"status":"UP"}
curl -s localhost:8080/v3/api-docs             # OpenAPI JSON
#  http://localhost:8080/swagger-ui.html       # ブラウザで Try it out
```

> 注: [README.md](../../README.md) が触れている `api-console.html`（ブラウザ用フォーム）は
> `.gitignore` 済みで、**現在のワークツリーには存在しない**。必要になったら M6 で自分で作る（課題にした）。

### 壊す

`Content-Type: application/json` を付けずに投げる → 415。
「ヘッダも契約の一部」だと分かる。

### 口頭試問

1. `POST` なのにレスポンスが 201 ではなく 200 なのはなぜか。
2. 400 が返るケースを 3 つ挙げよ。422 との違いを一文で。
3. `/actuator/health` は誰のためのエンドポイントか。

### AI 駆動の観点

**AI に何かを作らせる前に、まず自分が「動く状態」を持っていること。**
検証できない人間は、AI の「できました」を承認する権限を持てない。
CLAUDE.md の「コードを読むだけで合格を出さない。実際に動かす」はそのための規律であり、
M0 は毎回のスプリントの最初に戻ってくる原点。

---

## M1 — HTTP の境界: Controller は何をする人か

### 読む

- [CalculationController.java](../../src/main/java/com/example/calc/calculation/CalculationController.java)（全 40 行。これで全部）

### 要点

| アノテーション | 意味 |
|---|---|
| `@RestController` | このクラスは HTTP の担当。戻り値は View 名ではなく**レスポンスボディ本体**（`@Controller` + `@ResponseBody`）|
| `@RequestMapping("/api/v1/calculations")` | クラス全体のベースパス |
| `@PostMapping` | HTTP メソッドの割り当て |
| `@RequestBody` | ボディの JSON を引数の型（`CalculationRequest`）に変換させる |
| `@Valid` | 変換後、メソッドに入る**前**に Bean Validation を走らせる |

**Controller が一切やらないこと**（これが本質）:
計算しない / ステータスコードを組み立てない / JSON を手で作らない / try-catch しない。
`return service.calculate(request);` の 1 行しかないのは手抜きではなく**設計**。

コンストラクタでの DI（`CalculationController(CalculationService service)`）に注目。
`@Autowired` が無いのは、**引数 1 つのコンストラクタなら Spring が自動で使う**から。
フィールドが `final` なので、注入し忘れればコンパイルで落ちる。

### 壊す

1. `@Valid` を消す → `{"left":6,"right":3}` を投げる → **500**（`operator` が null のまま Service に届き
   `switch` で NPE）。`@Valid` が「境界で止める」ためにあると分かる。
2. `@RequestMapping` のパスを `/calculations` に変える → `/api/v1/...` が 404。
   URL は契約であり、勝手に変えるのは破壊的変更だと体感する。

### 口頭試問

1. `@RestController` と `@Controller` の違いを一文で。
2. Controller のメソッド戻り値が `CalculationResponse` なのに JSON が返るのはなぜか。誰が変換しているか。
3. なぜ Controller で `try { ... } catch (ArithmeticException e) { 422 を返す }` と書かないのか。

### AI 駆動の観点

Controller は**最も AI に任せやすい層**（定型的で、契約さえ決まれば書き方が一意）。
逆に言えば、人間が決めるのは**パス・メソッド・ステータスコード・DTO の形**という契約だけ。
指示が「計算 API 作って」だと AI は契約ごと発明してしまう。契約は先に自分で書く。

---

## M2 — データの形: record / enum / BigDecimal

### 読む

- [CalculationRequest.java](../../src/main/java/com/example/calc/calculation/dto/CalculationRequest.java)
- [CalculationResponse.java](../../src/main/java/com/example/calc/calculation/dto/CalculationResponse.java)
- [Operator.java](../../src/main/java/com/example/calc/calculation/Operator.java)

### 要点（4 つの設計判断）

**(1) DTO は `record`。** 不変・コンストラクタと `equals`/`hashCode`/`toString` が自動。
DTO は「層の境界を越えるただの入れ物」なので、振る舞いを持たせない。Lombok も要らない。

**(2) request と response をクラスごと分ける。**
今回はたまたま項目が似ているが、「受け取ってよい項目」と「返してよい項目」は本来別物。
DB を持つアプリなら `passwordHash` や `internalMemo` を response に漏らさないための防波堤になる。
CLAUDE.md の不変条件 #3「内部表現をそのまま公開しない」がこれ。

**(3) `double` ではなく `BigDecimal`。** 二進浮動小数点では `0.1 + 0.2` が `0.30000000000000004`。
電卓 API としては**バグ**。金額計算でも同じ理由で `BigDecimal` を使う。

**(4) 取りうる値が決まっているものは `String` ではなく `enum`。**
`"PLUS"` を送ると Jackson の変換段階で失敗し、**Service に届く前に** 400 になる。
`String` にしていたら、この検査を自分で書く羽目になる。

### 壊す

`CalculationRequest` / `CalculationResponse` / `CalculationService` の `BigDecimal` を `double` に
一括置換して `{"left":0.1,"operator":"ADD","right":0.2}` を投げる → `0.30000000000000004`。
**これを一度自分の目で見ておく。**（戻すのを忘れずに）

### 口頭試問

1. `record` を使う理由を 2 つ。
2. request と response の DTO を分ける理由を、このアプリ以外の例で説明せよ。
3. `operator` が enum であることによって、書かずに済んだコードは何か。

### AI 駆動の観点

**DTO は AI と人間の「共通言語」**。ここさえ固まっていれば、Controller も Service も
テストも AI がほぼ自動で書ける。逆に DTO が曖昧なまま指示すると、AI ごと・セッションごとに
違う形が生まれ、後から統合できない。**設計の最初の一手は DTO を決めること。**

---

## M3 — 入力検証とエラー設計: 400 と 422 を分ける

### 読む

- [GlobalExceptionHandler.java](../../src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java)
- [BusinessRuleException.java](../../src/main/java/com/example/calc/common/exception/BusinessRuleException.java)

### 要点

**線引き**（[docs/spec.md](../spec.md) §3）:

| | 意味 | 例 | 誰が検出 |
|---|---|---|---|
| **400** Bad Request | 入力の**形**が壊れている | 項目欠落 / JSON 不正 / enum に無い値 / 数値でない | Jackson・Bean Validation |
| **422** Unprocessable Content | 形は正しいが**実行できない** | `{"left":1,"operator":"DIVIDE","right":0}` | Service の業務ルール |

`right: 0` は JSON としても型としても完璧に正しい。だから 400 ではない。
**「構文は正しいが意味が通らない」が 422。** この区別が付くだけで、エラー設計のセンスは大きく変わる。

**RFC 7807 ProblemDetail**: エラーの形を標準化した規格。`type` / `title` / `status` / `detail` / `instance`
を持つ JSON（`Content-Type: application/problem+json`）。Spring が `ProblemDetail` クラスとして持っている。
**自前のエラー JSON 形式を発明しない**ことに価値がある（クライアント側が規格として扱える）。

**一元化の構造**:

```
Controller / Service   →  例外を投げるだけ（ステータスも JSON も知らない）
        ↓
@RestControllerAdvice GlobalExceptionHandler
        ↓  ここだけが HTTP を知っている
ProblemDetail（400 / 422）
```

だから Service は Web 以外（バッチ、CLI）から呼んでも壊れないし、
エラー応答の仕様変更はこの 1 ファイルで済む。CLAUDE.md 不変条件 #4。

`extends ResponseEntityExceptionHandler` に注目。Spring MVC が投げる標準例外
（壊れた JSON、未対応の Content-Type、enum に無い値…）の 400 化 + ProblemDetail 化を**再利用**している。
自前で書き足したのは 422 と、「どのフィールドが欠けたか」の `errors` だけ。

### 壊す

1. `@RestControllerAdvice` をコメントアウト → 0 除算が **500**（スタックトレースが漏れる）。
2. `extends ResponseEntityExceptionHandler` を外す → 壊れた JSON を投げたときの応答形式が変わる。
   「親クラスが何をタダでくれていたか」が分かる。

### 口頭試問

1. 400 と 422 の線引きを、このアプリ以外の例（例: 在庫が足りない注文）で説明せよ。
2. `GlobalExceptionHandler` が無かったら、Controller と Service はどう変わるか。
3. `ProblemDetail` を使う利点を、独自形式の `{"error":"..."}` と比べて述べよ。

### AI 駆動の観点

**エラー設計は AI が最も雑になりやすい領域。** 放っておくと Controller の中で try-catch して
`ResponseEntity.status(500).body(Map.of("error", ...))` を書き始める。
だから CLAUDE.md に不変条件 #4 として明文化し、レビューの第一チェック項目にする。
「ルールを書いておく」だけでなく「レビューで毎回見る」までがセット。

---

## M4 — 業務ロジック: Service と層分離の価値

### 読む

- [CalculationService.java](../../src/main/java/com/example/calc/calculation/CalculationService.java)

### 要点

このアプリで「業務ロジック」と呼べるのはこのクラスだけ。3 つの仕事をしている:

1. `switch` で演算を選ぶ（Java 21 の switch 式。`default` が要らないのは enum を網羅しているから）
2. 0 除算をガードして `BusinessRuleException` を投げる
3. `normalize()` で末尾ゼロを落とす（`stripTrailingZeros()` が `100` を `1E+2` にする罠への対処）

**`@Transactional` が付いていない**ことに注目。DB を触らないのでトランザクション境界が要らない。
「Service には必ず `@Transactional`」は DB を持つアプリの話であって、常に正しい訳ではない。
**定型句を反射で書かない**、というのがこの空白の教え。

**層分離の実利**: 依存が無いので `new CalculationService()` で単体テストできる（M5）。
Spring も MockMvc も DB も要らない ＝ テストが速く、壊れにくい。

### 壊す

`CalculationService` に `CalculationController` のフィールドを足して `./mvnw verify` →
**ArchUnit が落ちる**（M8 の予習）。依存の向きが機械で守られていることを体感する。

### 口頭試問

1. Controller ではなく Service に計算を置くことで、何ができるようになったか。
2. なぜこの Service に `@Transactional` が無いのか。
3. `switch` 式に `default` 節が無いのに、なぜコンパイルが通るのか。

### AI 駆動の観点

**Service は「何を計算するか」＝ 仕様そのもの。ここだけは丸投げしない。**
`normalize()` の実装方法（`stripTrailingZeros` を使うか自前か）は AI に任せてよいが、
**「10 桁で四捨五入する」「末尾ゼロを落とす」という仕様は人間が spec.md に書く**。
境目は「契約に影響するか / しないか」。

---

## M5 — テスト戦略: 3 つの粒度の使い分け

### 読む

- [CalculationServiceTest.java](../../src/test/java/com/example/calc/calculation/CalculationServiceTest.java) — 単体（7 件）
- [CalculationControllerTest.java](../../src/test/java/com/example/calc/calculation/CalculationControllerTest.java) — スライス（4 件）
- [CalcApiApplicationTests.java](../../src/test/java/com/example/calc/CalcApiApplicationTests.java) — コンテキスト（1 件）

### 要点

| 種類 | 起動するもの | 速度 | 何を守るか |
|---|---|---|---|
| 単体（`new CalculationService()`）| 何も起動しない | 最速 | **計算が正しいか** |
| `@WebMvcTest` スライス | Web 層だけ（Controller + Advice + Jackson + Validation）。Service は `@MockitoBean` で偽物 | 速い | **HTTP として正しく振る舞うか**（ステータス・JSON の形・バリデーション）|
| `@SpringBootTest` | 全 Bean を組み立てた完全なコンテキスト | 遅い | **配線が繋がるか**（DI の解決漏れ）|

**最重要**: `@WebMvcTest` では Service がモックなので、**計算の正しさは一切検証していない**。
逆に単体テストでは HTTP を一切見ていない。
**「どのテストが何を守っていないか」を言えることが、テストを読める、ということ。**

`@MockitoBean`（Spring Boot 3.4+ / 旧 `@MockBean`）、`MockMvc`（実際に Tomcat を起動せず
DispatcherServlet を呼ぶ）、`jsonPath("$.result")` の読み方を確認する。

### 壊す（この実験が M5 の山場）

`CalculationService` の `case ADD -> req.left().add(req.right())` を `subtract` に変えて
`./mvnw test` を実行する。

- `CalculationServiceTest#足し算` → **落ちる** ✅
- `CalculationControllerTest` → **全部通る** ⚠（Service はモックだから）

これで「スライステストはロジックを守らない」が一生忘れられなくなる。

### 口頭試問

1. `@WebMvcTest` が `@SpringBootTest` より速い理由を、ロードするものの違いで説明せよ。
2. `@MockitoBean` を使うと、そのテストは何を検証できなくなるか。
3. このリポの 15 件のテストが全部通っても、**まだ壊れている可能性がある**のはどういう場合か。

### AI 駆動の観点

**AI が書いたテストは「通ることを確認するテスト」になりがち。**
モックが返した値をそのまま assert する自明なテストは、緑になるが何も守らない。
レビューでは必ず「**このテストは、どんなバグなら落ちるのか？**」を 1 件ずつ問う。
落ちるバグを言えないテストは削除してよい。

---

## M6 — 契約としての API: OpenAPI と CORS

### 読む

- [OpenApiConfig.java](../../src/main/java/com/example/calc/config/OpenApiConfig.java) と Controller の `@Operation` / `@ApiResponse` / `@Tag`
- [CorsConfig.java](../../src/main/java/com/example/calc/config/CorsConfig.java)

### 要点 1 — OpenAPI は「自動生成されるドキュメント」ではなく「機械可読な契約」

springdoc-openapi が Controller のアノテーションと DTO の型から `/v3/api-docs`（OpenAPI JSON）と
`/swagger-ui.html` を生成する。この JSON からクライアントコードを生成したり、契約テストをしたりできる。
**コードが唯一の正で、ドキュメントはそこから落ちてくる**ので、ドキュメントだけ古い、が起きにくい。

### 要点 2 — CORS はブラウザの安全機構

- ブラウザは「今開いているページのオリジン」と違うオリジンへの fetch/XHR を**既定でブロック**する。
- サーバーが `Access-Control-Allow-*` ヘッダで許可を返すと通る。
- 副作用のあるリクエスト（POST など）の前に、ブラウザは `OPTIONS` **プリフライト**を送る。
- **curl は CORS の影響を受けない**（ブラウザの機構だから）。「curl では通るのにブラウザで失敗する」の正体。

このアプリは Spring Security を使わないので `WebMvcConfigurer#addCorsMappings` で完結する。
（Security を入れると MVC より手前のフィルタで弾かれるため `CorsConfigurationSource` Bean が必要になる。）

### 動かす

```bash
# プリフライトを手で撃つ
curl -i -X OPTIONS localhost:8080/api/v1/calculations \
  -H 'Origin: http://localhost:5500' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
# → 200 + Access-Control-Allow-Origin: http://localhost:5500

# 許可外オリジンなら Allow ヘッダが返らないことも確認する
curl -i -X OPTIONS localhost:8080/api/v1/calculations \
  -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST'
```

### 課題

README にある `api-console.html`（left / operator / right のフォームから叩く 1 枚 HTML）は
現在ワークツリーに無い。**これを AI に書かせて、CORS 経由で実際に叩けるところまでやる。**
`file://` 直開きは CORS で弾かれるので VS Code の Live Server（`http://127.0.0.1:5500`）から開く。
→ M10 の練習として、指示の出し方（M9）を試す良い題材。

### 口頭試問

1. OpenAPI JSON があると何が嬉しいか、2 つ。
2. プリフライトが飛ぶのはどんな時か。なぜ必要か。
3. curl では成功するのにブラウザからは失敗する。原因として何を疑うか。

### AI 駆動の観点

**OpenAPI は AI にとっての最良の入力。** 「この API を叩くフロントを書いて」と言うとき、
`/v3/api-docs` を渡せば、パス・型・エラー形式まで正確に伝わる。
自然言語で API 仕様を説明し直すより、**機械可読な契約を渡す**方が速く正確。

---

## M7 — 設定・運用・配達: profile / actuator / Docker / CI-CD

### 読む

- [application.yml](../../src/main/resources/application.yml)
- [Dockerfile](../../Dockerfile) / [render.yaml](../../render.yaml) / [ci.yml](../../.github/workflows/ci.yml)

### 要点

**プロファイル**: 同じ jar を環境ごとに設定だけ変えて動かす仕組み。
既定は `local`、Dockerfile が `SPRING_PROFILES_ACTIVE=prod` を設定し、prod ではログレベルを絞る。
`---` で区切った同一ファイル内のドキュメントで `on-profile: prod` を切り替えている。

**Actuator**: 運用用エンドポイント。`include: health,info` で**公開を絞っている**のが要点
（既定で全部出すと情報漏洩になる）。`show-details: never` も同じ理由。
Render は `healthCheckPath: /actuator/health` が UP を返すまでトラフィックを流さない。

**Dockerfile のマルチステージ + レイヤ分解**:

```
Stage1 (JDK)  依存解決 → ソースコピー → package → java -Djarmode=tools ... extract --layers
Stage2 (JRE)  dependencies → loader → snapshot-deps → application の順にコピー（非 root で実行）
```

- 依存（重い・変化しない）を先のレイヤに置く ＝ **ソースだけ変えた再ビルドが速い**
- 実行イメージは JRE のみ ＝ 小さい・攻撃面が狭い
- **イメージビルドはテストも lint もしない**（`-DskipTests -Dcheckstyle.skip`）。
  品質ゲートは CI の責務、という責務分割（[ADR 0004](../adr/0004-package-by-feature-and-guardrails.md) の「詰まった点」）

**CI/CD**: `build` ジョブが `./mvnw -B verify`（= テスト + Spotless + Checkstyle + ArchUnit）。
`deploy` ジョブは `needs: build` かつ main への push のときだけ Render のデプロイフックを叩く。
**CI（通るか）と CD（届けるか）を分けて、CI が通らなければ届かない**構造。

### 口頭試問

1. `application.yml` にプロファイルを分ける意味は。環境ごとに jar を分けないのはなぜか。
2. Dockerfile でテストを実行しないのはなぜか。それはどこで担保されているか。
3. Actuator のエンドポイントを絞る理由は。

### 未検証（正直な記録）

- `docker build` はこの環境で未検証（Docker Desktop が起動しない、と progress.md に記録あり）
- Render への実デプロイは未実施（アカウント未設定）

→ **「検証していないことを検証したと書かない」こと自体が CLAUDE.md のルール。** M9 に繋がる。

### AI 駆動の観点

インフラ設定は AI が「それらしい」ものを大量に生成できる領域だが、
**動かして確かめない限り、それらしいだけ**。ここでの規律は
「未検証は progress.md に『検証不能』と書く」。AI に書かせた設定を、検証せずに緑扱いしない。

---

## M8 — ガードレール: ArchUnit / Checkstyle / Spotless

### 読む

- [LayeredArchitectureTest.java](../../src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java)
- [pom.xml](../../pom.xml) の spotless / checkstyle プラグイン、[config/checkstyle/](../../config/checkstyle/)

### 要点

| ツール | 守るもの | 破ったら |
|---|---|---|
| **Spotless**（google-java-format）| 書式（唯一の正）| `verify` が落ちる。`./mvnw spotless:apply` で自動修正 |
| **Checkstyle** | 書式以外の規約（star import 禁止、命名 …）| `verify` が落ちる（validate フェーズ）|
| **ArchUnit** | 層の依存方向・循環依存・命名とアノテーションの対応 | テストとして落ちる |

ArchUnit の 3 ルール:

1. `*Service` は `*Controller` に依存してはいけない（依存は下向き一方向）
2. feature パッケージ間に循環が無い
3. `@RestController` は名前に `Controller` を含むクラスにだけ付けられる

**エンドポイントが 1 本しかない今、これらは過剰に見える。それが正しい理解の半分。**
残り半分は、**ルールは違反が起きる前に置くから意味がある**ということ。
後から入れると既存コードが大量に落ちて、結局ルールの方を緩めることになる。

### 壊す

1. `import java.util.*;` を書く → Checkstyle が落ちる
2. インデントを崩す → Spotless check が落ちる → `./mvnw spotless:apply` で直る
3. M4 の実験（Service が Controller に依存）→ ArchUnit が落ちる

### 口頭試問

1. Spotless と Checkstyle の役割分担は。なぜ 2 つ要るのか。
2. ArchUnit のルールを「後から」追加するのが難しいのはなぜか。
3. `./mvnw verify` が落ちたとき、4 つのうちどれが落ちたかをどう見分けるか。

### AI 駆動の観点（ここから B 軸が本番）

> 「今はエンドポイントが 1 本しか無いが、ルールを先に置いておくことで、将来 Controller が
> Service を飛ばして何かを直に触るような違反を書いた瞬間にテストが落ちる。**人にも AI にも効くガードレール。**」
> — LayeredArchitectureTest の LEARN コメント

**これが AI 駆動開発の核心**。CLAUDE.md に日本語で「層の依存は一方向」と書いても、
AI は文脈が長くなれば破る。人間もレビューで見落とす。
**「口約束（CLAUDE.md）」と「破れない壁（ArchUnit + CI）」を二重に張る。**
壁の方が重要で、口約束は壁の意図を説明するために存在する。

---

## M9 — AI 駆動開発の運用設計（本丸）

### ねらい

「AI にコードを書かせる」ではなく、**「AI が書いても崩れない構造を人間が用意する」**へ視点を移す。
このリポジトリ全体が、その実例になっている。

### 9.1 役割の分担 — planner / generator / evaluator

[ADR 0001](../adr/0001-claude-workflow.md) の決定により、このプロジェクトでは Claude が
会話の中で 3 役を演じ分け、**成果物の置き場で役割を区別**している。

| 役割 | 問い | 成果物 |
|---|---|---|
| **planner** | 何を作るか。合格条件は何か | `docs/spec.md`（機能一覧・受け入れ基準・スプリント）|
| **generator** | どう実装するか | `src/**` ＋ `docs/progress.md`（やったこと・検証結果）|
| **evaluator** | 本当にできているか | `docs/feedback/sprint-N.md`（合否・バグ一覧）|

**重要なのは、同じ相手に「作らせる」と「採点させる」を連続でやらないこと。**
役割を切り替えるときは明示的に宣言し、評価は**受け入れ基準（spec.md §4）を読み直してから**行う。

### 9.2 記憶をどこに置くか — 「チャット履歴に溜めない」

ADR 0001 §3 の決定:

> 共有の単一情報源は git。CLAUDE.md・docs/・`.claude/settings.json`・ArchUnit テストを git 管理し、
> **チャット履歴と個人メモリに知識を溜めない**。

AI 駆動開発で最も壊れやすいのは**セッションを跨いだ一貫性**。
会話は消える。だから、残すべきものを種類ごとに置き場を決める:

| 種類 | 置き場 | 寿命 |
|---|---|---|
| 恒久ルール（毎回守らせたい）| `CLAUDE.md` | 永続・毎回 AI が読む |
| 不可逆な判断と**その理由** | `docs/adr/NNNN-*.md` | 永続・1 ファイル 1 決定 |
| 現在の仕様・合格条件 | `docs/spec.md` | 現行版のみ（古いのは git tag に）|
| やったこと・**検証不能だったこと** | `docs/progress.md` | 追記 |
| 概念の理解・つまずき | `docs/learning/` | 追記（このファイル）|
| 現在地（次のセッションの入口）| `README.md` の「現在地」節 | 常に最新 |

**新セッションの入口が README → brainstorm → spec の順に決まっている**のは、
AI が毎回同じ前提から始められるようにするための設計。

### 9.3 ADR — 「なぜ」を残す唯一の場所

コードを読めば **what** と **how** は分かる。**why は絶対に分からない。**
[ADR 0006](../adr/0006-pivot-to-calc-api.md) を読むと:

- なぜタスク管理 API をやめたか（題材が大きすぎてコア概念が埋もれた）
- **不採用案とその理由**（命名だけ改善 / 別ドメイン / 両方残す / 別リポジトリ）

**不採用案を書き残すのが ADR の一番の価値。** これが無いと、半年後に自分か AI が
同じ案を再提案して同じ議論をやり直す。AI は特に「良さそうな案」を無限に出してくるので、
「その案は 0006 で不採用にした」と即答できる状態が効く。

### 9.4 指示の粒度 — 悪い指示と良い指示

| | 指示 | 何が起きるか |
|---|---|---|
| ❌ | 「割り算にバリデーション足して」 | ステータスコードも例外クラスも AI が発明する。Controller で try-catch するかもしれない |
| ⭕ | 「spec.md §3 に行を足した。`right` が 0 かつ `DIVIDE` のとき 422、`type` は `urn:problem-type:business-rule`。ゴールデンパス（`calculation/`）に従い、Service から `BusinessRuleException` を投げ、ハンドラは既存のものを使う。テストは ServiceTest と ControllerTest に 1 件ずつ。`./mvnw verify` まで通して、実際に curl で叩いた結果を貼って」 | 契約・置き場所・テスト・検証方法が全部決まっている |

良い指示に含まれている 5 要素:

1. **契約**（パス / ステータス / エラー形式）
2. **置き場所**（どのパッケージの、どのクラス）— ゴールデンパスがあるから一言で済む
3. **既存資産の再利用指定**（新しい仕組みを作らせない）
4. **テストの粒度**（どこに何件）
5. **検証方法**（`verify` + 実 HTTP）

### 9.5 レビューの型 — AI の出力を見るときの 6 つの問い

1. **層の向きは正しいか** — Controller が計算していないか。Service が HTTP を知っていないか
2. **DTO の境界は守られているか** — 内部表現がそのまま出ていないか。request/response が分かれているか
3. **エラーは ProblemDetail に一元化されているか** — Controller / Service がステータスを組み立てていないか
4. **テストは何のバグなら落ちるか** — モックが返した値を assert する自明なテストになっていないか
5. **受け入れ基準と一致するか** — spec.md §4 を読み直して 1 行ずつ突き合わせたか
6. **実際に叩いたか** — `./mvnw verify` の出力と curl の結果が提示されているか。無ければ承認しない

### 9.6 「AI に任せる / 人間が決める」境界表

| 判断 | 誰が | 理由 |
|---|---|---|
| 題材・スコープ・やめる判断 | **人間** | ADR 0006 がまさにこれ。AI は「やめる」を提案しにくい |
| 依存ライブラリの追加・削除 | **人間** | 不可逆に近い。JPA を入れるかどうかは設計判断 |
| HTTP 契約（パス / メソッド / ステータス / DTO の形）| **人間が決め AI が実装** | 後から変えると利用者が壊れる |
| アーキテクチャ不変条件 | **人間 ＋ 機械強制** | 口約束だけでは守られない（M8）|
| 受け入れ基準 | **人間**（planner 役）| 採点基準を被採点者に作らせない |
| 実装の書き方（`normalize()` の中身など）| **AI** | 契約に影響しない |
| 定型コード（Controller、テストの骨、OpenAPI アノテーション）| **AI** | ゴールデンパスの鏡写し |
| 書式 | **機械**（Spotless）| 人間も AI も議論しない |
| 「できた」の判定 | **人間が実行して確認** | AI の自己申告は証拠にならない |

### 9.7 ゴールデンパスという概念

CLAUDE.md より:

> `calculation/` が唯一の実装例。**新しいリソースを足すときはこの構成を鏡写しにする**。

AI に「どこに何を書くか」を毎回判断させると、セッションごとに構成が揺れる。
**「お手本を 1 つ決めて、それを真似しろ」と言えば、指示が一言で済み、結果が安定する。**
ファイルを触る順序（spec → enum/dto → service → controller → テスト → OpenAPI → progress）まで
決めてあるのも同じ理由。

### 口頭試問（M9 は全部答えられるまで M10 に進まない）

1. ADR を書く目的を 2 つ。特に「不採用案」を残す理由は。
2. CLAUDE.md と ArchUnit は同じことを守っている。なぜ両方要るのか。
3. 「テスト書いといて」が悪い指示である理由を、5 要素のどれが欠けているかで説明せよ。
4. AI が「実装完了、テストも通りました」と報告した。承認する前に自分が確認することを 3 つ。
5. 次のセッションの AI が状況を把握するために読むべきファイルを、順番に挙げよ。
6. このプロジェクトで人間が決めるべき判断を 3 つ、AI に任せてよい判断を 3 つ。

---

## M10 — 卒業課題: 自分が planner、AI が generator

**3 段階。難易度順。各段階で、自分は一行もコードを書かない。**
指示（M9.4）→ レビュー（M9.5）→ 実行して検証（M0）だけをやる。

### 課題 1（易）— `api-console.html` を復活させる

- 契約は既に決まっている（`POST /api/v1/calculations`）。CORS は設定済み
- 学ぶこと: OpenAPI を AI に渡す効果、CORS の実地確認
- 合格: Live Server から開いて 4 演算と 422 が画面で確認できる

### 課題 2（中）— 演算に `MODULO`（剰余）を追加する

- **先に自分で** `docs/spec.md` に受け入れ基準を書く（`5 % 3 = 2` / `5 % 0` は 422 か 400 か？）
- 学ぶこと: ゴールデンパスの鏡写し、enum 追加が switch 式に与える影響（網羅性チェックでコンパイルが落ちる）
- 合格: `./mvnw verify` グリーン ＋ curl で確認 ＋ `docs/progress.md` 更新
- 触るファイルの順序は CLAUDE.md のゴールデンパス節のとおり

### 課題 3（難）— 計算履歴 `GET /api/v1/calculations` を追加する

**これは実装課題ではなく設計課題。** 履歴を持つ ＝ **状態を持つ** ＝ 現在の不変条件が変わる。

自分で答えを出すべき問い:

- メモリ上で持つか、DB を入れるか（DB なら CLAUDE.md 不変条件 #1 に Repository 層を戻す必要がある）
- それは [ADR 0006](../adr/0006-pivot-to-calc-api.md) で「撤去する」と決めたものを戻すことになる。
  **新しい ADR（0007）を書く**べき事案か
- 「計算 API は状態なし」という現在の設計の美点を壊してまでやる価値があるか

**答えは「やらない」でもよい。** ADR に「不採用」として理由ごと書き残せば、それが最良の成果物。
**やらない判断を、理由付きで文書に残せたら卒業。**

---

## 付録 A — 総合口頭試問（最終確認）

全部に答えられたらこのリポジトリは卒業。

**A 軸（API の基本）**

1. `POST /api/v1/calculations` に JSON を投げてから 200 が返るまで、通る部品を順に挙げよ
2. 400 / 422 / 500 が返る具体例を 1 つずつ
3. Controller / Service / DTO / 例外ハンドラの責務を各一文で
4. `record` / `enum` / `BigDecimal` をそれぞれ選んだ理由
5. 単体 / `@WebMvcTest` / `@SpringBootTest` が守るものと守らないもの
6. ProblemDetail（RFC 7807）とは何で、なぜ独自形式より良いのか
7. CORS のプリフライトはいつ飛び、何を確認しているか
8. OpenAPI JSON があると何ができるか
9. `./mvnw verify` が実行する 4 つのチェック
10. 本番プロファイルで変わることを挙げよ

**B 軸（AI 駆動開発の大局）**

11. このリポジトリで「人間が決めること」を 5 つ
12. CLAUDE.md / spec.md / ADR / progress.md の役割の違い
13. ArchUnit のルールを最初から置く理由
14. AI への指示に含めるべき 5 要素
15. AI の出力をレビューする 6 つの問い
16. 「検証不能」と正直に書くことの価値
17. ゴールデンパスを 1 つに絞る理由
18. ADR に不採用案を書く理由
19. 新しいセッションの AI が最初に読むべきファイルとその順序
20. このプロジェクトに **登場しない** 概念を 5 つ挙げ、それを知っていることの意味を述べよ

---

## 付録 B — 意図的に登場しないもの（大局の外周）

README より: 「**すべての API が DB や認証を必要とするわけではない**ということ自体が学びになる。」
ただし、**何が欠けているかを知っている**ことも大局の一部。

| 概念 | このリポでの扱い | 学ぶなら |
|---|---|---|
| DB / JPA / Repository / トランザクション | 無し | git tag `archive/task-api`（PostgreSQL + Flyway 版）|
| 認証 / 認可（JWT、所有者ベース）| 無し | 同上（Spring Security 版）|
| ページング / 絞り込み / N+1 | 無し | 同上 |
| マッパー（MapStruct）| 無し | 同上（旧 ADR 0005）|
| 冪等性 / リトライ / レート制限 / キャッシュ | 未登場 | 状態を持つ API を作るとき |
| 非同期・イベント駆動 | 未登場 | — |
| API バージョニング戦略 | `/api/v1` という形だけ採用 | 破壊的変更を出すとき |
| 監視・トレーシング・構造化ログ | actuator の health のみ | 本番運用時 |

`git show archive/task-api:docs/spec.md` のように、タグから旧実装のファイルを直接読める。

---

## 付録 C — 進め方の目安

| 日 | やること |
|---|---|
| 1 日目 | JDK 復旧 + M0 + M1（外から観測 → Controller）|
| 2 日目 | M2 + M3（データの形 → エラー設計）※ `double` 実験と handler 削除実験は必ずやる |
| 3 日目 | M4 + M5（Service → テスト戦略）※ ADD を subtract に変える実験が山場 |
| 4 日目 | M6 + M7（契約 → 運用・配達）|
| 5 日目 | M8 + M9（ガードレール → AI 駆動開発の運用）※ M9 は時間をかける |
| 6 日目〜 | M10 課題 1 → 2 →（3 は設計だけでも可）+ 付録 A の総合試問 |

各モジュール終了時に、このファイルの末尾か `docs/learning/` の別ファイルに
**「詰まった点」と「口頭試問で答えられなかった問い」**を追記していく。
それが次のセッションの AI への最良の入力になる。
