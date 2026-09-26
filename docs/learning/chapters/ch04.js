// 第 4 章 1 リクエストの旅：全体の地図（書き方は AUTHORING.md）

// この章で何度も使う「地図の一部を光らせた図」。名前はほかの章とぶつからないよう ch04 を付ける。
function ch04Lane(active) {
  const all = [
    { k: "r", ic: "📨", t: "① 受信", s: "JSON → 型" },
    { k: "c", ic: "🚪", t: "② Controller", s: "通訳" },
    { k: "s", ic: "🧮", t: "③ Service", s: "計算" },
    { k: "p", ic: "🗄️", t: "④ Repository", s: "保存" },
    { k: "o", ic: "📤", t: "⑤ 応答", s: "型 → JSON" }
  ];
  return Fig.flow(all.map(n => ({ ic: n.ic, t: n.t, s: n.s, tone: n.k === active ? "accent" : undefined, active: n.k === active, faded: n.k !== active })),
    ["", "", "", ""], { compact: true });
}

const CH04_NODES = [
  { id: "cl", t: "🧑‍💻 クライアント" },
  { id: "r", t: "① 受信", s: "Spring：JSON → 型、@Valid" },
  { id: "c", t: "② Controller", s: "HTTP の通訳" },
  { id: "s", t: "③ Service", s: "計算・業務ルール" },
  { id: "p", t: "④ Repository → DB", s: "Hibernate が SQL を発行" },
  { id: "o", t: "⑤ 応答", s: "Mapper → JSON" },
  { id: "h", t: "⚠️ エラーの受付", s: "GlobalExceptionHandler" }
];

Calc.register({
  no: 4,
  goal: [
    "1 つのリクエストが、どの部品をどの順に通って返事になるかを、図なしで説明できる",
    "実行ログ [1/5]〜[5/5] を見て、今どの層にいるかが分かる",
    "失敗したリクエストが「どこで止まったか」を見分けられる（障害の切り分けの基本）"
  ],
  sections: [
    {
      id: "s1",
      title: "全体の地図：1 コマずつたどる",
      body: `
<p><code>POST /api/v1/calculations</code> に <code>{"left":2,"operator":"ADD","right":3}</code> を送ったときの旅を、
<b>「次へ」で 1 コマずつ</b>進めてみよう。黒い枠のログは、実際にアプリを動かしたときにターミナルに出るもの。</p>
${Fig.stepper({
  nodes: CH04_NODES,
  scenarios: [{
    name: "成功（2 + 3）",
    steps: [
      { node: "cl", t: "クライアントが注文票を送る",
        log: [`$ curl -X POST localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":2,"operator":"ADD","right":3}'`],
        d: "メソッド POST・URL・ヘッダ・ボディ（JSON）の 4 つの欄が埋まった注文票（第 1 章）。" },
      { node: "r", t: "① 受信：JSON が Java の型になる",
        log: ["[1/5 受信] 入力を DTO にできた: 2 ADD 3"],
        d: "Spring（Jackson）が JSON を CalculationRequest に詰め、@Valid で入力をチェックする。ここまで私たちのコードは動いていない。" },
      { node: "c", t: "② Controller：受け取って Service に渡す",
        log: ["[2/5 入口] 検証済みの入力を受け取った → Service に渡す（計算式はここに書かない）"],
        d: "Controller は通訳。計算はしない。" },
      { node: "s", t: "③ Service：計算してルールを確かめる",
        log: ["[3/5 業務] 計算する: 2 ADD 3", "[3/5 業務] 結果 = 5.0000000000"],
        d: "このアプリの本当の仕事。0 で割っていないか、結果が大きすぎないかもここで確かめる。" },
      { node: "p", t: "④ Repository → DB：保存する",
        log: ["[4/5 保存] INSERT する直前(id はまだ null): 2 ADD 3", "Hibernate: insert into calculations (…) values (…)", "[4/5 保存] INSERT 完了: id=1 result=5.0000000000"],
        d: "SQL は Hibernate が作る。番号（id）は DB が INSERT の瞬間に振るので、直前はまだ null。" },
      { node: "o", t: "⑤ 応答：DB の形を API の形に直して返す",
        log: ["[5/5 応答] 201 で返す: Location=http://localhost:8080/api/v1/calculations/1"],
        d: "Mapper がエンティティを CalculationResponse に変換し、Controller が 201 と Location を付ける。" },
      { node: "cl", t: "クライアントに伝票が届く",
        log: ["HTTP/1.1 201", "Location: http://localhost:8080/api/v1/calculations/1", `{"id":1,"left":2,"operator":"ADD","right":3,"result":5, …}`],
        d: "5.0000000000 ではなく 5 になっているのは、⑤ で Mapper が末尾のゼロを落としたから。" }
    ]
  }]
})}
<p>各層は<b>自分の仕事だけ</b>をして次に渡す。この分担が第 10 章「層と依存方向」の土台になる。
<code>[1/5 受信]</code> のようなログは、旅の地点を示すために入れてある学習用の仕掛け。</p>`,
      refs: [
        code("README.md", "学習用の実行ログ", "[1/5]〜[5/5] のログの説明")
      ],
      checks: [
        { q: "README の該当箇所を読み、このログは「本来の書き方」ではないと書かれている理由を確認しよう。",
          a: "学習用の一時的なもので、実務では System.out ではなく SLF4J などのロガーを使うから（ログの出し方を設定で制御できる）。第 24 章で扱う。" }
      ]
    },
    {
      id: "s2",
      title: "① 受信：JSON が Java の型になる",
      body: `
${ch04Lane("r")}
${Fig.flow([
  { ic: "📨", t: "JSON", s: '{"left":2,"operator":"ADD","right":3}', tone: "dim" },
  { ic: "📦", t: "CalculationRequest", s: "left=2 / operator=ADD / right=3", tone: "accent" },
  { ic: "🔎", t: "@Valid でチェック", s: "違反なら Controller は呼ばれず 400", tone: "warn" }
], ["Jackson が詰める", "ルールを確認"])}
${Fig.term(["[1/5 受信] 入力を DTO にできた: 2 ADD 3"], "このログが出たら「JSON を型にできた」という意味")}
<div class="note"><b>ポイント</b>　受信と入力チェックは、私たちの Controller より<b>手前</b>で起きる。だから Controller は「チェック済みの正しい入力」を前提に書ける。</div>`,
      refs: [
        code("src/main/java/com/example/calc/calculation/dto/CalculationRequest.java", "[1/5 受信] 入力を DTO にできた", "型に詰められた瞬間に出るログ")
      ],
      checks: [
        { q: "このログはどのクラスのどこに書かれている？ Controller の中？",
          a: "CalculationRequest（DTO）のコンストラクタの中。Controller ではない。Jackson が JSON から型を作る瞬間に呼ばれるので、「型にできた」ことが分かる。（本来 DTO にこういう処理は書かない。学習用。）" }
      ]
    },
    {
      id: "s3",
      title: "② 入口：Controller は通訳に徹する",
      body: `
${ch04Lane("c")}
${Fig.compare(
  { t: "✅ Controller がすること", tone: "ok", html: "<ul><li>行き：受け取った型を Service に渡す</li><li>帰り：結果にステータス・ヘッダを付けて返す</li></ul>" },
  { t: "❌ Controller がしないこと", tone: "err", html: "<ul><li>計算する</li><li>SQL を書く・DB を触る</li><li>業務ルールを判断する</li></ul>" },
  "「計算しない」「SQL を書かない」ことが Controller の品質の目安"
)}
${Fig.term(["[2/5 入口] 検証済みの入力を受け取った → Service に渡す（計算式はここに書かない）"])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "[2/5 入口] 検証済みの入力を受け取った", "Controller に入ったログ。直後に service.create を呼ぶ")
      ],
      checks: [
        { q: "create メソッドの中で、計算（足し算など）をしている行はある？ Service を呼んでいるのは何行目あたり？",
          a: "計算している行は無い。ログのすぐ後の service.create(request) で Service に丸投げしている。Controller は渡して、返事の形を整えるだけ。" }
      ]
    },
    {
      id: "s4",
      title: "③ 業務：Service が計算する",
      body: `
${ch04Lane("s")}
${Fig.flow([
  { ic: "➗", t: "計算する", s: "四則演算", tone: "accent" },
  { ic: "⚖️", t: "ルールを確かめる", s: "0 で割っていない？<br>結果が大きすぎない？", tone: "warn" },
  { ic: "💾", t: "保存を頼む", s: "Repository.save", tone: "ok" }
], ["", "OK なら"], { caption: "ルール違反なら例外を投げて止まる。何番で返すかは Service は知らない（第 6 章）" })}
${Fig.term(["[3/5 業務] 計算する: 2 ADD 3", "[3/5 業務] 結果 = 5.0000000000"])}
<p>Service は HTTP を<b>一切知らない</b>。ステータスコードも JSON も出てこない。</p>`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "[3/5 業務] 計算する:", "Service に入ったログ"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "[3/5 業務] 0 除算 → 例外を投げる", "0 で割ろうとしたら、ここで例外を投げる")
      ],
      checks: [
        { q: "0 除算のところで、Service は「422 を返す」と書いている？ 何をしている？",
          a: "書いていない。BusinessRuleException を投げるだけ。コメントにも「番号はここで決めない」とある。何番で返すかは GlobalExceptionHandler が決める。" }
      ]
    },
    {
      id: "s5",
      title: "④ 保存：Repository から DB へ",
      body: `
${ch04Lane("p")}
${Fig.flow([
  { ic: "🧾", t: "Calculation", s: "エンティティ<br>id = null", tone: "dim" },
  { ic: "🗄️", t: "Repository.save", s: "Hibernate が<br>INSERT 文を作る", tone: "lec" },
  { ic: "🐘", t: "PostgreSQL", s: "番号を振る<br>id = 1", tone: "accent" }
], ["渡す", "SQL を送る"], { caption: "SQL を 1 行も書いていないのに SQL が発行される。番号は DB が振ってエンティティに書き戻す" })}
${Fig.term(["[4/5 保存] INSERT する直前(id はまだ null): 2 ADD 3", "Hibernate: insert into calculations (…) values (…)", "[4/5 保存] INSERT 完了: id=1 result=5.0000000000"],
  "ログが 2 回出る。1 回目は保存の直前（@PrePersist）、2 回目は保存後。間に実際の SQL が出る（実際は複数行に整形されて表示される）")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/Calculation.java", "[4/5 保存] INSERT する直前", "保存の直前に呼ばれる（時刻を入れる）"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "[4/5 保存] INSERT 完了", "保存が終わり、id が決まった後"),
        code("src/main/resources/application.yml", "show-sql: true", "手元では発行された SQL を表示する設定")
      ],
      checks: [
        { q: "「INSERT する直前」のログのカッコ書きを見よう。そこでは id はどうなっている？ なぜ？",
          a: "「id はまだ null」。番号は DB が INSERT の瞬間に振るので（@GeneratedValue の IDENTITY）、保存前には決まっていない。" }
      ]
    },
    {
      id: "s6",
      title: "⑤ 応答：帰り道で形を整える",
      body: `
${ch04Lane("o")}
${Fig.flow([
  { ic: "🧾", t: "Calculation", s: "DB の形<br>result = 5.0000000000", tone: "dim" },
  { ic: "🔄", t: "CalculationResponse", s: "API の形<br>result = 5", tone: "accent" },
  { ic: "📤", t: "201 ＋ JSON", s: '"result": 5', tone: "ok" }
], ["Mapper が変換", "Controller ＋ Jackson"], { caption: "DB の形（エンティティ）をそのまま外に出さない。帰り道にも決まった順路がある（理由は第 11 章）" })}
${Fig.compare(
  { t: "❌ Mapper で整えないと", tone: "err", html: "作成直後: <code>\"result\": 5</code><br>あとで GET: <code>\"result\": 5.0000000000</code><br>同じものなのに見た目が変わる" },
  { t: "✅ Mapper で整えると", tone: "ok", html: "作成直後: <code>\"result\": 5</code><br>あとで GET: <code>\"result\": 5</code><br>DB の都合が API に漏れない" }
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationMapper.java", "static CalculationResponse toResponse(Calculation entity)", "エンティティ → レスポンスの変換"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "[5/5 応答] 201 で返す", "Controller が 201 を付けて返す")
      ],
      checks: [
        { q: "CalculationMapper の normalize の説明（コメント）を読もう。変換しないと、どんな困ったことが起きる？",
          a: "DB は小数 10 桁で持つので、5 を保存して読み戻すと 5.0000000000 になる。変換しないと、作成直後は 5、あとで GET すると 5.0000000000 と、同じものなのに見た目が変わってしまう。" }
      ]
    },
    {
      id: "s7",
      title: "失敗の旅：どこで止まったかを見分ける",
      body: `
<p>失敗したリクエストは地図の途中で止まり、<b>エラーの受付</b>に回される。<b>どこまでログが出たか</b>で、止まった場所が分かる。</p>
${Fig.matrix("送ったもの", ["① 受信", "② Ctrl", "③ Service", "④ 保存", "返事"], [
  { h: "壊れた JSON / operator が PLUS", c: [{ v: "✗", tone: "err" }, "—", "—", "—", { v: "400", tone: "warn" }] },
  { h: "operator が無い", c: [{ v: "✓→✗", tone: "err" }, "—", "—", "—", { v: "400", tone: "warn" }] },
  { h: "0 で割る", c: [{ v: "✓", tone: "ok" }, { v: "✓", tone: "ok" }, { v: "✗", tone: "err" }, "—", { v: "422", tone: "warn" }] },
  { h: "無い番号を GET", c: ["（ボディ無し）", { v: "✓", tone: "ok" }, { v: "✓", tone: "ok" }, { v: "✗", tone: "err" }, { v: "404", tone: "warn" }] }
], "✗ の地点で止まり、エラーの受付が返事を作る。同じ 400 でも「型にできない」と「型にはできたがルール違反」は止まる場所が違う")}
<p>シナリオを切り替えて、1 コマずつ確かめよう。</p>
${Fig.stepper({
  nodes: CH04_NODES,
  scenarios: [
    { name: "壊れた JSON", steps: [
      { node: "cl", t: "壊れた JSON を送る", log: [`$ curl -X POST … -d 'not json'`] },
      { node: "r", t: "① 受信：JSON として読めない", stop: true, log: ["（[1/5 受信] は出ない）"], d: "型にする前に失敗。どの項目が悪いかも分からない。" },
      { node: "h", t: "エラーの受付が 400 を作る", log: ["[5/5 応答] 400 で返す（入力を DTO にできなかった。内訳は出せない）"] },
      { node: "cl", t: "400 が返る", log: ["HTTP/1.1 400", `{"title":"Bad Request","detail":"Failed to read request", …}`] }
    ]},
    { name: "operator が無い", steps: [
      { node: "cl", t: "operator を書き忘れて送る", log: [`$ curl -X POST … -d '{"left":2,"right":3}'`] },
      { node: "r", t: "① 受信：型にはできた", log: ["[1/5 受信] 入力を DTO にできた: 2 null 3"], d: "operator は null のまま型になった。" },
      { node: "r", t: "① 受信：@Valid のチェックで止まる", stop: true, log: ["（[2/5 入口] は出ない）"], d: "@NotNull 違反。Controller は呼ばれない。" },
      { node: "h", t: "エラーの受付が 400（項目別の理由付き）を作る", log: ["[5/5 応答] 400 で返す（入力が不正）: {operator=null は許可されていません}"] },
      { node: "cl", t: "400 が返る", log: ["HTTP/1.1 400", `{"title":"入力値が不正です","errors":{"operator":"null は許可されていません"}, …}`] }
    ]},
    { name: "0 で割る", steps: [
      { node: "cl", t: "1 ÷ 0 を送る", log: [`$ curl -X POST … -d '{"left":1,"operator":"DIVIDE","right":0}'`] },
      { node: "r", t: "① 受信：形は正しい", log: ["[1/5 受信] 入力を DTO にできた: 1 DIVIDE 0"] },
      { node: "c", t: "② Controller：Service に渡す", log: ["[2/5 入口] 検証済みの入力を受け取った → Service に渡す（計算式はここに書かない）"] },
      { node: "s", t: "③ Service：業務ルール違反で例外", stop: true, log: ["[3/5 業務] 計算する: 1 DIVIDE 0", "[3/5 業務] 0 除算 → 例外を投げる（番号はここで決めない）"], d: "保存まで進まないので、DB にゴミが残らない。" },
      { node: "h", t: "エラーの受付が 422 を作る", log: ["[5/5 応答] 422 で返す（形は正しいが実行できない）: 0 で割ることはできません"] },
      { node: "cl", t: "422 が返る", log: ["HTTP/1.1 422", `{"title":"計算できません","type":"urn:problem-type:business-rule", …}`] }
    ]},
    { name: "無い番号を GET", steps: [
      { node: "cl", t: "999999 番を取りに行く", log: ["$ curl localhost:8080/api/v1/calculations/999999"], d: "GET にはボディが無いので、① 受信は通らない（異常ではない）。" },
      { node: "c", t: "② Controller：1 件要求", log: ["[2/5 入口] 1 件要求: id=999999"] },
      { node: "s", t: "③ Service：Repository に探させる", log: [] },
      { node: "p", t: "④ Repository：探したが無い", stop: true, log: ["[4/5 保存] SELECT したが見つからない: id=999999 → 例外を投げる"] },
      { node: "h", t: "エラーの受付が 404 を作る", log: ["[5/5 応答] 404 で返す（その id の履歴が無い）: 計算履歴が見つかりません: id=999999"] },
      { node: "cl", t: "404 が返る", log: ["HTTP/1.1 404", `{"title":"見つかりません","type":"urn:problem-type:not-found", …}`] }
    ]}
  ]
})}
<p><b>「どの層で止まったか」を言えることが、障害の切り分けの第一歩</b>。</p>`,
      refs: [
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "[5/5 応答] 400 で返す（入力を DTO にできなかった", "型にできなかった 400"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "[5/5 応答] 400 で返す（入力が不正）", "型にはできたがルール違反の 400"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "[5/5 応答] 422 で返す", "業務ルール違反の 422")
      ],
      checks: [
        { q: "GET /api/v1/calculations/999 のように、ボディの無いリクエストでは [1/5] のログは出る？",
          a: "出ない。[1/5] は「ボディの JSON を型にした」ログなので、ボディの無い GET では最初のログが [2/5] になる。ログの意味を理解していれば、これを異常と誤解しない。" }
      ]
    }
  ],
  observe: {
    intro: `<p>アプリを <code>./mvnw spring-boot:run</code> で起動し、<b>起動したターミナルのログ</b>を見ながら、別のターミナル（または api-console.html）でリクエストを送る。
上のステッパーと同じログが出るか確かめる。</p>`,
    steps: [
      { do: `成功: <pre>curl -s -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":2,"operator":"ADD","right":3}'</pre>`,
        expect: "[1/5] → [2/5] → [3/5] 計算する → [3/5] 結果 → [4/5] INSERT する直前 → insert 文（SQL）→ [4/5] INSERT 完了 → [5/5] 201 で返す、の順に出る" },
      { do: `壊れた JSON: <pre>curl -s -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d 'not json'</pre>`,
        expect: "[1/5] が出ず、いきなり [5/5] 400 で返す（入力を DTO にできなかった…）" },
      { do: `operator なし: <pre>curl -s -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":2,"right":3}'</pre>`,
        expect: "[1/5] は出るが [2/5] は出ず、[5/5] 400 で返す（入力が不正）: {operator=…}" },
      { do: `0 で割る: <pre>curl -s -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":1,"operator":"DIVIDE","right":0}'</pre>`,
        expect: "[3/5] 0 除算 → 例外を投げる の後、[5/5] 422 で返す。[4/5] は出ない（保存されない）" },
      { do: `無い番号: <pre>curl -s http://localhost:8080/api/v1/calculations/999999</pre>`,
        expect: "[2/5] 1 件要求 → [4/5] SELECT したが見つからない → [5/5] 404 で返す" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🩺", t: "不具合を相談するとき", d: "「どのログまで出て、どこで止まったか」を添える。原因の層が絞れていると、AI の提案が的外れになりにくい", tone: "accent" },
  { ic: "🧭", t: "機能を足すとき", d: "地図のどの層に何が増えるかを先に言う。CLAUDE.md の「ゴールデンパス」は、この地図の順（entity → repository → dto → mapper → service → controller → テスト）", tone: "ok" },
  { ic: "🚧", t: "レビューするとき", d: "AI の変更が順路を外れていないか。Controller が計算していないか、Service が HTTP を知っていないか", tone: "warn" }
], "この地図は、AI と一緒に開発するときの共通言語になる")}`,
  questions: [
    { q: "POST で計算を頼んだとき、部品を通る順番として正しいものは？",
      choices: ["Controller → Service → Repository → DB", "Service → Controller → DB → Repository", "Repository → Service → Controller → DB", "DB → Repository → Controller → Service"],
      explain: "入口の Controller、業務の Service、DB の窓口の Repository の順。帰りは逆向きに戻る。", see: "s1" },
    { q: "[1/5 受信] のログが出たことは、何を意味する？",
      choices: ["ボディの JSON を Java の型（CalculationRequest）にできた", "計算が終わった", "DB に保存できた", "レスポンスを返した"],
      explain: "Jackson が JSON から型を作った瞬間に出るログ。", see: "s2" },
    { q: "入力チェック（@Valid）に違反したとき、Controller のメソッドは呼ばれる？",
      choices: ["呼ばれない。手前で 400 が返される", "呼ばれて、Controller の中で 400 を返す", "呼ばれて、Service が 400 を返す", "呼ばれて、DB がエラーを返す"],
      explain: "受信と入力チェックは Controller より手前。だから Controller はチェック済みの入力を前提に書ける。", see: "s2" },
    { q: "Controller の仕事として適切でないものは？",
      choices: ["四則演算をする", "受け取った入力を Service に渡す", "結果にステータスやヘッダを付けて返す", "HTTP の世界と中の世界を通訳する"],
      explain: "計算は Service の仕事。Controller が計算を始めたら層の分担が崩れている。", see: "s3" },
    { q: "Service が 0 除算に気づいたとき、することは？",
      choices: ["例外（BusinessRuleException）を投げる", "422 のレスポンスを組み立てて返す", "エラーの JSON を作る", "DB に 0 を保存する"],
      explain: "Service は HTTP を知らない。例外を投げるだけで、何番で返すかは GlobalExceptionHandler が決める。", see: "s4" },
    { q: "Service のコードに出てこないはずのものは？",
      choices: ["HTTP のステータスコード（404 や 422 など）", "四則演算", "業務ルールのチェック", "Repository の呼び出し"],
      explain: "Service は HTTP を一切知らない。これで Service を Web 以外（バッチなど）からも使える。", see: "s4" },
    { q: "保存のとき、SQL（INSERT 文）を組み立てているのは？",
      choices: ["Hibernate（Repository の裏側）", "Controller", "Service のコードに直接書いた SQL", "Jackson"],
      explain: "Repository の save を呼ぶと、Hibernate がエンティティを見て SQL を作る。私たちは SQL を書いていない。", see: "s5" },
    { q: "「INSERT する直前」のログで id がまだ null なのはなぜ？",
      choices: ["番号は DB が INSERT の瞬間に振るから", "バグで id が消えているから", "id は画面で決めるから", "id は保存しない項目だから"],
      explain: "@GeneratedValue（IDENTITY）で番号は DB が採番する。保存が終わって初めて決まる。", see: "s5" },
    { q: "帰り道で、エンティティ（Calculation）をそのまま JSON にせず、何に変換している？",
      choices: ["CalculationResponse（API 用の型）に、CalculationMapper で変換", "CalculationRequest に変換", "文字列に変換して手で JSON を組み立てる", "変換せずそのまま返している"],
      explain: "DB の形と API の形を分ける。変換は Mapper の 1 か所に集めている（第 11 章）。", see: "s6" },
    { q: "Mapper で数値の末尾ゼロを落としている理由は？",
      choices: ["DB から読み戻すと 5 が 5.0000000000 になり、同じものの見た目が変わってしまうから", "JSON では 0 を書けないから", "通信量を減らすため", "計算を速くするため"],
      explain: "DB は小数 10 桁で持つ。DB の都合が API に漏れないよう、帰り道で整える。", see: "s6" },
    { q: "壊れた JSON を送った。ログはどうなる？",
      choices: ["[1/5] が出ず、[5/5] の 400 が出る", "[1/5] と [2/5] が出てから 400", "[3/5] まで出てから 422", "ログは何も出ない"],
      explain: "JSON を型にできないので [1/5] より前で止まる。エラーの受付が 400 を返す。", see: "s7" },
    { q: "operator を書き忘れて送った。ログはどうなる？",
      choices: ["[1/5] は出るが [2/5] は出ず、400（errors 付き）", "[1/5] が出ずに 400", "[3/5] まで出て 422", "[5/5] まで出て 201"],
      explain: "JSON は型にできた（operator が null のまま）。その後の入力チェックで止まる。", see: "s7" },
    { q: "0 で割るリクエストで、[4/5] 保存 のログが出ないのはなぜ？",
      choices: ["Service の計算中に例外が投げられ、保存まで進まないから", "ログの出し忘れ", "0 は保存できない型だから", "Controller が保存を止めたから"],
      explain: "業務ルールの違反は [3/5] で止まる。保存されないので、DB にゴミが残らない。", see: "s7" },
    { q: "同じ 400 でも、「壊れた JSON」と「operator なし」の違いは？",
      choices: ["前者は型にできず、後者は型にはできたが入力チェックで止まった", "違いは無い", "前者はサーバーのバグ、後者はクライアントのミス", "前者は DB、後者は Service で止まった"],
      explain: "止まった場所が違う。errors（項目ごとの理由）を返せるのは型にできた後者だけ。", see: "s7" },
    { q: "GET /api/v1/calculations/5 では [1/5] のログが出ない。これは異常？",
      choices: ["異常ではない。[1/5] はボディの JSON を型にしたログで、GET にはボディが無いから", "異常。すべてのリクエストで [1/5] は出るはず", "異常。キャッシュから返したから", "異常。Controller が呼ばれていないから"],
      explain: "ログの意味を知っていれば誤解しない。GET の旅は [2/5] から始まる。", see: "s7" },
    { q: "AI に不具合を相談するとき、この章の知識を活かした伝え方は？",
      choices: ["どのログまで出て、どこで止まったかを添える", "「動かない」とだけ伝える", "ソースコード全部を貼り付ける", "エラーの色を伝える"],
      explain: "止まった層が分かれば、原因の候補が絞れる。AI の提案が的外れになりにくい。", see: "s7" },
    { q: "CLAUDE.md の「ゴールデンパス」（新しい機能を足すときにファイルを触る順）と、この章の地図の関係は？",
      choices: ["地図の層の順（entity → repository → dto → mapper → service → controller）に沿っている", "関係ない", "地図と逆に controller から書く決まり", "テストだけを先に書く決まり"],
      explain: "地図のどの層に何が増えるかを順に埋めていく手順になっている。AI に頼むときもこの順を伝える。", see: "s1" }
  ]
});
