// 第 7 章 一覧と部分更新：ページング・Merge Patch（書き方は AUTHORING.md）
Calc.register({
  no: 7,
  goal: [
    "一覧を必ずページングする理由と、page / size の決め方を説明できる",
    "ページングのレスポンスの形（content と page）を読める",
    "並び順をクライアントに開放しない理由が分かる",
    "PATCH の「省略」と「null」の違い（JSON Merge Patch）を説明できる"
  ],
  sections: [
    {
      id: "s1",
      title: "一覧は必ずページングする",
      body: `
${Fig.compare(
  { t: "❌ 全件を返す（Sprint 6 まで）", tone: "err", html: "<pre>GET /calculations\n→ [ {…}, {…}, … 10 万件 ]</pre>データが増えるほど遅く・重くなり、いつか壊れる" },
  { t: "✅ 1 ページ分だけ返す（Sprint 7 から）", tone: "ok", html: "<pre>GET /calculations?page=0&size=20\n→ 20 件 ＋ 全体の件数</pre>件数が増えても 1 回の応答の重さは変わらない" }
)}
${Fig.flow([
  { ic: "📚", t: "全 45 件", s: "新しい順に並べる", tone: "dim" },
  { ic: "✂️", t: "20 件ずつ区切る", s: "page 0: 1〜20 件目<br>page 1: 21〜40 件目<br>page 2: 41〜45 件目", tone: "accent" },
  { ic: "📄", t: "?page=1&size=20", s: "21〜40 件目だけ返す", tone: "ok" }
], ["", ""], { caption: "page は 0 始まり。size は 1〜100（大きすぎる size は、全件取得と同じになってしまう）" })}
<div class="note"><b>破壊的変更だった</b>　あとから入れたので、一覧のレスポンスが配列からオブジェクトに変わった（使う側を全部直す必要がある）。
<b>一覧 API には最初からページングを入れておく</b>のが定石。</div>`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "static final int MAX_PAGE_SIZE = 100;", "1 ページの最大件数"),
        code("docs/adr/0008-rest-api-finishing.md", "## 決定", "ページングを入れた決定（ADR 0008）")
      ],
      checks: [
        { q: "page と size を指定しなかったときの既定値は？ Controller の @RequestParam を見よう。",
          a: "page = 0、size = 20（defaultValue）。何も付けなければ「新しい順に 20 件」。" }
      ]
    },
    {
      id: "s2",
      title: "ページングのレスポンスを読む",
      body: `
${Fig.code([
  { c: "{" },
  { c: '  "content": [ {"id": 4, …}, {"id": 3, …} ],', tag: "このページの中身", tone: "accent" },
  { c: '  "page": {', tag: "ページの情報", tone: "ok" },
  { c: '    "size": 2,', tag: "1 ページの件数", tone: "ok" },
  { c: '    "number": 1,', tag: "今のページ（0 始まり）", tone: "ok" },
  { c: '    "totalElements": 6,', tag: "全体の件数", tone: "ok" },
  { c: '    "totalPages": 3', tag: "全体のページ数", tone: "ok" },
  { c: "  }" },
  { c: "}" }
], "GET /calculations?page=1&size=2 の実物（6 件あるとき）。画面は totalPages を見て「次へ」ボタンを出せる")}
${Fig.flow([
  { ic: "🗄️", t: "Repository", s: "Page&lt;Calculation&gt;<br>SELECT … LIMIT / OFFSET<br>＋ SELECT COUNT(*)", tone: "lec" },
  { ic: "🧮", t: "Service", s: "Page&lt;CalculationResponse&gt;<br>中身だけ DTO に変換", tone: "accent" },
  { ic: "🚪", t: "Controller", s: "PagedModel で包む<br>→ 上の安定した JSON", tone: "ok" }
], ["page.map(…)", "new PagedModel&lt;&gt;(…)"], { caption: "総件数を出すため SQL は 2 本飛ぶ。Service は web の型（PagedModel）を知らず、包むのは Controller の仕事" })}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationRepository.java", "Page<Calculation> findByOperator(Operator operator, Pageable pageable);", "Pageable を足すだけでページング付きの SQL になる"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "return found.map(CalculationMapper::toResponse);", "中身だけ DTO に変える"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "return new PagedModel<>(result);", "JSON 用の形に包む")
      ],
      checks: [
        { q: "Page をそのまま返さず PagedModel に包むのはなぜ？（ADR 0008 の「採用した技術判断」を読もう）",
          a: "Page をそのまま JSON にすると内部構造（pageable・sort など）が出て形も安定しない。PagedModel は Spring Data がその問題の答えとして用意した、安定した形の DTO。" }
      ]
    },
    {
      id: "s3",
      title: "範囲外は丸めずに 400、並び順はサーバーが決める",
      body: `
${Fig.matrix("指定", ["結果", "理由"], [
  { h: "?size=101", c: [{ v: "400", tone: "warn" }, "上限を超えた。黙って 100 にすると、クライアントは誤りに気づけない"] },
  { h: "?page=-1", c: [{ v: "400", tone: "warn" }, "0 始まりなので負は無い"] },
  { h: "?page=99（最終ページより先）", c: [{ v: "200 ＋ 空", tone: "ok" }, "コレクションは存在する。中身が無いだけ（第 5 章）"] },
  { h: "?sort=leftOperand,asc", c: [{ v: "無視", tone: "dim" }, "並び順は受け付けない（下の図）"] }
])}
${Fig.compare(
  { t: "❌ Pageable を直接受けると", tone: "err", html: "<code>?sort=leftOperand</code> が効いてしまう。leftOperand は<b>エンティティのフィールド名</b>で、API の項目名（left）ではない → <b>内部の名前が API の仕様に漏れる</b>。無い名前だと 500" },
  { t: "✅ page と size だけ受ける", tone: "ok", html: "並び順は Service の <code>NEWEST_FIRST</code>（新しい順、同時刻は id の大きい順）で固定。<br>範囲は <code>@PositiveOrZero</code> / <code>@Min</code> / <code>@Max</code> で検査" }
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "private static final Sort NEWEST_FIRST", "並び順はサーバーが決める"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "@PositiveOrZero", "page は 0 以上")
      ],
      checks: [
        { q: "NEWEST_FIRST は createdAt の降順のあとに id の降順も指定している。なぜ id も必要？",
          a: "作成時刻が同じ記録が並んだとき、順番を安定させるため。順番がぶれると、ページをまたいで同じ記録が 2 回出たり、抜けたりする。" }
      ]
    },
    {
      id: "s4",
      title: "PATCH の 3 つの状態：JSON Merge Patch",
      body: `
<p>PATCH は「書いたところだけ変える」。そのためには<b>「書かなかった」と「null を書いた」を区別</b>しなければならない。</p>
${Fig.matrix("送る本文", ["memo は", "意味"], [
  { h: "<code>{}</code>", c: [{ v: "そのまま", tone: "ok" }, "書いていない ＝ 変更しない"] },
  { h: '<code>{"memo": null}</code>', c: [{ v: "消える", tone: "err" }, "null を書いた ＝ 消す"] },
  { h: '<code>{"memo": "家計簿"}</code>', c: [{ v: "家計簿", tone: "accent" }, "値を書いた ＝ その値にする"] }
], "この規則を JSON Merge Patch（RFC 7396）と呼ぶ。Content-Type は application/merge-patch+json（application/json も受け付ける）")}
${Fig.compare(
  { t: "❌ Sprint 6 の実装", tone: "err", html: "<pre>record MemoUpdateRequest(String memo)</pre><code>{}</code> も <code>{\"memo\": null}</code> も memo = null になり、<b>{} を送るとメモが消えた</b>" },
  { t: "✅ Sprint 7 の実装", tone: "ok", html: "<pre>record MemoUpdateRequest(\n  boolean memoSpecified, String memo)</pre>JSON を Map で受け、<b>キーがあったか</b>を memoSpecified に記録" }
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/dto/MemoUpdateRequest.java", "public static MemoUpdateRequest fromJson(Map<String, String> body)", "Map の containsKey で「書いたか」を判定"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "if (req.memoSpecified())", "書かれていたときだけ変える"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "static final String MERGE_PATCH_JSON", "Merge Patch のメディアタイプ")
      ],
      checks: [
        { q: "MemoUpdateRequest の javadoc に、Optional&lt;String&gt; を試してやめた理由が書いてある。何？",
          a: "Jackson 3 は項目が無いときも Optional.empty() を入れるので、「省略」と「null」を区別できなかった（テストで判明）。そこで Map で受ける形にした。" }
      ]
    },
    {
      id: "s5",
      title: "何も変えなければ、UPDATE も飛ばない",
      body: `
${Fig.flow([
  { ic: "📨", t: "PATCH {}", s: "memoSpecified = false", tone: "dim" },
  { ic: "🧮", t: "Service", s: "memo を触らない", tone: "accent" },
  { ic: "🔍", t: "Hibernate", s: "変更なし と判定<br>→ UPDATE を発行しない", tone: "lec" },
  { ic: "🕰️", t: "updatedAt", s: "進まない", tone: "ok" }
], ["", "flush", ""], { compact: true, caption: "変更が無ければ DB に書き込まない。Hibernate の「ダーティチェック」の働き（第 12・15 章）" })}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "public CalculationResponse updateMemo(Long id, MemoUpdateRequest req)", "PATCH の処理")
      ],
      checks: [
        { q: "updateMemo の javadoc で、{} を送ったとき updatedAt が進まない理由は何と説明されている？",
          a: "エンティティが変わっていなければ、flush しても Hibernate は UPDATE を発行しない（ダーティチェックで「変更なし」と判定される）ので、@PreUpdate も走らず updatedAt も進まない。" }
      ]
    }
  ],
  observe: {
    intro: "<p>アプリを起動し、記録を 5 件ほど作ってから試す（api-console.html の「一覧」「部分更新」タブにサンプルがある）。</p>",
    steps: [
      { do: "<code>curl -s 'http://localhost:8080/api/v1/calculations?page=1&size=2'</code>", expect: "content に 2 件、page.number が 1、totalPages が件数 ÷ 2（切り上げ）" },
      { do: "<code>curl -s 'http://localhost:8080/api/v1/calculations?size=101'</code>", expect: "400、errors.size に「100 以下の値にしてください」" },
      { do: "<code>curl -s 'http://localhost:8080/api/v1/calculations?page=99'</code>", expect: "200、content が空、totalElements は全件数" },
      { do: `メモを付けてから <code>{}</code> を送る:<pre>curl -s -X PATCH …/calculations/1 -H "Content-Type: application/json" -d '{"memo":"残す"}'
curl -s -X PATCH …/calculations/1 -H "Content-Type: application/merge-patch+json" -d '{}'</pre>`,
        expect: "2 回目の後も memo は「残す」のまま。updatedAt も変わらない" },
      { do: `<pre>curl -s -X PATCH …/calculations/1 -H "Content-Type: application/json" -d '{"memo":null}'</pre>`, expect: "memo が null になる" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "📄", t: "一覧を作らせるときはページングを指定", d: "AI は List をそのまま返す一覧を書きがち。page / size の上限と既定値を spec に書いて渡す", tone: "accent" },
  { ic: "🔓", t: "Pageable を直接受けていないか", d: "?sort= で内部の名前が漏れる。受け付ける並び順を決めてから実装させる", tone: "warn" },
  { ic: "🕳️", t: "PATCH の null を疑う", d: "String の項目で PATCH を受けていたら「省略」と「null」が区別できていない。{} を送るテストを書かせる", tone: "err" }
])}`,
  questions: [
    { q: "一覧 API に最初からページングを入れておくべき理由は？",
      choices: ["件数が増えるほど重くなるうえ、あとから入れるとレスポンスの形が変わる破壊的変更になるから", "ページングがあると DB が不要になるから", "HTTP の決まりだから", "テストが書きやすいから"],
      explain: "このリポジトリでも、あとから入れたので配列 → オブジェクトの破壊的変更になった。", see: "s1" },
    { q: "size に上限（100）を設けている理由は？",
      choices: ["大きすぎる size を許すと、全件取得と同じになってしまうから", "100 が HTTP の上限だから", "DB が 100 件しか返せないから", "画面に 100 件しか表示できないから"],
      explain: "上限が無ければ ?size=1000000 でページングの意味が無くなる。", see: "s1" },
    { q: "全 45 件を size=20 で区切ったとき、page=2 で返るのは？",
      choices: ["41〜45 件目の 5 件", "21〜40 件目", "1〜20 件目", "0 件"],
      explain: "page は 0 始まり。page 0 = 1〜20、page 1 = 21〜40、page 2 = 41〜45。", see: "s1" },
    { q: "レスポンスの page.totalElements が表すのは？",
      choices: ["条件に合う全体の件数", "このページの件数", "今のページ番号", "1 ページの件数"],
      explain: "size が 1 ページの件数、number が今のページ、totalPages が全ページ数。", see: "s2" },
    { q: "ページング付きの一覧で、SQL が 2 本飛ぶのはなぜ？",
      choices: ["1 ページ分の SELECT に加えて、総件数を出す COUNT(*) を発行するから", "失敗したときに再試行するから", "キャッシュを作るから", "ログを記録するから"],
      explain: "戻り値を Page にすると、総件数のための COUNT も自動で発行される。", see: "s2" },
    { q: "Page を PagedModel に包むのが Service ではなく Controller なのはなぜ？",
      choices: ["PagedModel は web 用の型で、Service は web の都合を知らないようにするため", "Service では PagedModel が使えないから", "Controller の方が速いから", "決まりは無い"],
      explain: "Service は Page（Spring Data の型）まで。JSON の形は Controller の仕事。", see: "s2" },
    { q: "?size=101 を送ったとき、100 に丸めず 400 にする理由は？",
      choices: ["黙って丸めると、クライアントは自分の指定が誤りだと気づけないから", "丸めると DB が壊れるから", "HTTP の決まりだから", "100 件より多いと遅いから"],
      explain: "受け付けられない指定ははっきり 400 で返す方が、契約として分かりやすい。", see: "s3" },
    { q: "最終ページより先（?page=99）を指定したときの結果は？",
      choices: ["200 と空の content（総件数は入る）", "404", "400", "最終ページの中身"],
      explain: "コレクションは存在する。そのページに中身が無いだけ。", see: "s3" },
    { q: "Pageable を Controller の引数で直接受けない理由は？",
      choices: ["?sort= でエンティティのフィールド名を指定できてしまい、内部の名前が API の仕様に漏れるから", "Pageable は古い機能だから", "Pageable では page が使えないから", "テストが書けないから"],
      explain: "leftOperand のような内部の名前が API の約束になってしまう。無い名前なら 500 にもなる。", see: "s3" },
    { q: "並び順に createdAt だけでなく id も指定している理由は？",
      choices: ["同じ時刻の記録の順番を安定させ、ページをまたいで重複・抜けが出ないようにするため", "id の方が速いから", "createdAt が null になることがあるから", "DB の決まりだから"],
      explain: "順番がぶれると、同じ記録が 2 ページに出たり、どこにも出なかったりする。", see: "s3" },
    { q: "JSON Merge Patch の規則で、PATCH に {} を送ったとき memo はどうなる？",
      choices: ["変わらない", "null になる", "空文字になる", "400 になる"],
      explain: "書いていない項目は変更しない。", see: "s4" },
    { q: "JSON Merge Patch の規則で、{\"memo\": null} を送ったとき memo はどうなる？",
      choices: ["消える（null になる）", "変わらない", "400 になる", "\"null\" という文字列になる"],
      explain: "null を書いた項目は消す。", see: "s4" },
    { q: "Sprint 6 の MemoUpdateRequest(String memo) の問題は何だった？",
      choices: ["{} と {\"memo\": null} がどちらも memo = null になり、{} でメモが消えた", "memo が 200 文字を超えられなかった", "PATCH が 405 になった", "memo が保存されなかった"],
      explain: "String では「省略」と「null」を区別できない。", see: "s4" },
    { q: "今の MemoUpdateRequest が「memo を書いたか」を判定している方法は？",
      choices: ["JSON を Map で受け、containsKey(\"memo\") で確かめる", "Optional&lt;String&gt; を使う", "memo が空文字かどうかを見る", "Content-Type を見る"],
      explain: "Map は「キーが無い」と「値が null」を区別できる。Optional は Jackson 3 では区別できなかった。", see: "s4" },
    { q: "PATCH に {} を送ったとき updatedAt が進まない理由は？",
      choices: ["エンティティが変わっていないので、Hibernate が UPDATE を発行せず @PreUpdate も走らないから", "PATCH では updatedAt を更新しない決まりだから", "Service が updatedAt を元に戻しているから", "{} は 400 になるから"],
      explain: "ダーティチェックで「変更なし」と判定される。", see: "s5" },
    { q: "AI が PATCH 用の DTO を record Req(String name, String memo) で作ってきた。まず疑うことは？",
      choices: ["「省略」と「null」が区別できず、書かなかった項目まで消えないか", "項目名が短すぎないか", "record を使ってよいか", "PUT と同じ URL か"],
      explain: "{} を送るテストで確かめる。区別できないと、別の項目を更新しただけで他の項目が消える。", see: "s4" }
  ]
});
