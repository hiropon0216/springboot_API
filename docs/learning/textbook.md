# 解説 — 計算 API で学ぶ「API の基本」と「AI 駆動開発」

IT の前提知識ゼロから読めるように書いた解説書。
この `calc-api` リポジトリの実物をずっと教材として使う。

- 進め方（何をどの順でやるか）は [curriculum.md](curriculum.md)
- こちらは**中身の解説**（それが何で、なぜそうなっているか）
- 分からない用語が出たら [付録 A: 用語集](#付録-a--用語集) を見る

| 章 | テーマ |
|---|---|
| [第 1 章](#第-1-章-そもそも-api-とは何か) | そもそも API とは何か |
| [第 2 章](#第-2-章-spring-boot-とは何を肩代わりしてくれる道具か) | Spring Boot とは何を肩代わりしてくれる道具か |
| [第 3 章](#第-3-章-リクエストが通る道1-本の旅を最初から最後まで) | リクエストが通る道 |
| [第 4 章](#第-4-章-controller--http-の通訳) | Controller — HTTP の通訳 |
| [第 5 章](#第-5-章-dto--データの入れ物) | DTO — データの入れ物 |
| [第 6 章](#第-6-章-バリデーションとエラー設計) | バリデーションとエラー設計 |
| [第 7 章](#第-7-章-service-と層という考え方) | Service と「層」という考え方 |
| [第 8 章](#第-8-章-テスト--プログラムがプログラムを検査する) | テスト |
| [第 9 章](#第-9-章-契約としての-api--openapi-と-cors) | 契約としての API — OpenAPI と CORS |
| [第 10 章](#第-10-章-設定ビルド配達) | 設定・ビルド・配達 |
| [第 11 章](#第-11-章-ガードレール--機械にルールを守らせる) | ガードレール |
| [第 12 章](#第-12-章-ai-駆動開発の大局) | AI 駆動開発の大局 |

---

# 第 1 章: そもそも API とは何か

## 1.1 コンピュータ同士の「注文窓口」

レストランを想像してほしい。

- あなた（**客**）はメニューを見て「カレーを 1 つ」と**注文**する
- 厨房（**店**）が作って、**料理**を出す
- あなたは厨房の中がどうなっているか知らないし、知る必要もない
- ただし「メニューに無いものは頼めない」「注文の言い方は決まっている」

**API（Application Programming Interface）とは、この「注文窓口」のこと。**
プログラムが別のプログラムに仕事を頼むための、決められた頼み方の窓口だ。

この `calc-api` の場合:

| レストラン | この API |
|---|---|
| 客 | ブラウザ、スマホアプリ、`curl` コマンド、他のプログラム |
| 注文 | 「6 を 3 で割って」というデータ |
| 厨房 | サーバーで動いている Java のプログラム |
| 料理 | 「2」という計算結果のデータ |
| メニュー | 「`left`・`operator`・`right` の 3 つを送ること」という決まり |

> **ここだけ覚える**
> API = プログラム同士の窓口。中身を知らなくても、決められた形で頼めば結果が返る。

## 1.2 クライアントとサーバー

- **サーバー**: 頼まれる側。ずっと起動していて、注文を待っている
- **クライアント**: 頼む側。ブラウザ、アプリ、`curl` など

`./mvnw spring-boot:run` を実行すると、あなたの PC の中でサーバーが起動し、
**ポート 8080** という「窓口番号」で注文を待ち始める。
だから `localhost:8080` に送ると届く（`localhost` = 自分自身の PC）。

## 1.3 HTTP — 注文票の書式

クライアントとサーバーがやり取りする**言葉の決まり**が **HTTP** だ。
Web ページを見るときも、この API を叩くときも、同じ HTTP を使っている。

HTTP の注文票（**リクエスト**）は 4 つの部品でできている。

```
POST /api/v1/calculations HTTP/1.1        ← ① メソッド と ② パス
Host: localhost:8080
Content-Type: application/json            ← ③ ヘッダ

{"left":6,"operator":"DIVIDE","right":3}  ← ④ ボディ
```

| 部品 | 意味 | たとえ |
|---|---|---|
| ① **メソッド** | 何をしたいのか（動詞）| 「見たい」「登録したい」|
| ② **パス** | どれに対してか（名詞）| 「どのメニューか」|
| ③ **ヘッダ** | 付帯情報 | 「支払いは現金で」「日本語で」|
| ④ **ボディ** | 本体のデータ | 「注文内容そのもの」|

**主なメソッド**:

| メソッド | 意味 | 例 |
|---|---|---|
| `GET` | 取ってくる（何も変えない）| ページを見る、一覧を取る |
| `POST` | 送る・実行する | 登録する、送信する、**計算させる** |
| `PUT` / `PATCH` | 書き換える | 更新する |
| `DELETE` | 消す | 削除する |

この API は `POST /api/v1/calculations` の 1 本だけ。

## 1.4 レスポンスとステータスコード

サーバーの返事（**レスポンス**）も同じ形をしている。

```
HTTP/1.1 200 OK                                    ← ステータスコード
Content-Type: application/json

{"left":6,"operator":"DIVIDE","right":3,"result":2}  ← ボディ
```

**ステータスコード**は 3 桁の数字で、「どういう返事か」を表す。
**先頭の 1 桁だけ覚えれば十分。**

| 先頭 | 意味 | ざっくり言うと | よく見る例 |
|---|---|---|---|
| **2xx** | 成功 | うまくいった | `200 OK`、`201 Created` |
| **3xx** | リダイレクト | 別の場所へ行って | `301`、`302` |
| **4xx** | **クライアントのせい** | あなたの頼み方が悪い | `400`、`404`、`422` |
| **5xx** | **サーバーのせい** | こちらが壊れた | `500` |

> **ここだけ覚える**
> **4xx はクライアントのせい、5xx はサーバーのせい。** この区別が全ての土台になる。
> 「0 で割った」は使い方の問題なので 4xx。バグで落ちたら 5xx。

この API が返すのは 3 種類だけ:

| コード | いつ | 例 |
|---|---|---|
| `200 OK` | 計算できた | `{"result":2}` |
| `400 Bad Request` | 送られたデータの**形**がおかしい | `operator` が無い、`"PLUS"` という存在しない演算 |
| `422 Unprocessable Content` | 形は正しいが**実行できない** | 0 で割ろうとした |

400 と 422 の違いは第 6 章でじっくりやる。ここでは「そういう区別がある」とだけ。

## 1.5 JSON — データを文字で書く書式

コンピュータ同士でデータを渡すとき、「6 と DIVIDE と 3」をどう書くか決めておく必要がある。
現在の Web で最も使われている書式が **JSON**（ジェイソン）。

```json
{
  "left": 6,
  "operator": "DIVIDE",
  "right": 3
}
```

ルールは 4 つだけ:

- `{ }` で「ひとかたまり」を表す（**オブジェクト**）
- `"名前": 値` のペアを `,` で並べる
- 値は 数値（`6`）/ 文字列（`"DIVIDE"`、必ずダブルクォート）/ 真偽（`true`）/ 空（`null`）/ 配列 `[ ]` / オブジェクト `{ }`
- 名前は必ずダブルクォートで囲む

`Content-Type: application/json` というヘッダは、「このボディは JSON 形式ですよ」という申告。
これを付け忘れると `415`（対応していない形式）が返る。**ヘッダも契約の一部**だ。

## 1.6 REST — URL の付け方の作法

**REST** は API の設計作法の一つで、今の Web API のほぼ標準になっている。
核は「**世の中のものを「リソース（名詞）」として URL で表し、それに対する動作はメソッド（動詞）で表す**」。

```
/api/v1/calculations
 │    │   └─ リソース名（名詞・複数形）
 │    └───── バージョン
 └────────── API であることを示す接頭辞
```

- 名詞で書く（`/getCalculation` のような動詞を URL に入れない。動詞はメソッドの役目）
- 複数形にする（`/calculations`。「計算たちの集まり」に対して POST する、という感覚）
- `v1` を入れておくと、将来仕様を大きく変えるときに `v2` を並行して出せる

### なぜ計算なのに POST で、200 なのか

- **なぜ GET ではないのか**: GET は「取ってくるだけ」の約束で、URL にデータを載せる。
  計算の入力を送るには POST でボディに載せる方が素直
- **なぜ 201 ではないのか**: `201 Created` は「新しいものを作った」という意味。
  この API は計算して返すだけで、サーバーに何も残らない（**状態を持たない**）。だから `200 OK`

> **ここだけ覚える**
> URL は名詞、動作はメソッド。ステータスコードは「何が起きたか」を数字で表す共通語。

---

# 第 2 章: Spring Boot とは何を肩代わりしてくれる道具か

## 2.1 フレームワークとは

自分で HTTP を一から実装するのは大変だ。
「ポートを開いて待ち受ける」「送られてきた文字列を解析する」「JSON を Java のデータに変換する」……
こういう**どのアプリでも同じになる面倒な部分**を、あらかじめ用意してくれるのが**フレームワーク**。

- **ライブラリ**: あなたが呼ぶ道具（例: 日付を整形する関数）
- **フレームワーク**: **あなたを呼ぶ**土台（リクエストが来たら、あなたのメソッドを呼んでくれる）

**Spring Boot** は Java で Web アプリを作るための最も普及したフレームワーク。
このプロジェクトでは **Java 21 / Spring Boot 4.0.8** を使っている。

## 2.2 起動の入り口

[CalcApiApplication.java](../../src/main/java/com/example/calc/CalcApiApplication.java) はたった数行:

```java
@SpringBootApplication
public class CalcApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(CalcApiApplication.class, args);
  }
}
```

`main` メソッドは Java プログラムの入り口。ここで `run` を呼ぶと Spring Boot が:

1. **Tomcat**（Web サーバー）をアプリの中に組み込んで起動する（だから別途サーバーを立てなくていい）
2. プロジェクト内のクラスを**自動で探し回り**、必要なものを組み立てる
3. ポート 8080 で待ち受け開始

> Web サーバーがアプリに**組み込まれている**のが Spring Boot の特徴。
> 昔は「サーバーを立ててアプリを配置する」手順が必要だった。

## 2.3 アノテーション — コードに貼る付箋

`@` で始まるものを**アノテーション**と呼ぶ。クラスやメソッドに貼る**付箋**だと思えばいい。
付箋自体は何もしないが、**フレームワークがそれを読んで動きを変える**。

このプロジェクトに出てくる付箋の一覧:

| 付箋 | 貼る場所 | 意味 |
|---|---|---|
| `@SpringBootApplication` | 起動クラス | 「ここがアプリの入り口。この下を全部探して」 |
| `@RestController` | クラス | 「HTTP の窓口担当です」 |
| `@Service` | クラス | 「業務ロジック担当です」 |
| `@Configuration` | クラス | 「設定を書く場所です」 |
| `@RequestMapping` / `@PostMapping` | クラス / メソッド | 「この URL とメソッドを担当します」 |
| `@RequestBody` | 引数 | 「ボディの JSON をこの型に変換して渡して」 |
| `@Valid` | 引数 | 「中に入る前に検査して」 |
| `@NotNull` | フィールド | 「空っぽは許さない」 |
| `@RestControllerAdvice` | クラス | 「例外が出たらここが受け取ります」 |
| `@Test` | メソッド | 「これはテストです」 |

## 2.4 DI（依存性の注入）— 部品を自分で作らない

Controller は Service を使う。素直に書くとこうなる:

```java
// ❌ 自分で作る
public class CalculationController {
  private final CalculationService service = new CalculationService();
}
```

Spring ではこう書く:

```java
// ⭕ 外から渡してもらう
public class CalculationController {
  private final CalculationService service;

  CalculationController(CalculationService service) {   // コンストラクタで受け取るだけ
    this.service = service;
  }
}
```

**Spring が起動時に `CalculationService` のインスタンスを 1 個作り、Controller に渡してくれる。**
これが **DI（Dependency Injection / 依存性の注入）**。
Spring が管理してくれるこれらのオブジェクトを **Bean**（ビーン）と呼ぶ。

なぜ嬉しいのか:

1. **差し替えられる**: テストのとき、本物の代わりに**偽物の Service** を渡せる（第 8 章）
2. **作る順番を気にしなくていい**: A が B を、B が C を必要とする……を Spring が解決する
3. **設定が 1 か所**: DB 接続など重い部品を毎回作らず、1 個を使い回せる

`@Autowired` という付箋が無いのは、**引数が 1 つのコンストラクタなら Spring が自動でそれを使う**から。
フィールドが `final` なので、渡し忘れたらコンパイル時点で失敗する（＝ 実行前に気づける）。

> **ここだけ覚える**
> DI = 「必要な部品を自分で `new` せず、外から渡してもらう」。差し替え可能になるのが最大の利点。

## 2.5 Maven と pom.xml — 部品表とビルド手順

Java のプログラムを動く形にするには、

- 外部のライブラリ（Spring 本体など）をダウンロードして揃える
- ソースコードをコンパイルする
- テストを実行する
- 配布用の 1 個のファイル（**jar**）にまとめる

という作業がいる。これを自動化する道具が **Maven**（メイヴン）。
設定は [pom.xml](../../pom.xml) 1 ファイルに書く。

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-webmvc</artifactId>
</dependency>
```

これが「**依存（dependency）**」＝ 使う外部部品の宣言。名前を書くだけで自動ダウンロードされる。

**starter** は「よく一緒に使うものの詰め合わせ」。
`spring-boot-starter-webmvc` と 1 行書くだけで、Tomcat・HTTP 処理・JSON 変換（Jackson）などが全部入る。

このプロジェクトの依存は 5 つだけ:

| 依存 | 役目 |
|---|---|
| `spring-boot-starter-webmvc` | Web サーバーと HTTP 処理 |
| `spring-boot-starter-validation` | 入力チェック（`@NotNull` など）|
| `spring-boot-starter-actuator` | 運用用エンドポイント（死活監視）|
| `springdoc-openapi-starter-webmvc-ui` | API ドキュメントの自動生成 |
| テスト用 3 つ | テストの道具立て |

**`mvnw`** は「Maven Wrapper」。Maven 本体をインストールしていなくても、
リポジトリに同梱されたこのスクリプトが正しいバージョンの Maven を取ってきて実行してくれる。
だから誰の PC でも同じ結果になる。

よく使うコマンド:

| コマンド | すること |
|---|---|
| `./mvnw spring-boot:run` | アプリを起動する |
| `./mvnw verify` | コンパイル → テスト → 各種チェックを全部やる |
| `./mvnw spotless:apply` | コードの書式を自動整形する |

> ⚠ 2026-09-12 時点、**この PC には Java（JDK）が入っていない**ため上記は動かない。
> `winget install EclipseAdoptium.Temurin.21.JDK` で入れてから。詳細は [curriculum.md の M0](curriculum.md#m0--環境を立て外から観測する)。

---

# 第 3 章: リクエストが通る道（1 本の旅を最初から最後まで）

ここが本書の背骨。**この 1 枚が読めれば、Web API の基本は理解できたと言っていい。**

```
curl / ブラウザ
  │  POST /api/v1/calculations   {"left":6,"operator":"DIVIDE","right":3}
  ▼
① [ 組み込み Tomcat ]              ポート 8080 で受け取る
  │
  ├─ ブラウザからの別オリジンなら、先に OPTIONS プリフライト → CorsConfig（第 9 章）
  ▼
② [ DispatcherServlet ]            全リクエストの単一の入口。交通整理役
  ▼
③ [ HandlerMapping ]               URL とメソッドから担当者を探す
  ▼                                  → CalculationController#calculate
④ [ Jackson ]                      JSON の文字列 → CalculationRequest（Java のオブジェクト）
  │                                  形が違う / 存在しない operator → 400
  ▼
⑤ [ Bean Validation ]              @Valid が @NotNull を検査
  │                                  項目が欠けている → 400
  ▼
⑥ [ CalculationController ]        HTTP の通訳。計算は一切しない
  ▼
⑦ [ CalculationService ]           業務ロジック。BigDecimal で四則演算
  │                                  0 除算 → BusinessRuleException を投げる ──┐
  ▼                                                                          │
⑧ [ CalculationResponse ]          結果を入れた Java のオブジェクト            │
  ▼                                                                          ▼
⑨ [ Jackson ]  オブジェクト → JSON            ⑩ [ GlobalExceptionHandler ]
  ▼                                              例外を受け取り ProblemDetail に変換
200 OK                                         400 / 422
{"left":6,...,"result":2}                      application/problem+json
```

各駅の解説:

| # | 誰 | 何をする |
|---|---|---|
| ① | Tomcat | ネットワークから届いた文字列を HTTP として解釈する。Spring Boot に組み込まれている |
| ② | DispatcherServlet | Spring MVC の総合受付。**全てのリクエストが必ずここを通る** |
| ③ | HandlerMapping | 「`POST /api/v1/calculations` の担当は誰か」を付箋（`@PostMapping`）から探す |
| ④ | Jackson | JSON ⇔ Java オブジェクトの変換ライブラリ。自分で書く必要はなく自動 |
| ⑤ | Bean Validation | `@NotNull` などの制約を検査する仕組み |
| ⑥ | Controller | 受け取って Service に渡し、戻り値を返すだけ（第 4 章）|
| ⑦ | Service | 実際に計算する（第 7 章）|
| ⑧ | DTO | データの入れ物（第 5 章）|
| ⑨ | Jackson | 戻り値のオブジェクトを JSON 文字列に変換して返す |
| ⑩ | 例外ハンドラ | エラーを統一フォーマットに変換する（第 6 章）|

> **ここだけ覚える**
> **自分で書いたのは ⑥⑦⑧⑩ だけ。**①〜⑤と⑨は Spring Boot が肩代わりしている。
> 「フレームワークを使う」とは、この分担に乗ることを言う。

そして登場人物は結局 **Controller / DTO / Service / 例外ハンドラ / 設定** の 5 種類しかいない。
データベースや認証は、この骨格の**上に乗る追加**であって、前提ではない。

---

# 第 4 章: Controller — HTTP の通訳

📄 [CalculationController.java](../../src/main/java/com/example/calc/calculation/CalculationController.java)（全 40 行）

```java
@RestController
@RequestMapping("/api/v1/calculations")
public class CalculationController {

  private final CalculationService service;

  CalculationController(CalculationService service) {
    this.service = service;
  }

  @PostMapping
  public CalculationResponse calculate(@Valid @RequestBody CalculationRequest request) {
    return service.calculate(request);
  }
}
```

## 4.1 付箋を 1 つずつ

| 付箋 | 意味 |
|---|---|
| `@RestController` | 「このクラスは HTTP 担当。メソッドの**戻り値をそのままレスポンスの本体にする**」 |
| `@RequestMapping("/api/v1/calculations")` | クラス全体の担当 URL |
| `@PostMapping` | 「POST で来たらこのメソッド」 |
| `@RequestBody` | 「ボディの JSON を `CalculationRequest` 型に変換して渡して」 |
| `@Valid` | 「変換したあと、メソッドに入る**前に**検査して」 |

`@RestController` は `@Controller` + `@ResponseBody` の短縮形。
昔の Web アプリでは戻り値が「表示する HTML ページの名前」だったが、
API では「返すデータそのもの」なので `@RestController` を使う。

## 4.2 このクラスが「やらないこと」が本質

本体はたった 1 行 `return service.calculate(request);` だ。これは手抜きではなく**設計**。

Controller が**やらない**こと:

- ❌ 計算しない
- ❌ ステータスコードを組み立てない
- ❌ JSON を手で作らない
- ❌ `try { } catch { }` でエラー処理しない

なぜか。**役割を 1 つに絞ると、変更が 1 か所で済むから。**

- 計算のルールが変わった → Service だけ直す
- エラーの返し方を変えたい → 例外ハンドラだけ直す
- URL を変えたい → Controller だけ直す

もし Controller に全部書いてあったら、どの変更でもこの 1 つのファイルを触ることになり、
「計算を直したつもりが URL を壊した」という事故が起きる。

> **ここだけ覚える**
> Controller は「HTTP の通訳」。受け取って渡す、返ってきたものを返す。それ以上のことをさせない。

## 4.3 実験: `@Valid` を消してみる

`@Valid` を消して `{"left":6,"right":3}`（`operator` が無い）を送ると、
`operator` が空っぽ（`null`）のまま Service に届き、計算の途中でプログラムが落ちて **500** が返る。

**500 は「サーバーのバグ」を意味する。** 本当は「あなたの送り方が足りない」＝ 400 であるべきだ。
`@Valid` は「おかしな入力を**境界で止める**」ためにある。

---

# 第 5 章: DTO — データの入れ物

📄 [CalculationRequest.java](../../src/main/java/com/example/calc/calculation/dto/CalculationRequest.java) /
[CalculationResponse.java](../../src/main/java/com/example/calc/calculation/dto/CalculationResponse.java) /
[Operator.java](../../src/main/java/com/example/calc/calculation/Operator.java)

**DTO（Data Transfer Object）= データを運ぶためだけの入れ物。**
計算もしないし、判断もしない。中身を入れて運ぶ箱。

```java
public record CalculationRequest(
    @NotNull BigDecimal left, @NotNull Operator operator, @NotNull BigDecimal right) {}
```

この 1 行に**設計判断が 4 つ**入っている。

## 5.1 `record` — データ専用クラスの短い書き方

Java 16 から入った書き方。普通のクラスで書くと:

```java
public class CalculationRequest {
  private final BigDecimal left;
  // コンストラクタ、getter、equals、hashCode、toString …… 50 行くらい
}
```

`record` ならこれが 1 行で済み、しかも:

- **不変（immutable）**: 一度作ったら中身を変えられない → 途中で誰かに書き換えられる事故が起きない
- 値を取り出すのは `request.left()` のように**フィールド名と同じメソッド**

DTO は「運ぶだけ」なので、振る舞いを持たせない `record` がぴったり。
（そのため、フィールドを短く書くための **Lombok** というライブラリも不要になっている）

## 5.2 request と response を**別のクラス**に分ける

```java
public record CalculationRequest (BigDecimal left, Operator operator, BigDecimal right) {}
public record CalculationResponse(BigDecimal left, Operator operator, BigDecimal right, BigDecimal result) {}
```

今回は項目がほぼ同じなので「1 つにまとめればいいのでは？」と思うだろう。**それをやらない。**

理由は「**受け取ってよい項目**」と「**返してよい項目**」は本来別物だから。
例えばユーザー情報を扱う API なら:

| | 入力 | 出力 |
|---|---|---|
| 名前 | ○ | ○ |
| パスワード | ○（登録時に受け取る）| **✗（絶対に返してはいけない）** |
| 社内用メモ | ✗ | ✗ |
| 登録日時 | ✗（サーバーが決める）| ○ |

1 つのクラスを使い回すと、うっかりパスワードが外に漏れる。
**クラスを分けておくこと自体が防波堤になる。**
この習慣は CLAUDE.md の不変条件 #3「内部表現をそのまま公開しない」として明文化されている。

## 5.3 `BigDecimal` — 小数を正確に扱う

コンピュータは数値を 2 進数で持つため、`0.1` のような小数を正確に表せない。
Java の `double` 型で `0.1 + 0.2` を計算すると:

```
0.30000000000000004
```

**電卓 API としては完全なバグ。** お金の計算でも同じ問題が起きる。

`BigDecimal` は小数を「桁の並び」として正確に持つ型で、これを使えば `0.3` になる。
代わりに `a + b` とは書けず `a.add(b)` と書く必要がある（少し面倒だが、正確さと引き換え）。

このプロジェクトでは割り算だけ特別扱いしている。`10 ÷ 3` は割り切れず無限に続くので、
**10 桁で四捨五入**すると決めている（`3.333333333`）。

```java
private static final MathContext DIVISION_CONTEXT = new MathContext(10, RoundingMode.HALF_UP);
```

## 5.4 `enum` — 選択肢が決まっているもの

```java
public enum Operator { ADD, SUBTRACT, MULTIPLY, DIVIDE }
```

**enum（列挙型）= 「取りうる値がこの 4 つだけ」と型で宣言する仕組み。**

もし `String` にしていたら、`"PLUS"` でも `"たす"` でも `"あいうえお"` でも受け取れてしまい、
自分でチェックを書く羽目になる。enum にしておくと:

- **④ Jackson の変換段階で** `"PLUS"` は変換に失敗し、Service に届く前に自動的に **400** になる
- Service 側では「4 つのうちどれか」が保証されているので、余計なチェックが要らない

> **ここだけ覚える**
> 型を適切に選ぶと、**書かなくて済むコードが増える**。これがプログラミングにおける「設計」の実体。

---

# 第 6 章: バリデーションとエラー設計

📄 [GlobalExceptionHandler.java](../../src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java) /
[BusinessRuleException.java](../../src/main/java/com/example/calc/common/exception/BusinessRuleException.java)

## 6.1 バリデーション（入力検査）とは

外から来るデータは**信用できない**。項目が足りない、型が違う、常識外の値……。
これを入口で検査するのが**バリデーション**。

Java には **Bean Validation** という標準の仕組みがあり、**付箋で書ける**:

```java
public record CalculationRequest(
    @NotNull BigDecimal left,      // ← 空っぽは許さない
    @NotNull Operator operator,
    @NotNull BigDecimal right) {}
```

そして Controller の引数に `@Valid` を付けると、**メソッドが始まる前に**検査が走る。
違反があればメソッドは呼ばれず、例外が投げられ、400 が返る。

他にもよく使う制約: `@NotBlank`（空文字も不可）/ `@Size` / `@Min` `@Max` / `@Email` / `@Pattern`。

## 6.2 「例外」という仕組み

**例外（Exception）= 処理を続けられないときに、その場で中断して呼び出し元に知らせる仕組み。**

```java
if (right.signum() == 0) {
  throw new BusinessRuleException("0 で割ることはできません");   // ← 投げる
}
```

`throw` すると、その行で処理が止まり、呼び出し元へ、さらにその呼び出し元へ……と
**受け止める場所が見つかるまで遡っていく**。誰も受け止めなければプログラムが落ちる（＝ 500）。

このプロジェクトでは、**受け止める場所を 1 か所だけ用意している**（6.4）。

## 6.3 400 と 422 — これが本章の山場

| | 名前 | 意味 | 例 | 誰が見つける |
|---|---|---|---|---|
| **400** | Bad Request | 入力の**形**が壊れている | 項目が無い / JSON が壊れている / `"PLUS"` という存在しない演算 / 数値であるべき所に文字 | Jackson・Bean Validation |
| **422** | Unprocessable Content | 形は正しいが**実行できない** | `{"left":1,"operator":"DIVIDE","right":0}` | Service の業務ルール |

`right: 0` という入力は、**JSON としても型としても完全に正しい**。
`right` は数値だし、`operator` は存在する演算だ。だから「形が壊れている」＝ 400 ではない。
**数学的に実行できないだけ。** これが 422。

日本語で言い換えると:

- **400** = 「日本語になっていない」
- **422** = 「日本語としては正しいが、言っていることが実行不可能」

他の例で確かめてみる:

| 状況 | どっち |
|---|---|
| 商品 ID を送り忘れた | 400（項目欠落）|
| 商品 ID に文字列を送った（数値であるべき）| 400（型違い）|
| 存在する商品だが在庫が 0 だった | **422**（形は正しいが実行できない）|
| 注文数に `-3` を送った | 400（そもそも正の数という制約違反）|

> **ここだけ覚える**
> **400 = 形が壊れている。422 = 形は正しいが意味が通らない。**
> この区別が付くだけで、エラー設計のセンスは大きく変わる。

## 6.4 エラーの形を統一する — ProblemDetail

エラーが起きたとき、どんな JSON を返すか。自分で決めると、

```json
{"error": "エラーです"}         ← ある API
{"message": "...", "code": 3}   ← 別の API
{"errors": [{"msg": "..."}]}    ← また別の API
```

とバラバラになり、クライアント側が API ごとに個別対応する羽目になる。

そこで **RFC 7807「Problem Details for HTTP APIs」**という**世界共通の規格**がある。
Spring には `ProblemDetail` というクラスとして最初から入っている。

```json
{
  "type": "urn:problem-type:business-rule",
  "title": "計算できません",
  "status": 422,
  "detail": "0 で割ることはできません",
  "instance": "/api/v1/calculations"
}
```

| 項目 | 意味 |
|---|---|
| `type` | エラーの種類を示す URI（プログラムが分岐に使う）|
| `title` | 人間向けの短い題名 |
| `status` | ステータスコード |
| `detail` | 人間向けの具体的な説明 |
| `instance` | どのリクエストで起きたか |

`Content-Type` も `application/problem+json` になり、「これは規格に沿ったエラーです」と伝わる。

> **ここだけ覚える**
> **自前のエラー形式を発明しない。** 規格に乗ると、受け取る側が既存の道具で処理できる。

## 6.5 受け止める場所を 1 か所に — `@RestControllerAdvice`

```
Controller / Service   →  例外を投げるだけ（ステータスも JSON も知らない）
        ↓
@RestControllerAdvice  GlobalExceptionHandler
        ↓                （ここだけが HTTP を知っている）
ProblemDetail（400 / 422）
```

`@RestControllerAdvice` を付けたクラスは「**アプリ全体の例外の受け皿**」になる。
`@ExceptionHandler(BusinessRuleException.class)` と書いたメソッドが、
どこで投げられた `BusinessRuleException` でも受け取り、422 の `ProblemDetail` に変換する。

利点は 2 つ:

1. **Controller と Service が HTTP を知らなくていい** → Service を Web 以外（バッチ処理、コマンドライン）から呼んでも壊れない
2. **エラーの返し方を変えたいとき、このファイルだけ直せばいい**

これが CLAUDE.md の不変条件 #4「エラー応答は RFC 7807 ProblemDetail に統一」。

### 親クラスからタダでもらっているもの

```java
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
```

`extends`（継承）は「このクラスの機能を引き継ぐ」という意味。
`ResponseEntityExceptionHandler` は Spring が用意した親クラスで、
**Spring 自身が投げる標準的な例外**（JSON が壊れている、Content-Type が違う、enum に無い値…）を
すでに 400 + ProblemDetail に変換してくれる。

だから自分で書き足したのは 2 つだけ:

1. `BusinessRuleException` → 422
2. バリデーション違反のとき「**どのフィールドが欠けたか**」を `errors` として追加

```json
{"status":400, "title":"入力値が不正です", "errors":{"operator":"null は許可されていません"}}
```

> **ここだけ覚える**
> フレームワークが既に用意しているものは、上書きせず**乗る**。書く量が減り、標準の挙動が保たれる。

---

# 第 7 章: Service と「層」という考え方

📄 [CalculationService.java](../../src/main/java/com/example/calc/calculation/CalculationService.java)

## 7.1 「層（レイヤー）」とは

プログラムを役割ごとに横に切り分け、**上から下へ一方向にだけ呼ぶ**構造にすることを「層に分ける」と言う。

```
 [ Controller ]   HTTP を知っている層     ← 外の世界と話す
       │ 呼ぶ（この向きだけ）
       ▼
 [ Service ]      業務ロジックの層        ← 何をするかを知っている
       │ （DB があれば、この下に Repository 層が来る）
       ▼
 [ Repository ]   データ保存の層          ← このアプリには無い
```

レストランで言えば **ホール（注文を受ける）と 厨房（作る）** の分担。
ホールは料理の作り方を知らないし、厨房は客席の様子を知らない。
だから「メニュー表を変える」ことと「レシピを変える」ことが独立して行える。

**逆向きに呼んではいけない。** Service が Controller を呼び始めると、
「注文を受けるために料理を作り、料理を作るために注文を受ける」という循環が生まれ、
どこから読んでいいか分からないコードになる。

これが CLAUDE.md の不変条件 #1。しかも第 11 章で見るとおり、**機械が自動で見張っている**。

## 7.2 このアプリの Service

```java
@Service
public class CalculationService {

  public CalculationResponse calculate(CalculationRequest req) {
    BigDecimal result =
        switch (req.operator()) {
          case ADD      -> req.left().add(req.right());
          case SUBTRACT -> req.left().subtract(req.right());
          case MULTIPLY -> req.left().multiply(req.right());
          case DIVIDE   -> divide(req.left(), req.right());
        };
    return new CalculationResponse(req.left(), req.operator(), req.right(), normalize(result));
  }
```

やっていることは 3 つ:

1. **`switch` で演算を選ぶ** — `operator` の値によって処理を分岐
2. **0 除算をガードする** — `divide()` の中で 0 なら `BusinessRuleException` を投げる
3. **結果を整える** — `normalize()` で `100.0` → `100`、`2.0000000000` → `2` にする

### `default` が無いのになぜ動くのか

普通の `switch` は「どれにも当てはまらない場合」の `default` が要る。
しかし `Operator` は enum で**取りうる値が 4 つしかない**と型が保証しているので、
4 つ全部書けば漏れがないことをコンパイラが確認できる。

逆に言えば、**enum に `MODULO` を追加した瞬間、この `switch` はコンパイルエラーになる**。
「追加したのに対応を書き忘れる」事故が、実行前に防がれる。これも「型に仕事をさせる」例。

### `normalize()` の細かい話

`BigDecimal` は `100.0` と `100` を別物として扱う（桁数の情報を持っているため）。
`stripTrailingZeros()` で末尾のゼロを落とすが、これには `100` を `1E+2`（指数表記）にしてしまう癖がある。
そこで指数表記になったときだけ整数表記に戻している。

```java
BigDecimal stripped = value.stripTrailingZeros();
return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
```

**「地味だが、知らないと気づけない罠」の典型。** こういう箇所に `// LEARN:` コメントが付いている。

## 7.3 `@Transactional` が**無い**ことの意味

DB を使うアプリでは Service に `@Transactional` という付箋を付けるのが定番だ。
「途中で失敗したら全部なかったことにする」という仕組み（トランザクション）を有効にする付箋。

**このアプリには付いていない。DB を触らないので、なかったことにする対象が存在しないから。**

「Service には必ず `@Transactional`」は DB を持つアプリの話であって、常に正しいわけではない。
**意味を理解せずに定型句を反射で書かない。** この空白はそれを教えている。

## 7.4 層を分ける「実利」

抽象的な「きれいな設計」の話ではなく、具体的な得がある。

1. **テストが速く簡単になる**
   この Service は他に何も依存していないので、`new CalculationService()` するだけでテストできる。
   Spring を起動する必要も、DB を用意する必要もない（第 8 章）
2. **使い回せる**
   Service は HTTP を知らないので、将来「コマンドラインの電卓」を作るときそのまま使える
3. **変更の影響が閉じる**
   計算ルールの修正で Controller を触る必要がない

---

# 第 8 章: テスト — プログラムがプログラムを検査する

📁 [src/test/](../../src/test/java/com/example/calc/)

## 8.1 自動テストとは

**テストコード = 「このコードはこう動くはずだ」を、実行可能な形で書いたもの。**

```java
@Test
void 足し算() {
  assertThat(result("2", Operator.ADD, "3")).isEqualByComparingTo("5");
}
```

- `@Test` … 「これはテストです」という付箋
- `assertThat(実際の値).isEqualTo(期待する値)` … 期待と違えばテストが**落ちる（赤）**、合っていれば**通る（緑）**

手で毎回 `curl` を打って確認するのは、機能が増えるほど不可能になる。
テストを書いておけば `./mvnw verify` の一発で全部確認できる。

**テストの本当の価値は「書いたとき」ではなく「変更したとき」にある。**
半年後に誰か（あるいは AI）がコードを直したとき、壊したことが即座に分かる。

## 8.2 3 つの粒度

このプロジェクトには 3 種類のテストが 15 件ある。

| 種類 | 起動するもの | 速さ | 何を守るか | ファイル |
|---|---|---|---|---|
| **単体テスト** | 何も起動しない（`new` するだけ）| 最速 | **計算が正しいか** | `CalculationServiceTest`（7 件）|
| **スライステスト** | Web 層だけ（Controller・例外ハンドラ・Jackson・バリデーション）| 速い | **HTTP として正しく振る舞うか** | `CalculationControllerTest`（4 件）|
| **結合（コンテキスト）テスト** | アプリ全体 | 遅い | **部品が正しく繋がるか** | `CalcApiApplicationTests`（1 件）|

これに加えて `LayeredArchitectureTest`（3 件）があるが、これは第 11 章。

**ピラミッドの考え方**: 速くて数の多い単体テストを土台にし、上へ行くほど遅く少なくする。
全部を結合テストで書くと、実行に何分もかかり、誰も走らせなくなる。

## 8.3 モック（偽物）— スライステストの鍵

`CalculationControllerTest` にはこう書いてある:

```java
@WebMvcTest(CalculationController.class)
class CalculationControllerTest {
  @Autowired MockMvc mvc;
  @MockitoBean CalculationService service;      // ← 本物ではなく「偽物」を使う
```

**モック = 本物の代わりに置く、指示どおりに答える偽物の部品。**

```java
when(service.calculate(any())).thenReturn(new CalculationResponse(..., new BigDecimal("2")));
```

「`calculate` が呼ばれたら、計算せずに 2 を返せ」と偽物に指示している。

なぜこんなことをするのか。**Controller の検査に集中するため。**
ここで見たいのは「HTTP のステータスは正しいか」「JSON の形は正しいか」であって、
計算が合っているかは単体テストの担当だからだ。

（第 2 章の DI が効いているのがここ。Controller が自分で `new` していたら差し替えられない。）

`MockMvc` は「実際にネットワークを使わずに、HTTP リクエストが来たフリをする道具」。

## 8.4 いちばん大事なこと: **何を守っていないか**

> `@WebMvcTest` は Service がモックなので、**計算の正しさを一切検証していない**。
> 単体テストは HTTP を一切見ていない。

これを実感する実験がある。`CalculationService` の足し算を引き算に書き換えてみる:

```java
case ADD -> req.left().subtract(req.right());   // ← わざと壊す
```

`./mvnw test` の結果:

- `CalculationServiceTest#足し算` → **落ちる** ✅ 正しく検知
- `CalculationControllerTest` → **全部通る** ⚠ 偽物を使っているので気づけない

**「どのテストが何を守っていないか」を言えることが、テストを読めるということ。**

## 8.5 悪いテストの見分け方

テストは「緑になればいい」のではない。

```java
// ❌ 意味のないテスト
when(service.calculate(any())).thenReturn(A);
// ... 呼ぶ ...
assertThat(結果).isEqualTo(A);      // 自分で設定した値が返ってくるのは当たり前
```

自分でモックに仕込んだ値をそのまま検証するテストは、必ず緑になるが**何も守らない**。

> **ここだけ覚える**
> テストを見たら必ず問う: **「このテストは、どんなバグなら落ちるのか？」**
> 答えられないテストは、無いのと同じ（むしろ安心感を与える分、有害）。

---

# 第 9 章: 契約としての API — OpenAPI と CORS

## 9.1 API は「契約」である

一度公開した API の URL・入力の形・ステータスコードは、**利用者との約束**になる。
勝手に変えると、使っている全てのアプリが壊れる。だから `v1` というバージョンを URL に入れてある。

この「約束」を人にも機械にも読める形で書いたものが **OpenAPI**（旧称 Swagger）。

## 9.2 OpenAPI — 自動生成されるドキュメント

📄 [OpenApiConfig.java](../../src/main/java/com/example/calc/config/OpenApiConfig.java)

Controller に付箋を貼っておくと:

```java
@Operation(summary = "計算する", description = "left / operator / right を受け取り result を返す")
@ApiResponse(responseCode = "200", description = "計算結果")
@ApiResponse(responseCode = "422", description = "0 除算")
```

`springdoc-openapi` というライブラリが、この付箋と DTO の**型情報**を読み取って、
2 つのものを自動生成する。

| URL | 中身 |
|---|---|
| `/v3/api-docs` | **機械が読む**ための仕様書（OpenAPI 形式の JSON）|
| `/swagger-ui.html` | **人間が読む**ための画面。ブラウザからその場で API を試せる |

嬉しいこと:

1. **ドキュメントだけ古くなる、が起きにくい**（コードから生成されるため）
2. **この JSON から、API を呼ぶプログラムを自動生成できる**（各言語のツールがある）
3. **AI に「この API を使うフロント画面を作って」と頼むとき、この JSON を渡せば正確に伝わる**

## 9.3 CORS — ブラウザの安全装置

📄 [CorsConfig.java](../../src/main/java/com/example/calc/config/CorsConfig.java)

### まず「オリジン」とは

`https://example.com:443` のような「**プロトコル + ドメイン + ポート**」の組を**オリジン**と呼ぶ。
1 つでも違えば別オリジンだ。

### なぜブロックするのか

ブラウザは既定で、**表示中のページとは違うオリジンへのデータ通信をブロックする**。
これを **同一オリジンポリシー** と言い、その例外許可の仕組みが **CORS**（Cross-Origin Resource Sharing）。

理由はこうだ。あなたが銀行にログインしたまま悪意あるサイトを開いたとき、
そのサイトのスクリプトが勝手に銀行 API へ送金リクエストを送れたら大惨事になる。
だから「**送信先のサーバーが明示的に許可を返したときだけ通す**」ことにしている。

### プリフライト（事前確認）

POST のような「副作用のある」リクエストの前に、ブラウザは自動的に
**`OPTIONS` メソッドで事前確認**を送る。これを**プリフライト**と呼ぶ。

```
ブラウザ → サーバー   OPTIONS /api/v1/calculations
                     Origin: http://localhost:5500
                     Access-Control-Request-Method: POST
                     「localhost:5500 から POST してもいい？」

サーバー → ブラウザ   200 OK
                     Access-Control-Allow-Origin: http://localhost:5500
                     「いいよ」

ブラウザ → サーバー   POST /api/v1/calculations   （ここで本番のリクエスト）
```

`CorsConfig` は「どのオリジンに許可を出すか」を書いた設定だ。

```java
.allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*", ...)
.maxAge(3600)   // 事前確認の結果を 1 時間キャッシュ（毎回 OPTIONS が飛ぶのを防ぐ）
```

> **ここだけ覚える**
> **CORS はブラウザだけの仕組み。`curl` は影響を受けない。**
> 「curl では成功するのにブラウザからは失敗する」と言われたら、まず CORS を疑う。

---

# 第 10 章: 設定・ビルド・配達

## 10.1 プロファイル — 環境ごとに設定を切り替える

📄 [application.yml](../../src/main/resources/application.yml)

同じプログラムでも、**自分の PC（local）** と **本番のサーバー（prod）** では設定を変えたい。
たとえばログの量。開発中は詳しく出したいが、本番では必要な分だけにしたい。

Spring の **プロファイル** は、この切り替えを実現する仕組み。

```yaml
spring:
  profiles:
    default: local        # 何も指定しなければ local
---
spring:
  config:
    activate:
      on-profile: prod    # prod のときだけ、ここから下が有効
logging:
  level:
    root: WARN
```

`---` は YAML で「ここから別の設定ブロック」を意味する区切り。

**プログラム（jar）は 1 個だけ作り、設定で振る舞いを変える。**
環境ごとに別のプログラムを作ると、「本番でだけ動かない」事故が起きるからだ。

（`YAML` は設定を書くための書式。インデント（字下げ）で階層を表す。`#` はコメント。）

## 10.2 Actuator — 運用のための窓口

アプリが本番で動き出すと、「今ちゃんと生きているか」を外から確認する必要が出る。
Spring Boot の **Actuator** は、そのための窓口を自動で用意してくれる。

```
GET /actuator/health  →  {"status":"UP"}
```

これを**ヘルスチェック**と言い、監視ツールやクラウドが数秒おきに叩いて死活を判断する。

設定で注目すべきは、**公開するものを絞っている**点:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info    # この 2 つだけ公開
  endpoint:
    health:
      show-details: never       # 詳細は出さない
```

Actuator は環境変数やメモリ状況を見る機能も持っており、全部公開すると**情報漏洩になる**。
**必要なものだけ開ける**のはセキュリティの基本原則（最小権限）。

## 10.3 ビルドと jar

**ビルド** = ソースコード（人間が読む）を、実行できる形（機械が動かす）に変換すること。

Java の場合、`.java` ファイルをコンパイルして `.class` にし、
それらと設定ファイルをまとめて **jar** という 1 つのファイルにする。
Spring Boot の jar は Tomcat まで含んでいるので、`java -jar application.jar` だけで起動する。

## 10.4 Docker — 環境ごと箱に詰める

📄 [Dockerfile](../../Dockerfile)

「自分の PC では動くのに、サーバーでは動かない」。原因は Java のバージョン違いや OS の差だ。

**Docker** はアプリを「**OS ごと・必要なもの全部入りの箱（コンテナイメージ）**」に詰める道具。
箱ごと配れば、どこでも同じように動く。

この Dockerfile は **2 段構え（マルチステージビルド）**になっている:

```
ステージ 1（JDK 入りの箱）  依存をダウンロード → ソースをコピー → jar を作る
ステージ 2（JRE だけの箱）  ステージ 1 で作った jar だけを持ってくる
```

なぜ分けるのか:

- **コンパイルには JDK（開発キット）が要るが、実行には JRE（実行環境）だけでいい**
- 完成した箱にコンパイラやソースを残さない → **軽くなる・攻撃されにくくなる**

さらに 2 つの工夫がある:

1. **キャッシュを効かせる層分け**
   Docker は命令ごとに「層」を作り、変わっていない層は再利用する。
   **変化しにくいもの（外部ライブラリ）を先に、変化しやすいもの（自分のコード）を後に**置くと、
   コードを直しただけの再ビルドが劇的に速くなる
2. **非 root ユーザーで実行**
   `useradd spring` して権限を落としている。万一乗っ取られても被害を抑えるため

そして重要な判断:

```dockerfile
RUN ./mvnw -B -q clean package -DskipTests -Dcheckstyle.skip -Dspotless.check.skip
```

**イメージ作成時にテストを実行していない。**
「箱を作る」ことと「品質を検査する」ことは別の責務で、検査は次の CI の仕事だからだ。

## 10.5 CI / CD — 自動で検査し、自動で届ける

📄 [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

| 略語 | 正式名 | 意味 |
|---|---|---|
| **CI** | Continuous Integration（継続的インテグレーション）| コードを push するたびに**自動でビルドとテストを実行** |
| **CD** | Continuous Deployment（継続的デプロイ）| 検査を通ったものを**自動で本番に届ける** |

**GitHub Actions** は GitHub が提供する CI/CD サービスで、
`.github/workflows/` に置いた YAML の手順書どおりに、GitHub のサーバー上で処理を実行する。

このプロジェクトの手順書は 2 つの仕事（ジョブ）でできている:

```
[ build ]  どのブランチへの push でも実行
   ↓ Java 21 を用意 → ./mvnw -B verify（テスト + 各種チェック）
   │
   ↓ needs: build（build が成功したときだけ次へ）
[ deploy ] main ブランチへの push のときだけ実行
   ↓ Render（クラウド）のデプロイ用 URL を叩く → 本番が新しくなる
```

**ポイント: 検査を通らなければ、絶対に本番へ届かない。**
人間の「テストするのを忘れていた」を構造的に防いでいる。

`secrets.RENDER_DEPLOY_HOOK_URL` の `secrets` は、GitHub に安全に保管した秘密の値。
パスワードや URL をコードに直接書くと、リポジトリを見た全員に漏れるため。

> **ここだけ覚える**
> **書く → 検査する → 届ける** を、人の記憶ではなく仕組みで回す。これが現代の開発の土台。

---

# 第 11 章: ガードレール — 機械にルールを守らせる

📄 [LayeredArchitectureTest.java](../../src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java) /
[pom.xml](../../pom.xml)

## 11.1 なぜ「機械に」なのか

ここまで「Controller で計算しない」「層は一方向」といったルールが出てきた。
これらは [CLAUDE.md](../../CLAUDE.md) に日本語で書いてある。

**しかし、文章で書いたルールは必ず破られる。** 悪気がなくても、
急いでいるとき、疲れているとき、そして AI が長い会話の後半で文脈を見失ったとき。

だからこのプロジェクトでは、**ルールを機械が自動で検査する**ようにしてある。
3 つの道具があり、全部 `./mvnw verify` で走る。

| 道具 | 守るもの | 破ると |
|---|---|---|
| **Spotless** | **書式**（インデント、改行、import の順序）| ビルドが失敗。`./mvnw spotless:apply` で自動修正できる |
| **Checkstyle** | **書式以外の規約**（`import java.util.*;` の禁止、命名規則など）| ビルドが失敗 |
| **ArchUnit** | **構造**（層の依存方向、循環参照、命名とアノテーションの対応）| テストとして失敗 |

## 11.2 Spotless — 書式の議論をやめる

インデントは 2 文字か 4 文字か。改行位置は。……この手の議論は生産性を生まない。

Spotless は **google-java-format**（Google が定めた書式）を唯一の正として、機械的に整形する。
**人間も AI も、書式について意見を持たない。** 意見の余地を無くすことが目的。

## 11.3 ArchUnit — 構造をテストとして書く

**ArchUnit は「コードの構造」を検査するテストライブラリ。**

```java
// 「Service で終わる名前のクラスは、Controller で終わる名前のクラスに依存してはいけない」
noClasses().that().haveSimpleNameEndingWith("Service")
    .should().dependOnClassesThat().haveSimpleNameEndingWith("Controller");
```

これを書いておくと、**誰かが Service に Controller を注入した瞬間にテストが赤くなる**。
レビューで人間が目視で見つける必要がない。

このプロジェクトの 3 ルール:

1. Service は Controller に依存しない（第 7 章の一方向）
2. 機能パッケージ同士が循環参照しない
3. `@RestController` は名前に `Controller` を含むクラスにだけ付けられる

## 11.4 「今は過剰では？」への答え

エンドポイントが 1 本しかない今、これらのルールは明らかに過剰に見える。それは半分正しい。

残り半分の理由はこうだ。**ルールは、違反が起きる前に置くから意味がある。**

コードが 100 ファイルに育ってから ArchUnit を入れると、
既存コードが大量に赤くなり、直す工数が膨大になって、結局**ルールの方を緩める**ことになる。
最初の 1 ファイルの時点で置いておけば、違反は生まれた瞬間に 1 件ずつ潰される。

LayeredArchitectureTest のコメントにこう書いてある:

> 今はエンドポイントが 1 本しか無いが、ルールを先に置いておくことで、将来 Controller が
> Service を飛ばして何かを直に触るような違反を書いた瞬間にテストが落ちる。**人にも AI にも効くガードレール。**

この最後の一文が、次章に繋がる。

---

# 第 12 章: AI 駆動開発の大局

ここからが本書のもう一つの軸。**AI がコードを書く時代に、人間は何を持っていればいいのか。**

## 12.1 何が変わって、何が変わらないのか

AI は Java のコードを速く正確に書ける。**「書く速度」はもうボトルネックではない。**

では人間の仕事は何か。3 つ残る。

| 残る仕事 | なぜ AI に任せきれないか |
|---|---|
| **決める** | 何を作るか、何を作らないか。トレードオフの選択には責任が伴う |
| **検証する** | 本当に動いているかを確かめる。AI の「できました」は証拠ではない |
| **残す** | 判断を将来に伝える。会話は消えるが、判断の理由は必要であり続ける |

**この 3 つを支えるのが「構造」であり、このリポジトリ全体がその実例になっている。**

## 12.2 全体の地図 — 人間・AI・機械の分担

```
     ┌────────────────────────────────────────────────────────────┐
 人  │ docs/adr/*.md      なぜそう決めたか（1 ファイル 1 決定・不可逆な判断）│
 間  │ CLAUDE.md          恒久ルール（AI に毎回読ませる常時指示）           │
 が  │ docs/brainstorm.md 合意事項・不採用案                              │
 決  │ docs/spec.md       何を作るか・合格条件（受け入れ基準）              │
 め  └────────────────────────────────────────────────────────────┘
 る                                  │ 指示
                                     ▼
     ┌────────────────────────────────────────────────────────────┐
 AI  │ src/main/**  src/test/**   実装                                    │
 が  └────────────────────────────────────────────────────────────┘
 書                                  │ 提出
 く                                  ▼
     ┌────────────────────────────────────────────────────────────┐
 機  │ Spotless（書式）/ Checkstyle（規約）/ ArchUnit（構造）              │
 械  │ ./mvnw verify  →  GitHub Actions CI  →  本番へ CD                   │
 が  └────────────────────────────────────────────────────────────┘
 通                                  │ 結果
 す                                  ▼
     ┌────────────────────────────────────────────────────────────┐
 記  │ docs/progress.md   やったこと・検証結果・**検証できなかったこと**     │
 録  │ docs/learning/     概念の理解・つまずき（← この解説書）              │
     └────────────────────────────────────────────────────────────┘
```

**AI が書くのは真ん中だけ。上（決める・書き残す）と下（機械で強制する）は人間が用意する。**
この枠が無いと、AI の出力はその場では動いても、次のセッションで方針が揺れて崩れていく。

## 12.3 ドキュメントは「AI への入力」である

従来、ドキュメントは「後任の人間のため」に書くものだった。今は違う。
**ドキュメントは、次のセッションの AI が最初に読む入力になる。**

AI は会話が終われば記憶を失う。次に開いたとき、状況を知る手段はリポジトリの中身だけだ。
だからこのプロジェクトでは、**種類ごとに置き場所を決めてある**。

| 種類 | 置き場 | 例 |
|---|---|---|
| **恒久ルール**（毎回守らせたい）| `CLAUDE.md` | 「層は一方向」「DTO は record」「LEARN コメントを書く」 |
| **不可逆な判断とその理由** | `docs/adr/NNNN-*.md` | 「なぜタスク管理 API をやめたか」 |
| **現在の仕様と合格条件** | `docs/spec.md` | 「0 除算は 422 を返すこと」 |
| **やったこと・検証結果** | `docs/progress.md` | 「15 tests 通過。Docker は検証不能」 |
| **概念の理解・つまずき** | `docs/learning/` | この解説書 |
| **現在地** | `README.md` の「現在地」節 | 「Sprint 5 まで完了」 |

そして **新しいセッションの入口は `README.md` → `docs/brainstorm.md` → `docs/spec.md` の順**と決めてある。
これは「AI が毎回、同じ前提から始められるようにする」ための設計だ。

> ADR 0001 の決定文より:
> 共有の単一情報源は git。**チャット履歴と個人メモリに知識を溜めない。**

## 12.4 ADR — 「なぜ」を残す唯一の場所

**ADR（Architecture Decision Record / アーキテクチャ決定記録）**は、
「こう決めた」とその理由を 1 ファイル 1 件で残す軽量な文書。

コードを読めば **何をしているか（what）** と **どうやっているか（how）** は分かる。
しかし **なぜそうしたか（why）** は、絶対にコードからは分からない。

このリポジトリの [ADR 0006](../adr/0006-pivot-to-calc-api.md) を読むと、
「タスク管理 API をやめて計算 API に作り替えた」経緯と理由が書いてある。
そして注目すべきは末尾の表だ:

| 案 | 不採用の理由 |
|---|---|
| タスク管理のまま命名だけ改善 | 題材の分かりにくさが本質。表面的な改善では解決しない |
| 読書ログ等の別ドメインに差し替え | 1対多・認証・DB を残すと結局同じ規模 |
| 両方残す | 焦点がぼける |

**「検討したが、やらないと決めた案」を理由ごと残している。** これが ADR の最大の価値だ。

なぜか。**AI は「良さそうな案」を無限に提案してくるから。**
不採用の記録がなければ、半年後に同じ案が再提案され、同じ議論を最初からやり直すことになる。
記録があれば「それは 0006 で不採用にした。理由はこれ」で 10 秒で終わる。

## 12.5 指示の出し方 — 5 つの要素

AI への指示の質が、そのまま成果物の質になる。

**❌ 悪い指示**

> 「割り算にバリデーション足して」

何が起きるか: AI がステータスコードを勝手に決める。例外クラスを新しく発明する。
Controller の中で `try-catch` して独自形式の JSON を返すかもしれない。
**どれも「動く」が、このプロジェクトの設計とは別物になる。**

**⭕ 良い指示**

> 「`spec.md` §3 に行を足した。`right` が 0 かつ `DIVIDE` のとき **422**、`type` は
> `urn:problem-type:business-rule`。ゴールデンパス（`calculation/`）に従い、Service から
> `BusinessRuleException` を投げ、ハンドラは**既存のものを使う**。テストは ServiceTest と
> ControllerTest に 1 件ずつ。`./mvnw verify` まで通して、実際に `curl` で叩いた結果を貼って」

含まれている 5 要素:

| # | 要素 | この例では |
|---|---|---|
| 1 | **契約** | 422、`type` の値 |
| 2 | **置き場所** | `calculation/` の Service |
| 3 | **既存資産の再利用指定** | 「ハンドラは既存のものを使う」＝ 新しい仕組みを作らせない |
| 4 | **テストの粒度** | どこに何件 |
| 5 | **検証方法** | `verify` + 実際の HTTP |

### ゴールデンパスという考え方

CLAUDE.md にこう書いてある:

> `calculation/` が唯一の実装例。新しいリソースを足すときは**この構成を鏡写しにする**。

**お手本を 1 つだけ決めておく。** そうすれば指示は「`calculation/` と同じ形で」の一言で済み、
セッションが変わっても構成が揺れない。
ファイルを触る順序（spec → dto → service → controller → テスト → progress）まで決めてある。

## 12.6 レビュー — AI の出力を見る 6 つの問い

AI が書いたコードを承認する前に、必ず通す checklist。

| # | 問い | 見る場所 |
|---|---|---|
| 1 | **層の向きは正しいか** — Controller が計算していないか。Service が HTTP を知っていないか | 第 4・7 章 |
| 2 | **DTO の境界は守られているか** — 内部情報が漏れていないか。request/response が分かれているか | 第 5 章 |
| 3 | **エラーは ProblemDetail に一元化されているか** — Controller がステータスを組み立てていないか | 第 6 章 |
| 4 | **そのテストは、どんなバグなら落ちるのか** — モックの値をそのまま検証していないか | 第 8 章 |
| 5 | **受け入れ基準と一致するか** — `spec.md` の合格条件を 1 行ずつ突き合わせたか | — |
| 6 | **実際に叩いたか** — `verify` の出力と `curl` の結果が示されているか。**無ければ承認しない** | 第 10 章 |

## 12.7 「AI に任せる / 人間が決める」の境界

| 判断 | 誰が | 理由 |
|---|---|---|
| 題材・スコープ・**やめる**判断 | **人間** | AI は「やめましょう」と言い出しにくい。ADR 0006 がまさにこれ |
| ライブラリの追加・削除 | **人間** | ほぼ不可逆。後から剥がすのが高くつく |
| HTTP 契約（URL / メソッド / ステータス / DTO の形）| **人間が決め、AI が実装** | 後から変えると利用者が壊れる |
| アーキテクチャのルール | **人間 ＋ 機械が強制** | 文章だけでは守られない（第 11 章）|
| 合格条件 | **人間** | **採点基準を、採点される側に作らせない** |
| 実装の書き方（`normalize()` の中身など）| **AI** | 契約に影響しない |
| 定型コード（Controller、テストの骨組み）| **AI** | お手本の鏡写しで済む |
| 書式 | **機械**（Spotless）| 人も AI も議論しない |
| 「できた」の判定 | **人間が実行して確認** | 自己申告は証拠にならない |

## 12.8 「検証不能」と正直に書く

[docs/progress.md](../progress.md) にはこう書いてある:

> ### 検証不能・未実施
> - Render への実デプロイは未実施（アカウント未設定）
> - `docker build` は未検証（Docker Desktop がこの環境で起動しないため）

これは失敗の告白ではなく、**最も価値のある記録の一つ**だ。

AI は「できました」と報告しがちな性質を持つ。
確認していないことを「たぶん大丈夫」で通すと、それが次のセッションでは「確認済み」として扱われ、
嘘が積み上がっていく。

CLAUDE.md はこれを明示的に禁じている:

> **コードを読むだけで合格を出さない。** 実際に動かす。
> 実施できなかった検証は「**検証不能**」と正直に記録する。

> **ここだけ覚える**
> **「検証していないこと」を「検証していない」と書く。** これが AI と協働する上での最重要の規律。

## 12.9 まとめ — この章の一枚要約

```
人間が持つべきものは「コードを書く力」ではなく、次の 4 つ。

  ① 地図      どこに何があり、どう繋がっているか（第 3 章の 1 枚）
  ② 契約      何が約束で、何が実装の自由か（第 9 章）
  ③ 検証手段  自分の手で動かして確かめられること（第 1・8・10 章）
  ④ 記録      決めたこと・やらないと決めたこと・確かめていないこと（本章）

そして、口約束（CLAUDE.md）と破れない壁（ArchUnit + CI）を、二重に張る。
```

---

# 付録 A — 用語集

登場順。分からなくなったらここに戻る。

| 用語 | 意味 |
|---|---|
| **API** | プログラム同士の窓口。決められた形で頼めば結果が返る |
| **クライアント / サーバー** | 頼む側 / 頼まれる側 |
| **ポート** | 1 台のコンピュータ内での「窓口番号」。この API は 8080 |
| **localhost** | 自分自身のコンピュータを指す名前 |
| **HTTP** | Web でのやり取りの決まり（プロトコル）|
| **リクエスト / レスポンス** | 注文 / 返事 |
| **メソッド** | GET / POST など、リクエストの「動詞」 |
| **パス** | `/api/v1/calculations` のような URL の位置部分 |
| **ヘッダ** | リクエスト・レスポンスの付帯情報 |
| **ボディ** | 本体のデータ |
| **ステータスコード** | 3 桁の返事。2xx 成功 / 4xx クライアントのせい / 5xx サーバーのせい |
| **JSON** | データを文字で表す書式。`{"名前": 値}` |
| **REST** | URL をリソース（名詞）で表す API 設計の作法 |
| **エンドポイント** | 「メソッド + パス」の組。この API では `POST /api/v1/calculations` の 1 本 |
| **フレームワーク** | 面倒な共通部分を肩代わりし、あなたのコードを呼び出す土台 |
| **Spring Boot** | Java で Web アプリを作る最も普及したフレームワーク |
| **Tomcat** | Java の Web サーバー。Spring Boot にはこれが組み込まれている |
| **アノテーション** | `@` で始まる「付箋」。フレームワークが読んで動きを変える |
| **Bean** | Spring が生成・管理するオブジェクト |
| **DI（依存性の注入）** | 必要な部品を自分で作らず、外から渡してもらう仕組み |
| **Maven** | Java のビルド・依存管理ツール。設定は `pom.xml` |
| **依存（dependency）** | 使う外部ライブラリの宣言 |
| **starter** | Spring Boot の「よく使うものの詰め合わせ」依存 |
| **jar** | Java の実行可能ファイル。ビルドの成果物 |
| **DispatcherServlet** | Spring MVC の総合受付。全リクエストが通る |
| **Jackson** | JSON ⇔ Java オブジェクトを変換するライブラリ |
| **Controller** | HTTP を担当する層。受け取って渡すだけ |
| **Service** | 業務ロジックを担当する層 |
| **Repository** | データ保存を担当する層（このアプリには無い）|
| **層（レイヤー）** | 役割ごとの横の区切り。呼ぶ向きは一方向 |
| **DTO** | データを運ぶためだけの入れ物 |
| **record** | Java のデータ専用クラスの短い書き方。不変 |
| **enum（列挙型）** | 取りうる値が決まっている型 |
| **BigDecimal** | 小数を正確に扱う型。`double` の誤差を避ける |
| **バリデーション** | 入力の検査。`@NotNull` などの付箋で書く |
| **例外（Exception）** | 処理を中断して呼び出し元に知らせる仕組み。`throw` で投げる |
| **ProblemDetail / RFC 7807** | エラー応答の形式を定めた世界共通の規格 |
| **`@RestControllerAdvice`** | アプリ全体の例外の受け皿 |
| **継承（extends）** | 既存クラスの機能を引き継ぐこと |
| **テスト** | 「こう動くはず」を実行可能な形で書いたコード |
| **アサーション（assert）** | 「期待どおりか」を確認する行 |
| **モック** | 本物の代わりに置く、指示どおり答える偽物の部品 |
| **単体 / スライス / 結合テスト** | 部品単体 / 一部の層だけ / 全体、を対象にしたテスト |
| **OpenAPI（Swagger）** | API 仕様を機械可読な形で書いた文書。自動生成される |
| **オリジン** | プロトコル + ドメイン + ポート の組 |
| **CORS** | 別オリジンへの通信をブラウザが制限する仕組みと、その許可 |
| **プリフライト** | POST などの前にブラウザが自動で送る `OPTIONS` の事前確認 |
| **プロファイル** | 環境ごとに設定を切り替える Spring の仕組み（local / prod）|
| **YAML** | インデントで階層を表す設定ファイルの書式 |
| **Actuator** | 死活監視などの運用用エンドポイントを提供する Spring Boot の機能 |
| **ヘルスチェック** | 「生きているか」を外から確認する仕組み |
| **Docker / コンテナ** | アプリを環境ごと箱に詰めて、どこでも同じに動かす道具 |
| **CI** | push のたびに自動でビルド・テストする仕組み |
| **CD** | 検査を通ったものを自動で本番に届ける仕組み |
| **GitHub Actions** | GitHub の CI/CD サービス |
| **Spotless** | 書式を機械的に整形する道具 |
| **Checkstyle** | 書式以外の規約を検査する道具 |
| **ArchUnit** | コードの「構造」をテストとして検査するライブラリ |
| **ADR** | 決定とその理由を 1 件 1 ファイルで残す軽量文書 |
| **ゴールデンパス** | 「これを真似しろ」と決めた唯一のお手本実装 |
| **受け入れ基準** | 「これが満たされたら合格」という事前に決めた条件 |

---

# 付録 B — 次に読むもの

| やりたいこと | 読むもの |
|---|---|
| 実際に手を動かして学ぶ | [curriculum.md](curriculum.md)（全 11 モジュール、壊す実験つき）|
| 今の仕様を正確に知る | [docs/spec.md](../spec.md) |
| なぜこうなっているかを知る | [docs/adr/](../adr/) |
| これまでに何をやったか | [docs/progress.md](../progress.md) |
| DB や認証のある版を見たい | `git show archive/task-api:docs/spec.md`（旧タスク管理 API）|
