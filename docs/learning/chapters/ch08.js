// 第 8 章 OpenAPI：API の契約書（書き方は AUTHORING.md）
Calc.register({
  no: 8,
  goal: [
    "OpenAPI とは何か、機械が読める契約書があると何ができるかを説明できる",
    "コードファーストとスキーマファーストの違いと、選び方が分かる",
    "springdoc がコードから何を自動で読み取り、アノテーションで何を補っているか分かる",
    "「説明書だけが嘘をつく」問題と、その防ぎ方を説明できる"
  ],
  sections: [
    {
      id: "s1",
      title: "OpenAPI：機械が読める API の契約書",
      body: `
<p><b>OpenAPI</b> は、API の契約（URL・メソッド・入力・出力・ステータス）を<b>決まった形式の JSON / YAML</b> で書くための標準。
人が読む説明書であると同時に、<b>機械が読める</b>のが要点。</p>
${Fig.flow([
  { ic: "☕", t: "コード", s: "Controller / DTO<br>＋ アノテーション", tone: "accent" },
  { ic: "📘", t: "springdoc", s: "起動時にコードを読んで<br>契約書を生成", tone: "lec" },
  { ic: "📄", t: "/v3/api-docs", s: "OpenAPI の JSON<br>（機械が読む契約書）", tone: "ok" }
], ["読む", "書き出す"])}
${Fig.cards([
  { ic: "🌐", t: "Swagger UI", d: "/swagger-ui.html。ブラウザで読めて、その場で試せる（このリポジトリにある）", tone: "accent" },
  { ic: "🏭", t: "クライアント生成", d: "契約書から、呼び出す側のコード（TypeScript など）を自動生成できる", tone: "lec" },
  { ic: "🎭", t: "モックサーバー", d: "サーバーが完成する前に、契約書どおりに答える偽サーバーを立てられる", tone: "lec" },
  { ic: "🔍", t: "差分の検出", d: "契約書の変更を比べ、破壊的変更を CI で見つけられる", tone: "lec" }
], "1 つの契約書から、説明書・コード・テストが作れる。紫は座学（このリポジトリにはまだ無い）")}`,
      refs: [
        code("pom.xml", "springdoc-openapi-starter-webmvc-ui", "springdoc（契約書と Swagger UI を自動生成する部品）"),
        code("src/main/resources/application.yml", "path: /swagger-ui.html", "Swagger UI の場所")
      ],
      checks: [
        { q: "application.yml の springdoc の設定で、契約書の JSON が出る場所（パス）はどこ？",
          a: "/v3/api-docs（api-docs.path）。Swagger UI はこの JSON を読んで画面を作っている。" }
      ]
    },
    {
      id: "s2",
      title: "コードファーストとスキーマファースト",
      body: `
${Fig.compare(
  { t: "☕→📄 コードファースト（このリポジトリ）", tone: "accent", html: Fig.flow([
    { t: "コードを書く", tone: "accent" }, { t: "契約書を自動生成", tone: "ok" }
  ], ["springdoc"], { dir: "v" }) + "<ul><li>書くのは 1 か所（コード）で済む</li><li>契約がコードの都合に引きずられやすい</li><li>1 チーム・小さな API 向き</li></ul>" },
  { t: "📄→☕ スキーマファースト（座学）", tone: "lec", html: Fig.flow([
    { t: "契約書（YAML）を先に書く", tone: "lec" }, { t: "サーバー / クライアントのコードを生成", tone: "ok" }
  ], ["openapi-generator"], { dir: "v" }) + "<ul><li>コードより先に、使う側と合意できる</li><li>生成の仕組みを保守する手間が増える</li><li>公開 API・複数チーム向き</li></ul>" },
  "どちらでも「契約は人間が決める」のは同じ。違うのは、契約の正本がコードか YAML か"
)}
<div class="note"><b>AI 駆動開発との関係</b>　このリポジトリは契約を <code>docs/spec.md</code> に日本語で書き、コードファーストで実装している。
spec が人間どうし・AI との合意、OpenAPI がその機械向けの写し、という分担。</div>`,
      refs: [
        code("docs/spec.md", "### 3.7 運用・ドキュメント", "OpenAPI と Swagger UI の場所（契約書の中の記載）")
      ],
      checks: [
        { q: "このリポジトリで「契約の正本」はどこにある？ OpenAPI の JSON はどういう位置づけ？",
          a: "正本は docs/spec.md §3（人間が決め、AI が読む）。OpenAPI の JSON はコードから自動生成される機械向けの写し。だから spec とコードと OpenAPI がずれていないかを確かめる必要がある。" }
      ]
    },
    {
      id: "s3",
      title: "springdoc が自動で読むもの、アノテーションで補うもの",
      body: `
${Fig.pairs("コード", "生成される契約書（/v3/api-docs）", [
  { l: "@GetMapping ＋ @RequestParam int size", r: "GET の size パラメータ（integer）", rnote: "自動", tone: "ok" },
  { l: "@Min(1) @Max(MAX_PAGE_SIZE)", r: '"minimum": 1, "maximum": 100', rnote: "自動（検証ルールも読む）", tone: "ok" },
  { l: "@RequestParam(defaultValue = \"20\")", r: '"default": 20', rnote: "自動", tone: "ok" },
  { l: "enum Operator", r: '"enum": ["ADD","SUBTRACT","MULTIPLY","DIVIDE"]', rnote: "自動", tone: "ok" },
  { l: "@Operation(summary = …)", r: "操作の要約・説明", rnote: "アノテーションで補う", tone: "lec" },
  { l: "@ApiResponse(responseCode = \"422\", …)", r: "返しうるステータスと意味", rnote: "アノテーションで補う", tone: "lec" }
], "型・引数・検証ルールは自動で読まれる。「何のための操作か」「どのエラーがありうるか」は人間が書き足す", "→")}
${Fig.code([
  { c: '@Tag(name = "Calculation", description = "四則演算と計算履歴")', tag: "グループ", tone: "lec" },
  { c: "public class CalculationController {" },
  { c: '  @Operation(summary = "計算して履歴に保存する", …)', tag: "要約", tone: "lec" },
  { c: '  @ApiResponse(responseCode = "201", …)', tag: "成功", tone: "ok" },
  { c: '  @ApiResponse(responseCode = "422", description = "0 除算、または…")', tag: "エラー", tone: "warn" }
], "Controller の実物（一部）")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", '@Operation(summary = "計算して履歴に保存する"', "操作の要約"),
        code("src/main/java/com/example/calc/config/OpenApiConfig.java", "OpenAPI calcApiOpenAPI()", "契約書全体の見出し（タイトル・版）")
      ],
      checks: [
        { q: "OpenApiConfig は契約書の何を決めている？ 各 API の中身も書いている？",
          a: "タイトル（Calc API）・説明・版（v1）といった文書全体の見出しだけ。各 API の中身は springdoc が Controller から自動で作る。" }
      ]
    },
    {
      id: "s4",
      title: "説明書だけが嘘をつく問題",
      body: `
<p>説明書のアノテーションは<b>動作に一切影響しない</b>（第 3 章）。だから<b>コードを変えて説明を直し忘れても、テストは通る</b>。</p>
${Fig.compare(
  { t: "😱 起こりうること", tone: "err", html: "<ul><li>422 を返すようにしたのに、@ApiResponse に 422 が無い</li><li>内部だけで使う項目が、説明書に「送る項目」として載る</li></ul>" },
  { t: "🔎 実際にあったこと（Sprint 7）", tone: "warn", html: "PATCH の入力に足した内部の目印 <code>memoSpecified</code> が、Swagger UI に「送る項目」として載った。<br>/v3/api-docs を実際に見て気づき、<code>@Schema(hidden = true)</code> で隠した" },
  "動かして確かめる対象は API の振る舞いだけではない。説明書も実物を見る"
)}
${Fig.cards([
  { ic: "👀", t: "実物を見る", d: "変更したら /v3/api-docs や Swagger UI を開いて確かめる（このリポジトリのやり方）", tone: "accent" },
  { ic: "🧪", t: "契約テスト（座学）", d: "契約書とサーバーの実際の応答が一致するかを自動で検査する", tone: "lec" },
  { ic: "📄", t: "スキーマファースト（座学）", d: "契約書からサーバー側のインタフェースを生成すれば、ずれようがない", tone: "lec" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/dto/MemoUpdateRequest.java", "@Schema(hidden = true) boolean memoSpecified", "内部の目印を説明書から隠す")
      ],
      checks: [
        { q: "MemoUpdateRequest の memo の @Schema には nullable = true が付いている。説明書を読む人に何を伝えている？",
          a: "memo に null を送ってよい（null はメモを消す意味）こと。Merge Patch の規則（第 7 章）を説明書にも反映している。" }
      ]
    },
    {
      id: "s5",
      title: "契約書の変更と、破壊的変更",
      body: `
${Fig.matrix("変更", ["使う側は", "例"], [
  { h: "レスポンスに項目を足す", c: [{ v: "壊れない", tone: "ok" }, "memo を足した（知らない項目は無視されるのが普通）"] },
  { h: "任意の入力を足す", c: [{ v: "壊れない", tone: "ok" }, "?page= を足した（省略すれば既定値）"] },
  { h: "レスポンスの形を変える", c: [{ v: "壊れる", tone: "err" }, "一覧が配列 → {content, page}（Sprint 7）"] },
  { h: "必須の入力を足す・制約を厳しくする", c: [{ v: "壊れる", tone: "err" }, "@Digits を足した（Sprint 6）"] },
  { h: "成功のステータスを変える", c: [{ v: "壊れる", tone: "err" }, "POST 200 → 201（Sprint 6）"] }
], "破壊的変更は「引き渡し事項」に書いて知らせる（docs/progress.md）。公開 API なら版を上げる（第 9 章）")}`,
      refs: [
        code("docs/progress.md", "**破壊的変更**", "引き渡し事項に書いた破壊的変更")
      ],
      checks: [
        { q: "docs/progress.md の「引き渡し事項」を見て、Sprint 7 の破壊的変更を 1 つ挙げよう。",
          a: "一覧のレスポンスが配列 → {content, page} になった。ほかに ?page= / ?size= の範囲外が 400 になった。" }
      ]
    }
  ],
  observe: {
    intro: "<p>アプリを起動して、説明書を実物で見る。</p>",
    steps: [
      { do: "ブラウザで <code>http://localhost:8080/swagger-ui.html</code> を開き、「計算して履歴に保存する」を開いて Try it out で実行する。",
        expect: "201 と Location が表示される。説明書の画面からそのまま API を呼べる" },
      { do: "<code>curl -s http://localhost:8080/v3/api-docs</code> を実行し、size パラメータを探す。",
        expect: '"minimum":1,"maximum":100,"default":20 がある（@Min / @Max / defaultValue が自動で反映）' },
      { do: "同じ JSON の components.schemas.MemoUpdateRequest を探す。",
        expect: "memo だけが載っていて、memoSpecified は無い" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "📝", t: "説明の直し忘れを見る", d: "AI はコードを変えても @ApiResponse を直し忘れることがある。ステータスを変えた差分では必ず確認", tone: "warn" },
  { ic: "📄", t: "契約書を AI に渡す", d: "外部の API を呼ぶコードを AI に書かせるときは、相手の OpenAPI を渡すと正確になる", tone: "accent" },
  { ic: "💥", t: "破壊的変更を言わせる", d: "AI に「この変更は既存の利用者を壊すか」を毎回答えさせ、progress の引き渡し事項に書く", tone: "lec" }
])}`,
  questions: [
    { q: "OpenAPI の説明として正しいものは？",
      choices: ["API の契約を、機械が読める決まった形式（JSON / YAML）で書くための標準", "Java のフレームワーク", "API を速くするための仕組み", "データベースの一種"],
      explain: "人が読む説明書であり、機械が読める契約書でもある。", see: "s1" },
    { q: "このリポジトリで、OpenAPI の JSON が出る URL は？",
      choices: ["/v3/api-docs", "/swagger-ui.html", "/actuator/health", "/api/v1/openapi"],
      explain: "/swagger-ui.html はその JSON を読んで画面にしたもの。", see: "s1" },
    { q: "機械が読める契約書があると「できるようになること」として誤っているものは？",
      choices: ["サーバーのバグが自動で直る", "呼び出す側のコードを自動生成する", "契約書どおりに答えるモックサーバーを立てる", "破壊的変更を CI で検出する"],
      explain: "契約書はバグを直さない。契約との食い違いを見つける助けにはなる。", see: "s1" },
    { q: "このリポジトリの OpenAPI の作り方は？",
      choices: ["コードファースト（コードから springdoc が自動生成）", "スキーマファースト（YAML を先に書く）", "手で JSON を書いている", "OpenAPI は使っていない"],
      explain: "Controller と DTO とアノテーションから、起動時に生成している。", see: "s2" },
    { q: "スキーマファーストが特に向いているのは？",
      choices: ["公開 API や、複数のチームで開発する API", "1 人で作る小さな API", "テストを書かない API", "DB を持たない API"],
      explain: "コードより先に、使う側と契約を合意できるのが強み。", see: "s2" },
    { q: "このリポジトリで「契約の正本」はどれ？",
      choices: ["docs/spec.md §3", "/v3/api-docs の JSON", "Swagger UI の画面", "OpenApiConfig"],
      explain: "契約は人間が決めて spec に書く。OpenAPI はコードから作られる機械向けの写し。", see: "s2" },
    { q: "@Max(100) を付けた size パラメータについて、OpenAPI にはどう載る？",
      choices: ["maximum: 100 として自動で載る", "載らない", "@Operation に書かないと載らない", "description に文章で載る"],
      explain: "springdoc は検証ルールも読み取る。", see: "s3" },
    { q: "springdoc が自動では分からず、アノテーションで補っているものは？",
      choices: ["その操作が何のためのものか、どのエラーが返りうるか", "URL とメソッド", "パラメータの型", "enum の値の一覧"],
      explain: "形はコードから分かる。意味と、起こりうるエラーは人間が書き足す。", see: "s3" },
    { q: "OpenApiConfig が決めているのは？",
      choices: ["タイトル・説明・版といった契約書全体の見出し", "各 API の URL", "各 API のステータス", "DB の接続先"],
      explain: "中身は Controller から自動生成。全体の見出しだけを Bean で差し込んでいる。", see: "s3" },
    { q: "@ApiResponse の内容がコードの振る舞いとずれていても、テストが通ってしまうのはなぜ？",
      choices: ["説明書のアノテーションは動作に影響しないから", "テストが壊れているから", "springdoc がずれを自動で直すから", "@ApiResponse はコンパイルされないから"],
      explain: "だから「説明書だけが嘘をつく」ことが起きる。実物を見るか、契約テストで防ぐ。", see: "s4" },
    { q: "Sprint 7 で memoSpecified が Swagger UI に載ってしまった問題は、どう見つかった？",
      choices: ["/v3/api-docs を実際に開いて確認した", "テストが落ちた", "コンパイルエラーになった", "利用者から苦情が来た"],
      explain: "説明書も「動かして確かめる」対象。見なければ気づけなかった。", see: "s4" },
    { q: "内部の目印（memoSpecified）を説明書から隠すのに使ったのは？",
      choices: ["@Schema(hidden = true)", "@JsonIgnore", "private にする", "@Deprecated"],
      explain: "springdoc の @Schema で、説明書に載せないよう指定した。", see: "s4" },
    { q: "次のうち、既存の利用者を壊さない（破壊的でない）変更は？",
      choices: ["レスポンスに新しい項目を足す", "一覧のレスポンスを配列からオブジェクトに変える", "成功のステータスを 200 から 201 に変える", "入力の制約を厳しくする"],
      explain: "知らない項目は無視するのが普通なので、項目の追加は壊れにくい。", see: "s5" },
    { q: "このリポジトリで破壊的変更をしたとき、どこに書いて知らせている？",
      choices: ["docs/progress.md の引き渡し事項", "コードのコメントだけ", "Swagger UI の画面", "どこにも書かない"],
      explain: "Sprint 6・7 の破壊的変更は progress の引き渡し事項に明記している。", see: "s5" },
    { q: "Swagger UI の「Try it out」で分かることは？",
      choices: ["説明書の画面から実際に API を呼び、応答を確かめられる", "コードのバグの場所", "DB のテーブル定義", "テストの結果"],
      explain: "説明書と試す場所が一体になっている。", see: "s1" },
    { q: "AI にステータスを変える変更をさせた。説明書の観点で必ず確認することは？",
      choices: ["@ApiResponse も一緒に直っているか", "変数名が変わっていないか", "インデントがそろっているか", "コメントが日本語か"],
      explain: "動作に影響しないので、直し忘れてもテストでは気づけない。", see: "s4" }
  ]
});
