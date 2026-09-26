// 第 1 章 API・HTTP・JSON（書き方は AUTHORING.md）
Calc.register({
  no: 1,
  goal: [
    "API とは何か、クライアントとサーバーがどう会話するかを、自分の言葉で説明できる",
    "HTTP のリクエスト（メソッド・URL・ヘッダ・ボディ）とレスポンス（ステータス・ヘッダ・ボディ）を見分けられる",
    "JSON を読めて、それがこのリポジトリのどの Java の型に対応するか分かる",
    "「API の形（契約）は人間が決め、AI に渡すもの」という感覚を持つ"
  ],
  sections: [
    {
      id: "s1",
      title: "API とは：プログラム同士の「注文窓口」",
      body: `
<p><b>API</b> は、<b>プログラムが別のプログラムに仕事を頼むための窓口</b>。レストランにたとえるとこうなる。</p>
${Fig.flow([
  { ic: "🧑‍💻", t: "お客さん", s: "＝ クライアント（頼む側）" },
  { ic: "🪟", t: "カウンター", s: "＝ API（受付の決まりごと）", tone: "accent", active: true },
  { ic: "🍳", t: "厨房", s: "＝ サーバーの中身（計算・記録）" }
], [{ f: "注文票（リクエスト）", b: "伝票（レスポンス）" }, { f: "注文を渡す", b: "結果" }],
{ caption: "お客さんは厨房の中を知らなくてよい。カウンターの決まりごと（注文票の書き方・伝票の読み方）だけ知っていれば頼める" })}
${Fig.cards([
  { ic: "📝", t: "決まった書き方で頼む", d: "注文票の書式が決まっている（1.3 節 HTTP）", tone: "accent" },
  { ic: "🧾", t: "決まった形で返る", d: "伝票の読み方も決まっている（1.4 節）", tone: "accent" },
  { ic: "🤝", t: "この約束 ＝ 契約", d: "一度公開すると気軽に変えられない。だから人間が決める", tone: "lec" }
])}
<p>このリポジトリの API は「<b>四則演算をして、その履歴を DB（データベース）に残す</b>」窓口。</p>`,
      refs: [
        code("README.md", "題材は「四則演算をして、その履歴を DB に残す API」", "このリポジトリが何の API かの一文"),
        code("docs/spec.md", "## 3. API", "API の契約（どんな注文ができて、何が返るか）の全体")
      ],
      checks: [
        { q: "spec.md §3 を開いて、この API でできる操作がいくつあるか数えてみよう（3.7 運用・ドキュメントは除く）。",
          a: "6 つ。一覧・取得・作成・全置換・部分更新・削除（3.1〜3.6）。この 6 操作が REST の基本セットで、以降の章でずっと使う。" }
      ]
    },
    {
      id: "s2",
      title: "クライアントとサーバー",
      body: `
${Fig.flow([
  { ic: "🖥️📱", t: "クライアント（何でもよい）", s: "curl / api-console.html / Swagger UI / スマホアプリ" },
  { ic: "☕", t: "サーバー", s: "このアプリ（Spring Boot）<br>localhost:8080 で待ち受け", tone: "accent" },
  { ic: "🗄️", t: "DB", s: "PostgreSQL<br>計算の履歴を保存", tone: "dim" }
], [{ f: "同じ API で注文", b: "返事" }, { f: "読み書き", b: "" }],
{ caption: "クライアントが何であっても、サーバーは同じ API（契約）で応える。画面を作り直してもサーバーは変えなくてよい" })}
<p>サーバーの「住所」は URL で表す。分解するとこうなる。</p>
${Fig.http("URL の分解", [
  { k: "スキーム", v: "http://", n: "通信の決まり（プロトコル）", tone: "dim" },
  { k: "ホスト", v: "localhost", n: "どの PC か。localhost ＝ この PC 自身", tone: "accent" },
  { k: "ポート", v: ":8080", n: "その PC の何番の窓口か", tone: "lec" },
  { k: "パス", v: "/api/v1/calculations", n: "窓口の中の、どの「もの」か", tone: "ok" }
])}`,
      refs: [
        code("README.md", "./mvnw spring-boot:run", "サーバーを起動するコマンド")
      ],
      checks: [
        { q: "README の「画面から叩く」節を開き、API を呼べるクライアントが何種類紹介されているか確認しよう。",
          a: "Swagger UI と api-console.html の 2 つ（ほかに「叩いてみる」節の curl）。どれも同じ /api/v1/calculations を呼んでいる。" }
      ]
    },
    {
      id: "s3",
      title: "HTTP リクエスト：注文票の 4 つの欄",
      body: `
<p>クライアントとサーバーは <b>HTTP</b> という決まった書式で会話する。注文票（<b>リクエスト</b>）の中身はこう分かれている。</p>
${Fig.http("リクエスト（注文票）の実物", [
  { k: "① メソッド", v: "POST", n: "何をしたいか（動詞）", tone: "accent" },
  { k: "② URL", v: "/api/v1/calculations", n: "何に対して（名詞）。? の後ろはクエリ＝絞り込み条件", tone: "ok" },
  { k: "③ ヘッダ", v: "Content-Type: application/json", n: "付帯情報。「ボディは JSON です」", tone: "lec" },
  { k: "④ ボディ", v: '{"left": 2, "operator": "ADD", "right": 3}', n: "渡したいデータ本体。GET / DELETE では普通使わない", tone: "warn" }
], "送るたびにこの 4 つの欄を埋める")}
<p>① のメソッドは 5 つだけ覚えればよい。</p>
${Fig.cards([
  { ic: "📖", t: "GET", d: "取得する（見るだけ）", tone: "ok" },
  { ic: "➕", t: "POST", d: "新しく作る", tone: "accent" },
  { ic: "🔁", t: "PUT", d: "丸ごと置き換える", tone: "warn" },
  { ic: "✏️", t: "PATCH", d: "一部だけ変える", tone: "lec" },
  { ic: "🗑️", t: "DELETE", d: "削除する", tone: "err" }
])}
<p>サーバー側では「どのメソッド × どの URL を、どのプログラムが受けるか」をコードで宣言している。</p>
${Fig.code([
  { c: '@RequestMapping("/api/v1/calculations")', tag: "② URL の入口", tone: "ok" },
  { c: "public class CalculationController {" },
  { c: "" },
  { c: "  @PostMapping", tag: "① POST ならここ", tone: "accent" },
  { c: "  public ResponseEntity<CalculationResponse> create(...) { ... }" },
  { c: "}" }
], "CalculationController の骨組み（中身は省略）")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", '@RequestMapping("/api/v1/calculations")', "このクラスが受け持つ URL の入口"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "@PostMapping", "そのうち POST（作成）を受けるメソッド")
      ],
      checks: [
        { q: "CalculationController を開き、@GetMapping / @PostMapping / @PutMapping / @PatchMapping / @DeleteMapping がそれぞれいくつあるか数えよう。",
          a: "GET が 2 つ（一覧と 1 件取得）、POST・PUT・PATCH・DELETE が 1 つずつ。合計 6 つで、spec §3 の 6 操作と 1 対 1 に対応している。" },
        { q: "1 件取得の @GetMapping には、一覧の @GetMapping に無い文字列が付いている。何か？ それは URL のどの部分を表す？",
          a: "\"/{id}\"。URL の末尾の番号（/api/v1/calculations/5 の 5）を表す。「どの 1 件か」を URL で指定している。" }
      ]
    },
    {
      id: "s4",
      title: "HTTP レスポンス：返ってくる伝票",
      body: `
${Fig.http("レスポンス（伝票）の実物", [
  { k: "ステータス", v: "201", n: "結果を表す 3 桁の数字。いちばん大事", tone: "ok" },
  { k: "ヘッダ", v: "Location: http://localhost:8080/api/v1/calculations/1\nContent-Type: application/json", n: "付帯情報。Location ＝ 作られたものの住所", tone: "lec" },
  { k: "ボディ", v: '{"id":1,"left":2,"operator":"ADD","right":3,"result":5, …}', n: "返事の中身（JSON）", tone: "warn" }
])}
<p>ステータスは<b>百の位だけで「誰のせいか」</b>が分かる。</p>
${Fig.cards([
  { ic: "✅", t: "2xx 成功", d: "200 取得・更新できた<br>201 新しく作った<br>204 成功（返す中身なし）", tone: "ok" },
  { ic: "🙋", t: "4xx 頼み方の問題", d: "400 書き方が間違い<br>404 その番号が無い<br>422 正しいが計算できない", tone: "warn" },
  { ic: "🔥", t: "5xx サーバーの問題", d: "500 サーバー側のバグ<br>→ 頼み方ではなく、サーバーを直す", tone: "err" }
], "4xx なら頼み方を直す。5xx ならサーバーを直す。細かい使い分けは第 5・6 章")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "ResponseEntity.created(location).body(response)", "作成が成功したら 201 と Location を返している行"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "ResponseEntity.noContent().build()", "削除が成功したら 204（中身なし）を返している行")
      ],
      checks: [
        { q: "作成（POST）の成功時、ボディのほかに Location というヘッダを返している。そこには何が入る？ なぜ返す？",
          a: "作られた記録の URL（例: /api/v1/calculations/1）。「新しいものがここにできた」とクライアントに教えるため。クライアントはその URL を GET すれば同じものを取り直せる。" }
      ]
    },
    {
      id: "s5",
      title: "JSON：データを文字で書く書式",
      body: `
${Fig.code([
  { c: "{", tag: "{ } ＝ 項目の集まり", tone: "dim" },
  { c: '  "left": 10,', tag: "数値", tone: "accent" },
  { c: '  "operator": "DIVIDE",', tag: '文字列は " " で囲む', tone: "ok" },
  { c: '  "right": 3,', tag: "数値", tone: "accent" },
  { c: '  "memo": null', tag: "null ＝ 値なし", tone: "lec" },
  { c: "}" }
], "JSON は「\"名前\": 値」の並び。[ ] で囲むと配列（並び）になる")}
<p>サーバーの中では、JSON は <b>Java の型</b>に変換される。リクエスト用とレスポンス用で型が分かれているのがポイント。</p>
${Fig.pairs("リクエスト（CalculationRequest）", "レスポンス（CalculationResponse）", [
  { l: "left", r: "left", tone: "accent" },
  { l: "operator", r: "operator", tone: "accent" },
  { l: "right", r: "right", tone: "accent" },
  { l: null, r: "id", rnote: "サーバーが振る番号", tone: "ok" },
  { l: null, r: "result", rnote: "サーバーが計算", tone: "ok" },
  { l: null, r: "memo", rnote: "あとから付ける", tone: "ok" },
  { l: null, r: "createdAt / updatedAt", rnote: "サーバーが記録", tone: "ok" }
], "クライアントが送るのは計算式だけ。番号・結果・時刻はサーバーが決める。「誰が決める値か」で型が分かれている（理由は第 11 章）")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/dto/CalculationRequest.java", "public record CalculationRequest(", "リクエストの JSON を受け取る型（left / operator / right）"),
        code("src/main/java/com/example/calc/calculation/dto/CalculationResponse.java", "public record CalculationResponse(", "レスポンスの JSON になる型")
      ],
      checks: [
        { q: "CalculationRequest と CalculationResponse の項目を見比べよう。レスポンスにだけある項目はどれ？",
          a: "id / result / memo / createdAt / updatedAt。クライアントが送るのは計算式だけで、番号・結果・時刻はサーバーが決めて返す。「誰が決める値か」で型が分かれている。" }
      ]
    },
    {
      id: "s6",
      title: "REST：URL とメソッドの作法",
      body: `
<p style="font-size:17px;text-align:center"><b>URL は「もの（名詞・複数形）」、メソッドは「すること（動詞）」</b></p>
${Fig.matrix("URL ＼ メソッド", ["GET", "POST", "PUT", "PATCH", "DELETE"], [
  { h: "/calculations<br><small>全体</small>", c: [{ v: "一覧", tone: "ok" }, { v: "作成", tone: "accent" }, "—", "—", "—"] },
  { h: "/calculations/{id}<br><small>1 件</small>", c: [{ v: "取得", tone: "ok" }, "—", { v: "全置換", tone: "warn" }, { v: "部分更新", tone: "lec" }, { v: "削除", tone: "err" }] }
], "このリポジトリの 6 操作。URL は 2 種類だけで、メソッドを送り分けて表している")}
${Fig.compare(
  { t: "✅ REST 流", tone: "ok", html: "<pre>GET    /calculations\nDELETE /calculations/5</pre>URL は名詞だけ。何をするかはメソッドが表す" },
  { t: "❌ 動詞を URL に入れる", tone: "err", html: "<pre>GET  /getAllCalculations\nPOST /deleteCalculation?id=5</pre>URL が操作の数だけ増え、何ができるか推測しにくい" }
)}
${Fig.compare(
  { t: "✅ ステートレス（REST）", tone: "ok", html: "毎回の注文票だけで仕事ができる。<br>「5 番を消して」と、対象を毎回書く" },
  { t: "❌ 会話の続きを覚えている", tone: "err", html: "「さっきのやつを消して」が通じる前提。<br>サーバーを増やしたり再起動したりすると壊れる" }
, "記録は DB に残すが、「さっきの続き」という会話の記憶はサーバーに持たせない")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "メソッドとステータスの対応", "6 操作のメソッド・URL・ステータスの対応表（コメント内）")
      ],
      checks: [
        { q: "Controller の対応表で、URL（パス）は何種類使われている？",
          a: "2 種類だけ。/calculations（全体）と /calculations/{id}（1 件）。6 つの操作をメソッドの違いで表している。" }
      ]
    }
  ],
  observe: {
    intro: `<p>アプリを起動し（<code>./mvnw spring-boot:run</code>。Docker が必要）、別のターミナルで試す。
<code>api-console.html</code>（Live Server で開く）でも同じことができる。</p>`,
    steps: [
      { do: `作成: <pre>curl -i -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":2,"operator":"ADD","right":3}'</pre><code>-i</code> を付けるとステータスとヘッダも表示される。`,
        expect: "1 行目が HTTP/1.1 201、Location ヘッダがあり、ボディに \"result\":5 と id が入っている" },
      { do: `一覧: <pre>curl -s http://localhost:8080/api/v1/calculations</pre>`,
        expect: "{\"content\":[ … ],\"page\":{ … }} の形。さっき作った記録が入っている" },
      { do: `わざと間違える（operator を書かない）: <pre>curl -i -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":2,"right":3}'</pre>`,
        expect: "HTTP/1.1 400。ボディの errors に operator が入っている（4xx ＝ 頼み方の問題）" }
    ]
  },
  ai: `
${Fig.flow([
  { ic: "🧑", t: "人間", s: "契約を決める<br>URL・メソッド・ステータス・JSON", tone: "lec" },
  { ic: "📄", t: "docs/spec.md §3", s: "契約を文章にする", tone: "dim" },
  { ic: "🤖", t: "AI（Claude）", s: "契約を読んで実装する", tone: "accent" }
], ["書く", "読ませる"], { caption: "API の形は公開後に変えにくい。だから人間が決めて書き、AI に渡す" })}
<ul>
<li>AI に「計算 API を作って」とだけ頼むと、URL やステータスは AI の好みで決まる。<b>何を返すべきかを先に決めて渡す</b>のが人間の仕事。</li>
<li>AI の出力を見るときは、まず「URL が名詞か」「メソッドとステータスの対応が契約どおりか」を確認する。</li>
</ul>`,
  questions: [
    { q: "API の説明として最も適切なものは？",
      choices: ["プログラムが別のプログラムに仕事を頼むための、決まった書式の窓口", "Web ページの見た目を作るための言語", "データを保存しておく場所そのもの", "プログラムを高速に動かすための機械"],
      explain: "API は「頼み方と返し方の約束（契約）」を持った窓口。見た目（HTML）や保存場所（DB）とは別物。", see: "s1" },
    { q: "api-console.html から計算を頼んだとき、「クライアント」にあたるのはどれ？",
      choices: ["api-console.html を開いているブラウザ", "Spring Boot のアプリ", "PostgreSQL（DB）", "GitHub"],
      explain: "頼む側がクライアント。サーバーは Spring Boot のアプリ、DB はサーバーがさらに使う裏方。", see: "s2" },
    { q: "画面をスマホアプリに作り替えることになった。API（契約）を変えない場合、サーバー側はどうなる？",
      choices: ["基本的に変えなくてよい", "スマホ用に全面的に作り直す必要がある", "DB を別の種類に変える必要がある", "URL をすべてスマホ用に変える必要がある"],
      explain: "クライアントが何であっても、同じ契約で応えるのが API を分ける価値。", see: "s2" },
    { q: "HTTP リクエストの 4 つの欄に含まれないものは？",
      choices: ["ステータスコード", "メソッド", "URL", "ボディ"],
      explain: "ステータスコードはレスポンス（返事）の欄。リクエストはメソッド・URL・ヘッダ・ボディ。", see: "s3" },
    { q: "GET /api/v1/calculations?operator=DIVIDE の「?operator=DIVIDE」は何？",
      choices: ["クエリ。一覧の絞り込み条件を渡している", "ボディ。計算式を渡している", "ヘッダ。データの形式を伝えている", "パスの一部で、DIVIDE という名前のリソースを指している"],
      explain: "? より後ろはクエリ。「何に対して」はパス（/calculations）で、クエリはその絞り込み方。", see: "s3" },
    { q: "サーバーのコードで「/api/v1/calculations への POST をどのメソッドが受けるか」を決めているのは？",
      choices: ["CalculationController の @RequestMapping と @PostMapping", "application.yml の設定", "CalculationRequest の項目名", "compose.yaml"],
      explain: "Controller のクラスに付いた @RequestMapping が URL の入口、メソッドに付いた @PostMapping が「POST ならここ」を宣言している。", see: "s3" },
    { q: "ステータスコード 404 が返ってきた。まず疑うべきことは？",
      choices: ["指定した番号（id）の記録が存在しない、または URL が違う", "サーバーのプログラムにバグがある", "通信が暗号化されていない", "計算結果が大きすぎる"],
      explain: "4xx はクライアント側の問題。404 は「宛先が無い」。サーバーのバグなら 5xx。", see: "s4" },
    { q: "ステータスコードの百の位が 5（5xx）だった。これは何を意味する？",
      choices: ["サーバー側に問題がある", "リクエストが成功した", "クライアントの書き方が間違っている", "リソースが新しく作られた"],
      explain: "2xx 成功 / 4xx クライアント側 / 5xx サーバー側。百の位で「誰のせいか」が分かる。", see: "s4" },
    { q: "作成（POST）が成功したとき、このリポジトリが返すステータスと、一緒に返すヘッダは？",
      choices: ["201 と Location（作られた記録の URL）", "200 と Content-Length", "204 とボディなし", "302 と Redirect"],
      explain: "「新しく作った」は 201 Created。Location に作られたものの URL を入れるのが作法。", see: "s4" },
    { q: "削除（DELETE）が成功したときのステータス 204 の意味は？",
      choices: ["成功したが、返す中身（ボディ）は無い", "削除に失敗した", "削除の予約を受け付けた", "権限が無い"],
      explain: "204 No Content。消したので返すものが無い、という成功。", see: "s4" },
    { q: "次のうち、正しい JSON はどれ？",
      choices: ['{"left": 2, "operator": "ADD", "right": 3}', "{left: 2, operator: ADD, right: 3}", "(left=2, operator=ADD, right=3)", "&lt;left&gt;2&lt;/left&gt;&lt;operator&gt;ADD&lt;/operator&gt;"],
      explain: "JSON は { } の中に \"名前\": 値。名前と文字列の値は \" \" で囲む。最後の例は XML という別の書式。", see: "s5" },
    { q: "リクエストの Content-Type: application/json ヘッダは何を伝えている？",
      choices: ["ボディの中身が JSON で書かれていること", "レスポンスを JSON で返してほしい人の名前", "サーバーの場所", "リクエストの送信時刻"],
      explain: "ヘッダは付帯情報。Content-Type は「ボディの形式」。これを見てサーバーは中身の読み方を決める。", see: "s3" },
    { q: "レスポンスには id や createdAt があるのに、リクエストの型（CalculationRequest）には無い。なぜ？",
      choices: ["それらはサーバーが決める値で、クライアントが送るものではないから", "書き忘れているバグだから", "JSON では id を送れない決まりだから", "リクエストは小さいほど速いので省略しているから"],
      explain: "番号・結果・時刻はサーバーが決めて返す。「誰が決める値か」でリクエスト用とレスポンス用の型を分けている。", see: "s5" },
    { q: "REST の作法で「5 番の記録を削除する」に最もふさわしいのは？",
      choices: ["DELETE /calculations/5", "POST /deleteCalculation?id=5", "GET /calculations/5/delete", "DELETE /deleteCalculations"],
      explain: "URL は名詞（もの）、メソッドは動詞（すること）。URL に delete のような動詞を入れない。", see: "s6" },
    { q: "このリポジトリの 6 操作で使っている URL（パス）の種類は？",
      choices: ["2 種類（/calculations と /calculations/{id}）", "6 種類（操作ごとに 1 つ）", "1 種類（すべて /calculations）", "12 種類"],
      explain: "全体と 1 件の 2 種類の URL に、メソッドを送り分けて 6 操作を表している。", see: "s6" },
    { q: "「ステートレス」の説明として正しいものは？",
      choices: ["サーバーは会話の続きを覚えておらず、毎回のリクエストだけで仕事ができるようにする", "サーバーはデータを一切保存しない", "ステータスコードを返さない", "クライアントが状態を持ってはいけない"],
      explain: "記録は DB に残すが、「さっきの続き」という会話の記憶は持たない。だから各リクエストは完結している必要がある。", see: "s6" },
    { q: "AI に API を実装させるとき、人間が先に決めて渡すべきものとして最も重要なのは？",
      choices: ["URL・メソッド・ステータス・JSON の項目といった「契約」", "変数名の付け方の好み", "インデントの幅", "使うエディタの種類"],
      explain: "契約は公開後に変えにくく、使う側すべてに影響する。人間が決めて spec に書き、AI に渡す。書式は Spotless などの機械に任せる。", see: "s6" },
    { q: "localhost:8080 の「8080」は何を表している？",
      choices: ["その PC の中の、何番の窓口で待ち受けているか（ポート番号）", "アプリのバージョン", "同時に受け付けられる人数", "DB のパスワード"],
      explain: "localhost は「この PC 自身」、8080 はポート番号。1 台の PC で複数のサーバーを番号で区別できる。", see: "s2" }
  ]
});
