// 第 5 章 リソース設計：URL・メソッド・ステータス（書き方は AUTHORING.md）
Calc.register({
  no: 5,
  goal: [
    "「リソース」とは何か、コレクションと 1 件の違いを URL で表せる",
    "メソッドの「安全」「冪等」という性質と、それがなぜ大事かを説明できる",
    "ステータスコードを「リソースに何が起きたか」で選べる（201 / 200 / 204 / 404 / 405）",
    "PUT と PATCH、パスとクエリを、意味で使い分けられる"
  ],
  sections: [
    {
      id: "s1",
      title: "リソース：API が扱う「もの」",
      body: `
<p>REST では、API が扱う「もの」を<b>リソース</b>と呼び、URL で名前を付ける。このリポジトリのリソースは<b>計算履歴</b>だけ。</p>
${Fig.flow([
  { ic: "🗂️", t: "/api/v1/calculations", s: "コレクション（計算履歴の全体）", tone: "accent" },
  { ic: "📄", t: "/api/v1/calculations/{id}", s: "1 件（例: /calculations/12）", tone: "ok" }
], ["その中の 1 件"], { caption: "URL は「もの」の住所。全体（コレクション）と、その中の 1 件の 2 階層だけ" })}
${Fig.cards([
  { ic: "🔤", t: "名詞・複数形", d: "calculations。動詞（create / delete）は入れない", tone: "accent" },
  { ic: "🧱", t: "階層で包含を表す", d: "/calculations/12 は「calculations の中の 12 番」", tone: "ok" },
  { ic: "🏷️", t: "/api/v1 は前置き", d: "API であること・版（第 9 章）。リソース名ではない", tone: "dim" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", '@RequestMapping("/api/v1/calculations")', "リソースの住所（コレクション）"),
        code("docs/spec.md", "### 3.1 一覧", "契約書のリソースごとの節")
      ],
      checks: [
        { q: "spec.md §3 の見出しを見て、パスが /api/v1/calculations のものと /api/v1/calculations/{id} のものに分けてみよう。",
          a: "コレクション: 3.1 一覧・3.3 作成。1 件: 3.2 取得・3.4 全置換・3.5 部分更新・3.6 削除。「作る」はまだ番号が無いのでコレクションに対して行う。" }
      ]
    },
    {
      id: "s2",
      title: "メソッドの性質：安全と冪等",
      body: `
<p>HTTP メソッドには約束された<b>性質</b>がある。クライアントや途中の機械（プロキシ・ブラウザ）は、この性質を当てにして動く。</p>
${Fig.matrix("メソッド", ["安全", "冪等", "このリポジトリ"], [
  { h: "GET", c: [{ v: "✓", tone: "ok" }, { v: "✓", tone: "ok" }, "一覧・取得"] },
  { h: "POST", c: [{ v: "✗", tone: "err" }, { v: "✗", tone: "err" }, "作成（送るたびに増える）"] },
  { h: "PUT", c: [{ v: "✗", tone: "err" }, { v: "✓", tone: "ok" }, "全置換"] },
  { h: "PATCH", c: [{ v: "✗", tone: "err" }, { v: "△", tone: "warn" }, "部分更新（この API では冪等）"] },
  { h: "DELETE", c: [{ v: "✗", tone: "err" }, { v: "✓", tone: "ok" }, "削除（2 回目は 404 だが状態は同じ）"] }
], "安全 ＝ サーバーの状態を変えない。冪等 ＝ 何回送っても 1 回送ったのと同じ状態になる")}
${Fig.compare(
  { t: "📶 通信が途切れた。送り直してよい？", tone: "accent", html: "<ul><li><b>PUT / DELETE</b>：何回送っても結果は同じ → 送り直してよい</li><li><b>GET</b>：状態を変えない → いつでもよい</li></ul>" },
  { t: "⚠️ POST は要注意", tone: "warn", html: "送り直すと<b>記録が 2 件できる</b>かもしれない。<br>だから「作成」は POST、「置き換え」は PUT と、意味どおりに使い分ける" }
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "メソッドとステータスの対応", "6 操作と「安全・冪等」の対応表（コメント内）")
      ],
      checks: [
        { q: "Controller の対応表の「意味」の列で、「冪等でない」と書かれているのはどの操作？",
          a: "作成（POST）。「冪等でない（叩くたび増える）」。PATCH は「冪等でなくてもよい」、GET・PUT・DELETE は冪等。" }
      ]
    },
    {
      id: "s3",
      title: "ステータスは「リソースに何が起きたか」で選ぶ",
      body: `
${Fig.flow([
  { ic: "➕", t: "POST /calculations", s: "201 Created<br>Location: …/calculations/12", tone: "accent" },
  { ic: "📖", t: "GET /calculations/12", s: "200 OK<br>作ったものが返る", tone: "ok" },
  { ic: "🗑️", t: "DELETE /calculations/12", s: "204 No Content<br>返す中身なし", tone: "err" },
  { ic: "❓", t: "GET /calculations/12", s: "404 Not Found<br>もう無い", tone: "warn" }
], ["Location を辿る", "消す", "もう一度見る"], { dir: "v", caption: "1 件のリソースの一生。ステータスは実装の都合ではなく、リソースに起きたことを表す" })}
${Fig.cards([
  { t: "201 Created", d: "新しいリソースができた。Location にその住所を入れる", tone: "accent" },
  { t: "200 OK", d: "取得できた・更新できた。中身を返す", tone: "ok" },
  { t: "204 No Content", d: "成功したが返す中身が無い（削除）", tone: "ok" },
  { t: "404 Not Found", d: "その住所にリソースが無い", tone: "warn" },
  { t: "405 Method Not Allowed", d: "その住所にそのメソッドは無い（DELETE /calculations など）", tone: "warn" }
])}
<div class="note"><b>歴史の話</b>　計算するだけで何も残らなかった頃（Sprint 5）は POST の成功は 200 だった。DB に保存するようになって 201 に変えた。
<b>リソースが生まれるようになったから</b>ステータスが変わった、というのがこの章の核心。</div>`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "uriBuilder.path(", "作ったリソースの住所（Location）を組み立てる"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "ResponseEntity.created(location).body(response)", "201 ＋ Location で返す"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "ResponseEntity.noContent().build()", "削除は 204")
      ],
      checks: [
        { q: "Location の URL を文字列の足し算で作らず、UriComponentsBuilder を使っているのはなぜ？（コードのコメントを読もう）",
          a: "ホスト名やコンテキストパスが変わっても壊れないように、今のリクエストから URL を組み立てさせるため。引数に宣言するだけで Spring が渡してくれる。" }
      ]
    },
    {
      id: "s4",
      title: "PUT と PATCH：置き換えと変更",
      body: `
${Fig.compare(
  { t: "🔁 PUT ＝ 丸ごと置き換える", tone: "warn", html: `
<pre>PUT /calculations/12
{"left": 7, "operator": "MULTIPLY", "right": 6}</pre>
<ul><li>left / operator / right は<b>全部必須</b></li><li>送らなかった memo は <b>null に戻る</b></li><li>何回送っても同じ結果（冪等）</li></ul>` },
  { t: "✏️ PATCH ＝ 書いたところだけ変える", tone: "lec", html: `
<pre>PATCH /calculations/12
{"memo": "家計簿"}</pre>
<ul><li>memo だけ変わる。式も結果もそのまま</li><li><code>{}</code> なら何も変わらない</li><li>詳しい規則は第 7 章（Merge Patch）</li></ul>` },
  "違いは「送る項目の数」ではなく「意味」：PUT は置き換え、PATCH は変更"
)}
${Fig.pairs("PUT の入力", "PATCH の入力", [
  { l: "CalculationRequest<br><small>left / operator / right（全部必須）</small>", r: "MemoUpdateRequest<br><small>memo だけ</small>", tone: "accent" }
], "入力の型を分けている。POST と PUT は同じ CalculationRequest を使う（どちらも「式を丸ごと」渡すから）", "≠")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "entity.changeMemo(null);", "PUT では memo を null に戻す（＝置き換え）"),
        code("src/main/java/com/example/calc/calculation/dto/MemoUpdateRequest.java", "public record MemoUpdateRequest(", "PATCH 専用の入力の型")
      ],
      checks: [
        { q: "Service の replace（PUT）で、memo を null に戻している理由をコメントから読み取ろう。",
          a: "PUT は「その URL の中身をこの内容で全部置き換える」操作だから。本文に memo が無いなら、置き換えた後の memo は無い（null）。" }
      ]
    },
    {
      id: "s5",
      title: "0 件は 404 ではない",
      body: `
${Fig.compare(
  { t: "🗂️ 一覧が 0 件", tone: "ok", html: "<pre>GET /calculations?operator=DIVIDE\n→ 200 {\"content\": [], …}</pre>コレクションという<b>リソースは存在する</b>。中身が 0 件なだけ" },
  { t: "📄 1 件が見つからない", tone: "warn", html: "<pre>GET /calculations/999999\n→ 404</pre>その住所の<b>リソースが存在しない</b>" },
  "404 は「宛先が無い」。空っぽの箱は「箱が無い」とは違う"
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "一覧が 0 件なのは「異常」ではない", "0 件でも 200 にする理由（コメント）"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "private Calculation mustFind(Long id)", "1 件が無ければ 404 用の例外にする")
      ],
      checks: [
        { q: "mustFind が返すのではなく「投げる」ものは何？ それは最終的に何番になる？",
          a: "ResourceNotFoundException。GlobalExceptionHandler が 404 の ProblemDetail に変換する（第 6 章）。" }
      ]
    },
    {
      id: "s6",
      title: "パスとクエリの使い分け",
      body: `
${Fig.pairs("パス（/ で区切る）", "クエリ（? の後ろ）", [
  { l: "<b>どのリソースか</b>", r: "<b>どう見せるか</b>", tone: "accent" },
  { l: "/calculations/12", lnote: "12 番の計算", r: "?operator=DIVIDE", rnote: "割り算だけに絞る", tone: "ok" },
  { l: "/calculations", lnote: "計算履歴の全体", r: "?page=1&size=20", rnote: "2 ページ目を 20 件ずつ", tone: "ok" }
], "パスはリソースの場所、クエリは絞り込み・並び・ページの指定", "│")}
${Fig.compare(
  { t: "✅ 絞り込みはクエリ", tone: "ok", html: "<pre>GET /calculations?operator=ADD</pre>リソースは同じ「計算履歴」。見せ方だけ変わる" },
  { t: "❌ 絞り込みをパスに", tone: "err", html: "<pre>GET /calculations/add</pre>「add という名前の 1 件」に見える。{id} と区別できない" }
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "パスは「リソースの場所」、クエリは「絞り込み方」", "使い分けの説明（コメント）")
      ],
      checks: [
        { q: "もし /calculations/add を作ったら、既存の /calculations/{id} とどうぶつかる？",
          a: "\"add\" が id として解釈され、Long に変換できず 400 になる（または add 専用のルールと競合する）。パスは「どれか」を表す場所なので、絞り込みを入れると意味が混ざる。" }
      ]
    }
  ],
  observe: {
    intro: "<p>アプリを起動し、1 件のリソースの一生を追う（api-console.html でも可）。</p>",
    steps: [
      { do: `作成: <pre>curl -i -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":2,"operator":"ADD","right":3}'</pre>`,
        expect: "201 と Location: …/calculations/N" },
      { do: "Location の URL をそのまま GET する。", expect: "200 で同じ内容" },
      { do: `PUT で置き換え: <pre>curl -s -X PUT http://localhost:8080/api/v1/calculations/N -H "Content-Type: application/json" -d '{"left":7,"operator":"MULTIPLY","right":6}'</pre>同じコマンドをもう一度送る。`,
        expect: "2 回とも result が 42。何回送っても同じ（冪等）" },
      { do: "<code>curl -i -X DELETE …/calculations/N</code> を 2 回送る。", expect: "1 回目 204、2 回目 404。状態（無い）は同じ" },
      { do: "<code>curl -i -X DELETE http://localhost:8080/api/v1/calculations</code>（コレクションを消そうとする）", expect: "405 Method Not Allowed。その住所に DELETE は無い" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "📐", t: "URL とステータスは先に決める", d: "AI に任せると、動詞入りの URL や「何でも 200」を出してくることがある。spec の表を渡してから実装させる", tone: "accent" },
  { ic: "🔁", t: "冪等性を確かめる", d: "PUT なのに毎回新しい記録を作っていないか。POST を「更新」に使っていないか", tone: "warn" },
  { ic: "🗂️", t: "0 件と 404", d: "一覧が空のとき 404 を返す実装は典型的な誤り。レビューで見る", tone: "err" }
])}`,
  questions: [
    { q: "REST でいう「リソース」の説明として正しいものは？",
      choices: ["API が扱う「もの」で、URL で名前を付ける", "サーバーの CPU やメモリ", "HTTP のメソッドのこと", "データベースのテーブルと必ず 1 対 1 のもの"],
      explain: "リソースは API の外から見える「もの」。DB のテーブルと一致させる必要はない（第 11 章）。", see: "s1" },
    { q: "このリポジトリで「作成」を /calculations（コレクション）に対して行うのはなぜ？",
      choices: ["作る前はまだ番号（id）が無く、コレクションに「1 件追加して」と頼むから", "1 件の URL には POST を送れない決まりだから", "コレクションの方が速いから", "PUT が使えないから"],
      explain: "id は DB が採番する。まだ無い番号の住所には送れないので、コレクションに追加を頼む。", see: "s1" },
    { q: "「安全」なメソッドの意味は？",
      choices: ["サーバーの状態を変えない", "暗号化されている", "認証が不要", "何回送っても同じ結果になる"],
      explain: "安全 ＝ 状態を変えない（GET など）。「何回送っても同じ」は冪等。", see: "s2" },
    { q: "「冪等」なメソッドの意味は？",
      choices: ["何回送っても、1 回送ったのと同じ状態になる", "必ず同じレスポンスが返る", "状態を一切変えない", "一度しか送れない"],
      explain: "状態が同じになることが要点。DELETE は 2 回目が 404 でも、状態（無い）は同じなので冪等。", see: "s2" },
    { q: "通信が途切れて、結果が分からなくなった。送り直すと記録が二重にできるおそれがあるのは？",
      choices: ["POST", "PUT", "DELETE", "GET"],
      explain: "POST は冪等でない。送るたびに新しい記録ができうる。", see: "s2" },
    { q: "DELETE を同じ id に 2 回送ると、1 回目 204・2 回目 404 になる。DELETE は冪等と言える？",
      choices: ["言える。レスポンスは違っても、サーバーの状態（その記録が無い）は同じだから", "言えない。レスポンスが違うから", "言えない。404 はエラーだから", "2 回目を 204 にしない限り言えない"],
      explain: "冪等は「状態」についての性質。レスポンスが同じである必要はない。", see: "s2" },
    { q: "新しい計算を保存できたときのステータスとして最も適切なのは？",
      choices: ["201 Created（Location 付き）", "200 OK", "204 No Content", "202 Accepted"],
      explain: "新しいリソースが生まれたので 201。Location にその住所を入れる。", see: "s3" },
    { q: "Sprint 5（DB なし）では POST の成功が 200 だった。Sprint 6 で 201 に変えた理由は？",
      choices: ["DB に保存するようになり、新しいリソースが生まれるようになったから", "Spring Boot のバージョンが上がったから", "201 の方が速いから", "テストが通らなかったから"],
      explain: "ステータスは実装の都合ではなく、リソースに何が起きたかで決まる。", see: "s3" },
    { q: "DELETE /api/v1/calculations（コレクションに DELETE）を送ったときのステータスは？",
      choices: ["405 Method Not Allowed", "204 No Content", "404 Not Found", "400 Bad Request"],
      explain: "その URL に DELETE の受け口が無い。住所はあるがメソッドが無いので 405。", see: "s3" },
    { q: "Location ヘッダの URL を UriComponentsBuilder で組み立てる利点は？",
      choices: ["ホスト名やパスが環境で変わっても、今のリクエストから正しく組み立てられる", "URL が短くなる", "暗号化される", "DB の検索が速くなる"],
      explain: "文字列の足し算だと、環境ごとの違いで壊れる。", see: "s3" },
    { q: "PUT で memo を送らなかった。memo はどうなる？（このリポジトリの仕様）",
      choices: ["null に戻る", "元のまま残る", "400 になる", "空文字になる"],
      explain: "PUT は丸ごと置き換え。送らなかったものは置き換え後に存在しない。", see: "s4" },
    { q: "PUT と PATCH の違いを最も正しく表しているのは？",
      choices: ["PUT は置き換え、PATCH は書いたところだけの変更", "PUT は作成、PATCH は削除", "PUT は項目が多いとき、PATCH は少ないとき", "違いは無い"],
      explain: "送る項目の数ではなく「意味」の違い。", see: "s4" },
    { q: "POST と PUT が同じ入力の型（CalculationRequest）を使っている理由は？",
      choices: ["どちらも「式を丸ごと」渡す操作だから", "型を増やすのが面倒だから", "Spring の決まりだから", "PATCH も同じ型だから"],
      explain: "作成も置き換えも、left / operator / right が全部必要。PATCH は memo だけなので別の型。", see: "s4" },
    { q: "?operator=DIVIDE で絞り込んだら 0 件だった。返すべきステータスは？",
      choices: ["200 と空の content", "404", "204", "400"],
      explain: "コレクションは存在する。中身が 0 件なだけ。", see: "s5" },
    { q: "「割り算の履歴だけ見たい」を表す URL として適切なのは？",
      choices: ["GET /calculations?operator=DIVIDE", "GET /calculations/divide", "GET /divideCalculations", "POST /calculations/search/divide"],
      explain: "絞り込みはクエリ。パスは「どのリソースか」を表す場所。", see: "s6" },
    { q: "AI が「一覧が空のときは 404 を返す」実装を出してきた。どう指摘する？",
      choices: ["コレクションは存在するので 200 と空の一覧にすべき", "404 で正しい", "500 にすべき", "204 にすべき"],
      explain: "典型的な誤り。空っぽの箱は「箱が無い」とは違う。", see: "s5" }
  ]
});
