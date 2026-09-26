// 第 6 章 エラー設計：ProblemDetail（書き方は AUTHORING.md）
Calc.register({
  no: 6,
  goal: [
    "400 / 404 / 415 / 422 / 500 を「誰の、どんな問題か」で言い分けられる",
    "エラー応答の形を ProblemDetail（RFC 9457）に統一する価値を説明できる",
    "「例外を投げる場所」と「ステータスを決める場所」を分ける設計を説明できる",
    "500 のときに内部情報を出してはいけない理由が分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "エラーの線引き：誰の、どんな問題か",
      body: `
${Fig.flow([
  { ic: "📝", t: "送り方が間違っている", s: "400 Bad Request<br>項目が無い・型が違う・壊れた JSON", tone: "warn" },
  { ic: "📭", t: "宛先が無い", s: "404 Not Found<br>その id の記録が無い", tone: "warn" },
  { ic: "🧮", t: "正しいが実行できない", s: "422 Unprocessable Content<br>0 で割る・結果が大きすぎる", tone: "warn" },
  { ic: "🔥", t: "サーバーのバグ", s: "500 Internal Server Error<br>想定していない例外", tone: "err" }
], ["", "", ""], { dir: "v", caption: "上の 3 つはクライアントが直す（4xx）。一番下はサーバーが直す（5xx）" })}
${Fig.matrix("送ったもの", ["形", "宛先", "実行", "返事"], [
  { h: '{"left":2,"right":3}（operator 無し）', c: [{ v: "✗", tone: "err" }, "—", "—", { v: "400", tone: "warn" }] },
  { h: "GET /calculations/999999", c: [{ v: "✓", tone: "ok" }, { v: "✗", tone: "err" }, "—", { v: "404", tone: "warn" }] },
  { h: '{"left":1,"operator":"DIVIDE","right":0}', c: [{ v: "✓", tone: "ok" }, { v: "✓", tone: "ok" }, { v: "✗", tone: "err" }, { v: "422", tone: "warn" }] },
  { h: "PATCH に text/plain", c: [{ v: "✗", tone: "err" }, "—", "—", { v: "415", tone: "warn" }] }
], "「形 → 宛先 → 実行」の順に確かめ、最初に引っかかったところで番号が決まる")}`,
      refs: [
        code("docs/spec.md", "## 4. エラー", "契約書のエラーの表"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "送り方が間違っている = 400", "線引きの一文（コメント）")
      ],
      checks: [
        { q: "spec.md §4 の表で、415 が返るのはどんなとき？",
          a: "PATCH の Content-Type が JSON / Merge Patch でないとき（text/plain など）。「形」の問題なので 4xx。" }
      ]
    },
    {
      id: "s2",
      title: "ProblemDetail：エラーの形を 1 つにそろえる",
      body: `
<p>エラーのたびに JSON の形が違うと、クライアントは場合分けだらけになる。そこで<b>全部のエラーを同じ形</b>で返す。
その標準が <b>ProblemDetail</b>（RFC 9457。旧 RFC 7807）。</p>
${Fig.http("ProblemDetail の実物（0 で割ったとき）", [
  { k: "Content-Type", v: "application/problem+json", n: "「これはエラーの説明です」という専用の形式", tone: "dim" },
  { k: "type", v: "urn:problem-type:business-rule", n: "エラーの種類の識別子（機械が見て分岐する）", tone: "accent" },
  { k: "title", v: "計算できません", n: "種類の短い説明（人が読む）", tone: "ok" },
  { k: "status", v: "422", n: "ステータスコードと同じ値", tone: "warn" },
  { k: "detail", v: "0 で割ることはできません", n: "今回の具体的な説明", tone: "lec" },
  { k: "instance", v: "/api/v1/calculations", n: "どのリクエストで起きたか", tone: "dim" }
])}
${Fig.code([
  { c: "{" },
  { c: '  "status": 400, "title": "入力値が不正です",' },
  { c: '  "errors": { "operator": "null は許可されていません" }', tag: "拡張項目", tone: "warn" },
  { c: "}" }
], "入力チェック違反では、標準の項目に errors（項目ごとの理由）を足している。ProblemDetail は項目を足してよい")}`,
      refs: [
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "urn:problem-type:business-rule", "type の値（業務ルール違反）"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", 'pd.setProperty("errors", errors);', "errors を足している行")
      ],
      checks: [
        { q: "GlobalExceptionHandler で type を決めている定数は何種類ある？",
          a: "2 種類。urn:problem-type:business-rule（422）と urn:problem-type:not-found（404）。ほかのエラーは type を省略（既定の about:blank）している。" }
      ]
    },
    {
      id: "s3",
      title: "投げる場所と、番号を決める場所を分ける",
      body: `
${Fig.flow([
  { ic: "🧮", t: "Service", s: "throw new BusinessRuleException(\"0 で割ることは…\")", tone: "accent" },
  { ic: "🛎️", t: "GlobalExceptionHandler", s: "@ExceptionHandler で受け止め<br>422 の ProblemDetail を作る", tone: "err" },
  { ic: "📮", t: "クライアント", s: "422 ＋ application/problem+json", tone: "dim" }
], ["例外を投げる（番号は知らない）", "返す"])}
${Fig.pairs("投げる例外（common/exception）", "決まるステータス（GlobalExceptionHandler）", [
  { l: "BusinessRuleException", lnote: "0 除算・結果が大きすぎる", r: "422 ＋ type business-rule", tone: "warn" },
  { l: "ResourceNotFoundException", lnote: "id が見つからない", r: "404 ＋ type not-found", tone: "warn" },
  { l: "Spring 標準の例外", lnote: "壊れた JSON・型違い・405・415…", r: "400 / 405 / 415（親クラスが処理）", tone: "dim" },
  { l: "その他すべて（想定外）", lnote: "バグ", r: "500（固定の文言）", tone: "err" }
], "例外の種類とステータスが 1 対 1。Controller にも Service にも if (見つからない) return 404 は 1 行も無い", "→")}
${Fig.cards([
  { ic: "♻️", t: "Service を使い回せる", d: "Service は HTTP を知らないので、バッチなど Web 以外からも同じように使える", tone: "ok" },
  { ic: "🎯", t: "変更が 1 か所", d: "エラーの形を変えたくなったら GlobalExceptionHandler だけ直せばよい", tone: "accent" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/common/exception/BusinessRuleException.java", "public class BusinessRuleException extends RuntimeException", "業務ルール違反の例外"),
        code("src/main/java/com/example/calc/common/exception/ResourceNotFoundException.java", "public class ResourceNotFoundException extends RuntimeException", "見つからない例外"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "@ExceptionHandler(ResourceNotFoundException.class)", "見つからない → 404")
      ],
      checks: [
        { q: "例外クラスはどのパッケージに置かれている？ なぜ calculation ではない？",
          a: "common/exception。「見つからない」「業務ルール違反」は計算に限らず、機能をまたいで使う共通の概念だから（package-by-feature の例外。第 10 章）。" }
      ]
    },
    {
      id: "s4",
      title: "Spring 標準のエラーは「受け継いで」使う",
      body: `
${Fig.stack([
  { t: "GlobalExceptionHandler（自分たち）", d: "業務例外（422 / 404）、想定外（500）、入力チェックの errors を足す", tone: "accent" },
  { t: "ResponseEntityExceptionHandler（Spring）", d: "壊れた JSON・型違い → 400、メソッド違い → 405、Content-Type 違い → 415、未知の URL → 404。すべて ProblemDetail で返す", tone: "dim" }
], "extends で親クラスの処理を丸ごと受け継ぎ、足りないところだけ書く")}
${Fig.compare(
  { t: "400 その 1：型にできない", tone: "warn", html: "壊れた JSON / <code>\"operator\":\"PLUS\"</code><br>→ 親クラスが処理。<b>どの項目が悪いかは返せない</b>" },
  { t: "400 その 2：ルール違反", tone: "warn", html: "operator が無い / 桁数超過 / size=101<br>→ 自分たちが上書きし、<b>errors に項目ごとの理由</b>を入れる" },
  "同じ 400 でも止まる場所が違う（第 4 章の地図）。どちらも同じ ProblemDetail の形"
)}`,
      refs: [
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "extends ResponseEntityExceptionHandler", "Spring 標準のエラー処理を受け継ぐ"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "protected ResponseEntity<Object> handleMethodArgumentNotValid(", "入力チェック違反に errors を足す")
      ],
      checks: [
        { q: "?size=101（クエリの範囲外）と、ボディの operator 欠落は、それぞれ GlobalExceptionHandler のどのメソッドで処理される？",
          a: "size=101 は handleHandlerMethodValidationException（引数に直接付けた制約の違反）、operator 欠落は handleMethodArgumentNotValid（@Valid @RequestBody の違反）。入口は違うが、どちらも errors を足して形をそろえている。" }
      ]
    },
    {
      id: "s5",
      title: "500：想定外のエラーでも形を守り、中身を漏らさない",
      body: `
${Fig.compare(
  { t: "❌ 対策前（Sprint 7 で実際に見つかった）", tone: "err", html: `<pre>HTTP/1.1 500
Content-Type: application/json
{"timestamp":"…","status":500,
 "error":"Internal Server Error","path":"…"}</pre>500 だけ Spring Boot 既定の別の形。約束違反` },
  { t: "✅ 対策後", tone: "ok", html: `<pre>HTTP/1.1 500
Content-Type: application/problem+json
{"title":"サーバー内部エラー",
 "detail":"予期しないエラーが発生しました。…"}</pre>形は同じ。原因はサーバーのログにだけ出す` }
)}
${Fig.flow([
  { ic: "💥", t: "想定外の例外", s: "SQL エラー・バグ…", tone: "err" },
  { ic: "📜", t: "サーバーのログ", s: "スタックトレース付きで<br>原因を全部記録", tone: "dim" },
  { ic: "📮", t: "クライアント", s: "固定の文言だけ<br>（SQL やクラス名は出さない）", tone: "ok" }
], ["logger.error", "ProblemDetail"], { caption: "例外のメッセージには SQL・テーブル名・クラス名が入りうる。攻撃の手がかりになるので外に出さない（第 19 章）" })}`,
      refs: [
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "@ExceptionHandler(Exception.class)", "どれにも当てはまらない例外の最後の受け皿"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "予期しないエラーが発生しました", "利用者に返す固定の文言")
      ],
      checks: [
        { q: "@ExceptionHandler(Exception.class) はすべての例外を受けるように見える。壊れた JSON（400）までここに来ないのはなぜ？（コメントを読もう）",
          a: "親クラスの、より具体的な例外用のハンドラが先に選ばれるから。Exception.class は「どれにも当てはまらなかったとき」だけ使われる。" }
      ]
    }
  ],
  observe: {
    intro: "<p>アプリを起動し、<code>-i</code> 付きで Content-Type も見る。</p>",
    steps: [
      { do: `<pre>curl -i -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":1,"operator":"DIVIDE","right":0}'</pre>`,
        expect: "422、Content-Type: application/problem+json、type が urn:problem-type:business-rule" },
      { do: "<code>curl -i http://localhost:8080/api/v1/calculations/999999</code>", expect: "404、type が urn:problem-type:not-found、instance にパス" },
      { do: `<pre>curl -i -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":2,"right":3}'</pre>`,
        expect: "400、title が「入力値が不正です」、errors.operator がある" },
      { do: "<code>curl -i http://localhost:8080/api/v1/nope</code>（存在しない URL）", expect: "404。これも ProblemDetail の形（親クラスが処理）" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🚫", t: "Controller でステータスを組み立てていないか", d: "AI は if (見つからない) return ResponseEntity.notFound() を書きがち。例外を投げて Handler に任せる約束（CLAUDE.md 不変条件 #4）", tone: "err" },
  { ic: "🔐", t: "detail に e.getMessage() を入れていないか", d: "500 の detail に例外メッセージを入れると内部情報が漏れる", tone: "warn" },
  { ic: "🧭", t: "400 と 422 の線引き", d: "「形は正しいが実行できない」を 400 にしていないか。線引きを spec に書いて渡す", tone: "accent" }
])}`,
  questions: [
    { q: "JSON の形は正しく、必須項目もそろっているが、0 で割ろうとした。返すべきステータスは？",
      choices: ["422", "400", "404", "500"],
      explain: "送り方は正しいが実行できない → 422。形が間違っていれば 400。", see: "s1" },
    { q: "operator を書き忘れた JSON を送った。返すべきステータスは？",
      choices: ["400", "422", "404", "415"],
      explain: "送り方（形）が間違っている → 400。errors に operator が入る。", see: "s1" },
    { q: "5xx と 4xx の違いとして正しいものは？",
      choices: ["5xx はサーバーが直すべき問題、4xx はクライアントが頼み方を直すべき問題", "5xx は重大、4xx は軽微", "5xx は DB、4xx は Controller の問題", "違いは無い"],
      explain: "誰が直すかで分かれる。", see: "s1" },
    { q: "ProblemDetail でエラーの形を統一する最大の利点は？",
      choices: ["クライアントがエラーを 1 通りの形だけ解釈すればよくなる", "エラーが起きにくくなる", "レスポンスが速くなる", "ステータスコードが不要になる"],
      explain: "エラーのたびに形が違うと、クライアントは場合分けだらけになる。", see: "s2" },
    { q: "ProblemDetail の type の役割は？",
      choices: ["エラーの種類を表す識別子で、機械が分岐に使う", "HTTP メソッドを表す", "エラーの発生時刻", "サーバーのバージョン"],
      explain: "title は人が読む説明、type は機械が見る識別子。", see: "s2" },
    { q: "ProblemDetail のレスポンスの Content-Type は？",
      choices: ["application/problem+json", "application/json", "text/plain", "application/error"],
      explain: "エラーの説明であることを示す専用の形式。", see: "s2" },
    { q: "入力チェック違反のとき、このリポジトリが ProblemDetail に足している独自の項目は？",
      choices: ["errors（項目ごとの理由）", "stackTrace", "sql", "userId"],
      explain: "ProblemDetail は項目を足してよい。どの項目が悪いかをクライアントに伝える。", see: "s2" },
    { q: "Service が 0 除算に気づいたとき、ステータス 422 を決めているのはどこ？",
      choices: ["GlobalExceptionHandler", "Service 自身", "Controller", "CalculationRequest"],
      explain: "Service は例外を投げるだけ。番号は Handler が決める。", see: "s3" },
    { q: "「投げる場所」と「番号を決める場所」を分けることの利点として誤っているものは？",
      choices: ["例外が発生しなくなる", "Service を Web 以外からも使える", "エラーの形を変えるときの修正が 1 か所で済む", "Controller が HTTP の通訳に集中できる"],
      explain: "分けても例外は起きる。起きたときの扱いが整理されるだけ。", see: "s3" },
    { q: "例外クラス（BusinessRuleException など）が common/exception に置かれている理由は？",
      choices: ["機能をまたいで使う共通の概念だから", "Spring の決まりだから", "テストのため", "calculation に置くと動かないから"],
      explain: "package-by-feature では、機能をまたぐものだけ common に置く。", see: "s3" },
    { q: "壊れた JSON や 405・415 を、自分でハンドラを書かずに ProblemDetail にできているのはなぜ？",
      choices: ["ResponseEntityExceptionHandler を継承して、Spring 標準の処理を受け継いでいるから", "Jackson が自動で変換するから", "Tomcat が変換するから", "application.yml で設定しているから"],
      explain: "親クラスが標準の例外を ProblemDetail にしてくれる。足りない分だけ自分で書く。", see: "s4" },
    { q: "壊れた JSON の 400 では、どの項目が悪いかを返せない。なぜ？",
      choices: ["JSON を型にする前に失敗していて、項目という単位にまだなっていないから", "セキュリティのため隠しているから", "Spring のバグだから", "400 では詳細を返せない決まりだから"],
      explain: "型にできた後の入力チェック違反なら errors を返せる。止まる場所が違う。", see: "s4" },
    { q: "Sprint 7 の見直しで見つかった 500 の問題は何だった？",
      choices: ["500 だけ Spring Boot 既定の別の JSON の形で返り、ProblemDetail の約束が破れていた", "500 が 200 で返っていた", "500 のときアプリが停止した", "500 が発生しなかった"],
      explain: "想定外の例外の受け皿が無かった。Exception.class のハンドラを足して解決した。", see: "s5" },
    { q: "500 の ProblemDetail の detail に例外のメッセージをそのまま入れてはいけない理由は？",
      choices: ["SQL・テーブル名・クラス名など、攻撃の手がかりになる内部情報が漏れるから", "文字数が多すぎるから", "日本語にならないから", "ステータスが変わってしまうから"],
      explain: "原因はサーバーのログにだけ残し、利用者には固定の文言を返す。", see: "s5" },
    { q: "@ExceptionHandler(Exception.class) があるのに、405 がここで 500 にならないのはなぜ？",
      choices: ["より具体的な例外用のハンドラ（親クラス）が先に選ばれるから", "405 は例外ではないから", "Tomcat が先に返すから", "Exception.class は何も受けないから"],
      explain: "Spring は最も具体的に一致するハンドラを選ぶ。Exception.class は最後の受け皿。", see: "s5" },
    { q: "AI が Controller に「if (結果が null) return ResponseEntity.status(404).build();」を書いた。このリポジトリの約束に照らした指摘は？",
      choices: ["Controller でステータスを組み立てず、ResourceNotFoundException を投げて GlobalExceptionHandler に任せる", "404 ではなく 400 にする", "問題ない", "Service で 404 を返す"],
      explain: "CLAUDE.md の不変条件 #4。ステータスと JSON の組み立ては Handler の 1 か所に集める。", see: "s3" }
  ]
});
