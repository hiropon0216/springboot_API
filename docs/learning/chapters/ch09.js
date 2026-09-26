// 第 9 章 ブラウザからの呼び出し：CORS・バージョニング（書き方は AUTHORING.md）
Calc.register({
  no: 9,
  goal: [
    "オリジンとは何か、「別オリジンへの呼び出し」をブラウザが止める理由を説明できる",
    "CORS のプリフライト（OPTIONS）の流れを追える",
    "CorsConfig の各設定が何を許しているか読める",
    "API のバージョンの付け方（パス・ヘッダ）と、版を上げるべきときが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "オリジン：どこから来たページか",
      body: `
${Fig.http("オリジン ＝ この 3 つの組み合わせ", [
  { k: "スキーム", v: "http://", n: "http と https は別", tone: "accent" },
  { k: "ホスト", v: "127.0.0.1", n: "localhost と 127.0.0.1 も別", tone: "ok" },
  { k: "ポート", v: ":5500", n: "8080 と 5500 は別", tone: "lec" }
])}
${Fig.matrix("ページの場所 → 呼ぶ先 http://localhost:8080", ["同じ？", "理由"], [
  { h: "http://localhost:8080/swagger-ui.html", c: [{ v: "同一", tone: "ok" }, "3 つとも同じ"] },
  { h: "http://127.0.0.1:5500/api-console.html", c: [{ v: "別", tone: "warn" }, "ホストもポートも違う（Live Server）"] },
  { h: "file:///C:/…/api-console.html", c: [{ v: "別（null）", tone: "err" }, "ファイルとして開くとオリジンは null"] }
], "api-console.html を Live Server で開けと言っていたのは、file:// だとオリジンが null になり、許可のしようがないから")}`,
      refs: [
        code("src/main/java/com/example/calc/config/CorsConfig.java", "CORS(Cross-Origin Resource Sharing)の許可ルール", "CORS の説明（javadoc）")
      ],
      checks: [
        { q: "CorsConfig の javadoc を読み、CORS を一言で説明している部分を探そう。",
          a: "「ブラウザが今表示しているページのオリジンと別オリジンへの fetch/XHR を既定でブロックする安全機構」。サーバーが Access-Control-Allow-* ヘッダで許可を返すと通る。" }
      ]
    },
    {
      id: "s2",
      title: "なぜブラウザが止めるのか",
      body: `
${Fig.flow([
  { ic: "😈", t: "悪いサイト", s: "evil.example のページに<br>こっそり JavaScript", tone: "err" },
  { ic: "🌐", t: "あなたのブラウザ", s: "ログイン中の Cookie を<br>自動で付けて送ってしまう", tone: "warn" },
  { ic: "🏦", t: "あなたの銀行の API", s: "本人からの要求だと<br>思って答える", tone: "dim" }
], ["fetch('https://bank…')", "Cookie 付きで"], { caption: "もしブラウザが止めなければ、悪いサイトがあなたの権限で読み書きできてしまう。これを防ぐのが「同一オリジンポリシー」" })}
${Fig.compare(
  { t: "🌐 ブラウザからの呼び出し", tone: "warn", html: "別オリジンなら<b>既定で止める</b>。サーバーが「このオリジンは OK」と返したときだけ通す（＝ CORS）" },
  { t: "💻 curl・サーバー同士の呼び出し", tone: "dim", html: "<b>CORS は関係ない</b>。CORS はブラウザが利用者を守るための仕組みで、curl は止めない" },
  "CORS はサーバーを守る仕組みではない。ブラウザの利用者を守る仕組み。だから認証（第 18 章）の代わりにはならない"
)}`,
      refs: [
        code("src/main/java/com/example/calc/config/CorsConfig.java", "このメソッド・ヘッダで送っていいか", "プリフライトについての説明（javadoc）")
      ],
      checks: [
        { q: "curl で別のパソコンから API を呼んでも CORS のエラーにならないのはなぜ？",
          a: "CORS はブラウザが実施する仕組みだから。curl はブラウザではないので、サーバーの Access-Control-* ヘッダを見て止めたりしない。" }
      ]
    },
    {
      id: "s3",
      title: "プリフライト：本番の前の「送っていい？」",
      body: `
<p>PATCH や JSON の POST のように副作用がありうる要求は、ブラウザがまず <b>OPTIONS</b> で許可を確認する。1 コマずつ追ってみよう。</p>
${Fig.stepper({
  nodes: [
    { id: "b", t: "🌐 ブラウザ", s: "api-console（http://127.0.0.1:5500）" },
    { id: "s", t: "☕ サーバー", s: "localhost:8080（CorsConfig）" }
  ],
  scenarios: [
    { name: "許可されたオリジン", steps: [
      { node: "b", t: "① 本番の前に、許可を確認する（プリフライト）", log: ["OPTIONS /api/v1/calculations/1", "Origin: http://127.0.0.1:5500", "Access-Control-Request-Method: PATCH", "Access-Control-Request-Headers: content-type"], d: "JavaScript を書いた人は OPTIONS を送っていない。ブラウザが自動で送る。" },
      { node: "s", t: "② 許可を返す", log: ["HTTP/1.1 200", "Access-Control-Allow-Origin: http://127.0.0.1:5500", "Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS", "Access-Control-Max-Age: 3600"], d: "CorsConfig の設定どおりに答える。Max-Age の間（1 時間）はこの確認を省ける。" },
      { node: "b", t: "③ 本番のリクエストを送る", log: ["PATCH /api/v1/calculations/1", "Origin: http://127.0.0.1:5500", "Content-Type: application/json", "", '{"memo":"家計簿"}'] },
      { node: "s", t: "④ 返事にも許可を付ける", log: ["HTTP/1.1 200", "Access-Control-Allow-Origin: http://127.0.0.1:5500", "", '{"id":1, … ,"memo":"家計簿"}'], d: "ブラウザはこのヘッダを確かめてから、JavaScript に結果を渡す。" }
    ]},
    { name: "許可されていないオリジン", steps: [
      { node: "b", t: "① 悪いサイトからプリフライト", log: ["OPTIONS /api/v1/calculations/1", "Origin: https://evil.example", "Access-Control-Request-Method: DELETE"] },
      { node: "s", t: "② 許可しない", stop: true, log: ["HTTP/1.1 403", "Invalid CORS request"], d: "許可リストに無いオリジン。Access-Control-Allow-Origin を返さない。" },
      { node: "b", t: "③ ブラウザが本番を送らない", stop: true, log: ["（DELETE は送られない。JavaScript にはエラーが返る）"], d: "止めているのはブラウザ。" }
    ]}
  ]
})}`,
      refs: [
        code("src/main/java/com/example/calc/config/CorsConfig.java", ".maxAge(3600)", "プリフライトの結果をブラウザが覚えておく秒数")
      ],
      checks: [
        { q: "GET のような単純な要求では、プリフライトが省略されることがある。このリポジトリの PATCH でプリフライトが必ず送られるのはなぜ？",
          a: "PATCH は「単純なメソッド」（GET / HEAD / POST）ではなく、Content-Type: application/json も単純な形式ではないから。副作用がありうる要求は、先に許可を確認する。" }
      ]
    },
    {
      id: "s4",
      title: "CorsConfig を読む",
      body: `
${Fig.code([
  { c: "registry" },
  { c: '  .addMapping("/api/**")', tag: "対象の URL", tone: "accent" },
  { c: '  .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*", …)', tag: "許すオリジン（開発用に広め）", tone: "warn" },
  { c: '  .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")', tag: "許すメソッド", tone: "ok" },
  { c: '  .allowedHeaders("*")', tag: "許すヘッダ", tone: "ok" },
  { c: '  .exposedHeaders("Location")', tag: "JS に見せる返事のヘッダ", tone: "lec" },
  { c: "  .allowCredentials(false)", tag: "Cookie は送らせない", tone: "dim" },
  { c: "  .maxAge(3600);", tag: "確認の結果を 1 時間覚える", tone: "dim" }
], "Spring Security が無いので、Spring MVC の WebMvcConfigurer で設定している")}
${Fig.cards([
  { ic: "👁️", t: "exposedHeaders(\"Location\")", d: "別オリジンの JS が読める返事のヘッダは既定で数種類だけ。201 の Location を api-console で表示するため、明示的に公開した", tone: "lec" },
  { ic: "🍪", t: "allowCredentials(false)", d: "Cookie や認証ヘッダを送らないので false。false のときだけオリジンにワイルドカード（*）を使える", tone: "dim" },
  { ic: "⚠️", t: "本番では絞る", d: "localhost:* などは開発用。本番で別オリジンの画面を載せるなら、その URL だけを許す", tone: "warn" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/config/CorsConfig.java", ".allowedOriginPatterns(", "許すオリジンの一覧"),
        code("src/main/java/com/example/calc/config/CorsConfig.java", '.exposedHeaders("Location")', "Location ヘッダを JS に見せる"),
        code("src/main/java/com/example/calc/config/CorsConfig.java", ".allowCredentials(false)", "Cookie を送らせない")
      ],
      checks: [
        { q: "CorsConfig の javadoc に、Spring Security を入れたときの注意が書いてある。何と書いてある？",
          a: "Security を入れると MVC 層より手前のフィルタでプリフライトが弾かれるので、その場合は CorsConfigurationSource の Bean と http.cors() が必要になる（第 18 章）。" }
      ]
    },
    {
      id: "s5",
      title: "API のバージョン：/api/v1 の v1",
      body: `
${Fig.matrix("付け方", ["例", "このリポジトリ"], [
  { h: "パスに付ける", c: ["GET /api/v1/calculations", { v: "採用", tone: "ok" }] },
  { h: "ヘッダに付ける", c: ["API-Version: 2（Spring Framework 7 は標準で対応）", { v: "不採用", tone: "dim" }] },
  { h: "クエリに付ける", c: ["?version=2", { v: "不採用", tone: "dim" }] }
], "パスに付ける方式が今もいちばん広く使われ、見れば分かる。ADR 0008 でネイティブのバージョン管理は見送った")}
${Fig.flow([
  { ic: "💥", t: "破壊的変更が必要", s: "形を変える・必須を足す（第 8 章）", tone: "warn" },
  { ic: "🆕", t: "/api/v2 を新設", s: "新しい形はこちら", tone: "accent" },
  { ic: "🕰️", t: "/api/v1 はしばらく残す", s: "既存の利用者が移るまで", tone: "dim" }
], ["", ""], { caption: "公開 API で既存の利用者がいるなら、壊すのではなく版を上げる。このリポジトリは利用者が居ないので v1 のまま変えている" })}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", '@RequestMapping("/api/v1/calculations")', "版はパスの一部"),
        code("docs/adr/0008-rest-api-finishing.md", "Spring Framework 7 のネイティブ API バージョニング", "ネイティブのバージョン管理を見送った理由")
      ],
      checks: [
        { q: "Sprint 7 で一覧の形を変えた（破壊的変更）のに /api/v2 にしなかったのはなぜ？",
          a: "学習用で外部の利用者がいないから。公開 API で利用者がいれば、v2 を新設して v1 を残すのが筋。ADR 0008 でも「複数バージョンを並走させる需要がない」としている。" }
      ]
    }
  ],
  observe: {
    intro: "<p>アプリを起動し、ブラウザの代わりに curl で Origin ヘッダを付けて送る。</p>",
    steps: [
      { do: `<pre>curl -si -X OPTIONS http://localhost:8080/api/v1/calculations/1 -H "Origin: http://127.0.0.1:5500" -H "Access-Control-Request-Method: PATCH" -H "Access-Control-Request-Headers: content-type"</pre>`,
        expect: "200、Access-Control-Allow-Origin: http://127.0.0.1:5500、Allow-Methods に PATCH" },
      { do: "同じコマンドを <code>Origin: https://evil.example</code> に変えて送る。", expect: "403 Invalid CORS request。Access-Control-Allow-Origin は付かない" },
      { do: "api-console.html を Live Server で開いて作成（POST）を送る。次にファイルをダブルクリック（file://）で開いて同じことをする。",
        expect: "Live Server では 201 と Location が表示される。file:// では「返事が返ってきません」（オリジン null を許可していないため）" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🌍", t: "allowedOrigins(\"*\") を疑う", d: "CORS エラーを消すために AI が「全部許可」を提案することがある。開発用か本番用かを区別させる", tone: "err" },
  { ic: "🛡️", t: "CORS はセキュリティの本体ではない", d: "CORS でサーバーを守った気にならない。守るのは認証・認可（第 18 章）", tone: "warn" },
  { ic: "🧭", t: "版を上げるかは人間が決める", d: "破壊的変更のたびに v2 を作るかどうかは、利用者の有無で判断する契約の話", tone: "accent" }
])}`,
  questions: [
    { q: "「オリジン」を構成するものは？",
      choices: ["スキーム・ホスト・ポートの 3 つ", "URL のパスとクエリ", "IP アドレスだけ", "ドメイン名だけ"],
      explain: "3 つのどれかが違えば別オリジン。http と https、8080 と 5500 も別。", see: "s1" },
    { q: "http://localhost:8080 と http://localhost:5500 は同じオリジン？",
      choices: ["別。ポートが違う", "同じ。ホストが同じ", "同じ。スキームが同じ", "ブラウザによる"],
      explain: "ポートもオリジンの一部。", see: "s1" },
    { q: "api-console.html をファイルとして（file://）開くと呼び出しに失敗するのはなぜ？",
      choices: ["オリジンが null になり、許可リストに一致しないから", "ファイルからは HTTP を送れないから", "JavaScript が動かないから", "サーバーが file を拒否するから"],
      explain: "だから Live Server など HTTP で開く必要がある。", see: "s1" },
    { q: "ブラウザが別オリジンへの呼び出しを既定で止める目的は？",
      choices: ["悪いサイトが、利用者のログイン状態を使って別サイトを読み書きするのを防ぐため", "サーバーの負荷を減らすため", "通信を暗号化するため", "広告を止めるため"],
      explain: "Cookie が自動で付くので、止めなければ利用者の権限で勝手に操作されうる。", see: "s2" },
    { q: "curl で API を呼んだとき CORS の制限を受けないのはなぜ？",
      choices: ["CORS はブラウザが実施する仕組みだから", "curl は暗号化しているから", "サーバーが curl を特別扱いするから", "curl は GET しか送らないから"],
      explain: "CORS はブラウザの利用者を守る仕組み。サーバーを守る仕組みではない。", see: "s2" },
    { q: "CORS について誤っている説明は？",
      choices: ["CORS を正しく設定すれば、認証が無くてもサーバーは安全になる", "CORS はブラウザが実施する", "サーバーは Access-Control-Allow-* ヘッダで許可を伝える", "curl には関係ない"],
      explain: "CORS は認証・認可の代わりにならない。curl なら誰でも呼べる。", see: "s2" },
    { q: "プリフライトで、ブラウザが自動で送るメソッドは？",
      choices: ["OPTIONS", "HEAD", "GET", "CONNECT"],
      explain: "本番の前に OPTIONS で「このメソッド・ヘッダで送っていいか」を確認する。", see: "s3" },
    { q: "プリフライトの応答に Access-Control-Allow-Origin が無かった。ブラウザはどうする？",
      choices: ["本番のリクエストを送らず、JavaScript にエラーを返す", "本番を送り、結果を JavaScript に渡す", "サーバーに再確認する", "自動で許可を追加する"],
      explain: "止めているのはブラウザ。", see: "s3" },
    { q: "maxAge(3600) の効果は？",
      choices: ["プリフライトの結果をブラウザが 1 時間覚え、毎回の OPTIONS を省ける", "API の応答を 1 時間キャッシュする", "1 時間でセッションが切れる", "1 時間に 3600 回まで呼べる"],
      explain: "毎回 OPTIONS が飛ぶのを抑える設定。", see: "s3" },
    { q: "exposedHeaders(\"Location\") を足した理由は？",
      choices: ["別オリジンの JavaScript が 201 の Location ヘッダを読めるようにするため", "Location を暗号化するため", "Location をサーバーが読むため", "CORS を無効にするため"],
      explain: "別オリジンの JS が読める返事のヘッダは既定で限られる。明示的に公開する必要がある。", see: "s4" },
    { q: "allowCredentials(false) にしている理由として正しいものは？",
      choices: ["Cookie や認証ヘッダを送らないから。false のときだけオリジンにワイルドカードを使える", "セキュリティを最大にするため必ず false にする決まり", "true だと遅いから", "Spring の既定を変えるため"],
      explain: "このアプリは Cookie も Authorization も使わない。", see: "s4" },
    { q: "CorsConfig の allowedOriginPatterns（localhost:* など）について正しいものは？",
      choices: ["開発用に広めにしている。本番で別オリジンの画面を載せるなら、その URL だけに絞る", "本番でもこのままが推奨", "すべてのオリジンを許可している", "オリジンを制限していない"],
      explain: "CorsConfig のコメントにも「本番で別オリジンのフロントを載せるときは、その URL だけに絞ること」とある。", see: "s4" },
    { q: "このリポジトリが API のバージョンを付けている方法は？",
      choices: ["パス（/api/v1/…）", "ヘッダ（API-Version）", "クエリ（?version=1）", "付けていない"],
      explain: "最も広く使われ、見れば分かる方式。", see: "s5" },
    { q: "公開 API に破壊的変更が必要になった。一般的な対応は？",
      choices: ["/api/v2 を新設し、/api/v1 はしばらく残す", "/api/v1 をそのまま変える", "API を止める", "ステータスを 500 にする"],
      explain: "既存の利用者を壊さないため。このリポジトリは利用者が居ないので v1 のまま変えている。", see: "s5" },
    { q: "AI が CORS エラーを消すために allowedOrigins(\"*\") を提案してきた。まず確認すべきことは？",
      choices: ["開発用か本番用か、どのオリジンを本当に許す必要があるか", "テストが通るか", "変数名が正しいか", "インデント"],
      explain: "全部許可は本番では危険。許す相手を決めるのは人間の判断。", see: "s4" },
    { q: "Spring Security を入れたとき、CORS の設定で気をつけることは？（CorsConfig の javadoc より）",
      choices: ["MVC より手前のフィルタでプリフライトが弾かれるので、Security 側でも CORS を設定する", "CORS が不要になる", "CorsConfig を削除する", "何も変わらない"],
      explain: "Security のフィルタが先に動くため、http.cors() と CorsConfigurationSource が必要になる。", see: "s4" }
  ]
});
