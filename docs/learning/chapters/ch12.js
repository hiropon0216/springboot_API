// 第 12 章 トランザクション（書き方は AUTHORING.md）
Calc.register({
  no: 12,
  goal: [
    "トランザクション（全部成功か、全部取り消し）とは何かを例で説明できる",
    "トランザクションの境界を Service に置く理由を説明できる",
    "「いつ SQL が飛ぶか」（ダーティチェックと flush）の大筋が分かる",
    "例外で取り消される仕組みと、open-in-view を切る意味が分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "トランザクション：全部成功か、全部取り消し",
      body: `
${Fig.compare(
  { t: "✅ 全部成功", tone: "ok", html: Fig.flow([
    { t: "A の口座から 1 万円引く", tone: "ok" }, { t: "B の口座に 1 万円足す", tone: "ok" }, { t: "確定（コミット）", tone: "accent" }
  ], ["", ""], { dir: "v" }) },
  { t: "↩️ 途中で失敗", tone: "err", html: Fig.flow([
    { t: "A の口座から 1 万円引く", tone: "ok" }, { t: "💥 B への入金で障害", tone: "err" }, { t: "取り消し（ロールバック）<br>A の 1 万円も戻る", tone: "warn" }
  ], ["", ""], { dir: "v" }) },
  "「半分だけ終わった」状態を DB に残さない。これがトランザクション"
)}
<p>このアプリでは「計算して、保存する」「探して、書き換えて、保存する」が 1 つのまとまり。
<code>@Transactional</code> を付けたメソッドの中の DB 操作が、1 つのトランザクションになる。</p>`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "トランザクション = 「全部成功か、全部取り消し」の単位", "Service の javadoc の説明")
      ],
      checks: [
        { q: "CalculationService の javadoc で、トランザクションの境界を Service に置く理由として挙げられている 2 つの「困ること」は？",
          a: "Controller に置くと HTTP の都合が混ざる。Repository に置くと 1 SQL ごとにコミットされてしまい「まとめて成功/失敗」が表現できない。" }
      ]
    },
    {
      id: "s2",
      title: "境界は Service に置く",
      body: `
${Fig.matrix("@Transactional を置く場所", ["起きること", "判定"], [
  { h: "Controller", c: ["HTTP の都合（応答の組み立て中も DB を握る）と混ざる", { v: "✗", tone: "err" }] },
  { h: "Service", c: ["1 つの業務（ユースケース）が 1 つのトランザクションになる", { v: "✓", tone: "ok" }] },
  { h: "Repository", c: ["SQL 1 本ごとにコミット。複数の操作をまとめて取り消せない", { v: "✗", tone: "err" }] }
], "CLAUDE.md 不変条件 #5：トランザクション境界は Service")}
${Fig.flow([
  { ic: "🚪", t: "Controller", s: "トランザクションの外", tone: "dim" },
  { ic: "🔒", t: "Service のメソッド", s: "ここで開始 → 終了時にコミット<br>（例外ならロールバック）", tone: "accent" },
  { ic: "🗄️", t: "Repository", s: "Service のトランザクションに参加", tone: "lec" }
], ["呼ぶ", "呼ぶ"])}`,
      refs: [
        code("CLAUDE.md", "**トランザクション境界は Service**", "不変条件 #5"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "@Transactional(readOnly = true)", "クラス全体の既定")
      ],
      checks: [
        { q: "CLAUDE.md の不変条件 #5 は、@Transactional をクラスとメソッドにどう付けると言っている？",
          a: "クラスに @Transactional(readOnly = true)、書き込みメソッドに @Transactional。Controller にも Repository にも置かない。" }
      ]
    },
    {
      id: "s3",
      title: "既定は読み取り専用、書くところだけ明示",
      body: `
${Fig.code([
  { c: "@Service" },
  { c: "@Transactional(readOnly = true)", tag: "既定：読むだけ", tone: "lec" },
  { c: "public class CalculationService {" },
  { c: "  public Page<…> findAll(…) { … }", tag: "読み取り専用のまま", tone: "lec" },
  { c: "  public CalculationResponse findById(Long id) { … }", tag: "読み取り専用のまま", tone: "lec" },
  { c: "  @Transactional", tag: "書き込みで上書き", tone: "warn" },
  { c: "  public CalculationResponse create(…) { … }" },
  { c: "  @Transactional  public … replace(…) / updateMemo(…) / delete(…)", tag: "書き込み", tone: "warn" },
  { c: "}" }
], "付け忘れても「読み取り専用」になるので、うっかり書き込むメソッドは目立つ")}
${Fig.cards([
  { ic: "⚡", t: "無駄な確認を省く", d: "readOnly = true なら、Hibernate は「変更されたか」の確認（ダーティチェック）をしなくてよい", tone: "ok" },
  { ic: "📣", t: "意図が読める", d: "@Transactional が付いたメソッド ＝ DB に書く操作、と一目で分かる", tone: "accent" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "public CalculationResponse create(CalculationRequest req)", "書き込むメソッド（直前に @Transactional）")
      ],
      checks: [
        { q: "CalculationService で @Transactional（readOnly なし）が付いているメソッドをすべて挙げよう。",
          a: "create・replace・updateMemo・delete の 4 つ。findAll と findById はクラスの既定（読み取り専用）のまま。" }
      ]
    },
    {
      id: "s4",
      title: "いつ SQL が飛ぶか：ダーティチェックと flush",
      body: `
<p>トランザクションの中で取得したエンティティは、Hibernate が<b>見張っている</b>。フィールドを書き換えるだけで、あとで UPDATE が発行される。</p>
${Fig.timeline([
  { t: "トランザクション開始", d: "replace（PUT）が呼ばれる", tone: "accent" },
  { t: "SELECT", d: "findById で 1 件取得。以後 Hibernate が見張る", tone: "lec" },
  { t: "フィールドを書き換える", d: "replaceExpression / changeMemo。まだ SQL は飛ばない", tone: "dim" },
  { t: "flush（saveAndFlush）", d: "変更を検知 → @PreUpdate（updatedAt を更新）→ UPDATE を発行", tone: "warn" },
  { t: "コミット", d: "メソッドを抜けると確定", tone: "ok" }
])}
${Fig.compare(
  { t: "🐛 Sprint 6 で踏んだ不具合", tone: "err", html: "flush する前に DTO を作ると、@PreUpdate がまだ走っていない → <b>返した updatedAt が古い</b>" },
  { t: "✅ 直し方", tone: "ok", html: "<code>saveAndFlush</code> で「今すぐ UPDATE」させてから DTO に変換する。save のためではなく、<b>時刻を確定させるため</b>" },
  "「いつ SQL が飛ぶか」を意識しないと、返した JSON と DB の中身がずれる"
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "saveAndFlush で「今すぐ UPDATE を発行」させる", "flush してから返す理由（コメント）"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "return CalculationMapper.toResponse(repository.saveAndFlush(entity));", "flush してから DTO にする")
      ],
      checks: [
        { q: "replace の javadoc で、ダーティチェックの利点と危険はそれぞれ何と書かれている？",
          a: "利点: save() の呼び忘れで困らない。危険: 「更新したつもりが無いのに UPDATE される」事故も起きうる。" }
      ]
    },
    {
      id: "s5",
      title: "例外が起きたら取り消される",
      body: `
${Fig.stepper({
  nodes: [
    { id: "tx", t: "🔒 トランザクション開始" },
    { id: "sel", t: "🔎 SELECT（1 件取得）" },
    { id: "calc", t: "🧮 新しい式を計算" },
    { id: "mod", t: "✏️ エンティティを書き換え" },
    { id: "end", t: "✅ コミット / ↩️ ロールバック" }
  ],
  scenarios: [
    { name: "PUT 成功（7 × 6）", steps: [
      { node: "tx", t: "replace が呼ばれ、トランザクションが始まる" },
      { node: "sel", t: "id の記録を取得する", log: ["select … from calculations where id=?"] },
      { node: "calc", t: "7 × 6 = 42 を計算する", log: ["[3/5 業務] 再計算する: 7 MULTIPLY 6"] },
      { node: "mod", t: "式・結果・memo を書き換え、flush で UPDATE", log: ["[4/5 保存] UPDATE する直前: id=1", "update calculations set … where id=?"] },
      { node: "end", t: "メソッドを抜けてコミット。DB に確定する" }
    ]},
    { name: "PUT 失敗（1 ÷ 0）", steps: [
      { node: "tx", t: "replace が呼ばれ、トランザクションが始まる" },
      { node: "sel", t: "id の記録を取得する", log: ["select … from calculations where id=?"] },
      { node: "calc", t: "0 で割ろうとして例外", stop: true, log: ["[3/5 業務] 0 除算 → 例外を投げる（番号はここで決めない）"],
        d: "計算は書き換えより前（replaceExpression の引数を作る段階）なので、エンティティはまだ元のまま。" },
      { node: "end", t: "例外でロールバック。DB は元のまま", stop: true, d: "RuntimeException が Service の外に出ると、Spring がトランザクションを取り消す。その後 422 が返る。" }
    ]}
  ]
})}
<div class="note"><b>座学の補足</b>　Spring が既定で取り消すのは<b>非検査例外（RuntimeException とその子孫）と Error</b>が出たとき。
検査例外（Exception を直接継承し、throws の宣言が必要なもの）は、既定では取り消さない（rollbackFor で指定すれば取り消せる）。
このリポジトリの例外（BusinessRuleException など）はすべて RuntimeException を継承しているので、確実に取り消される。</div>`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "public CalculationResponse replace(Long id, CalculationRequest req)", "PUT の処理"),
        code("src/main/java/com/example/calc/common/exception/BusinessRuleException.java", "extends RuntimeException", "RuntimeException を継承しているので取り消し対象")
      ],
      checks: [
        { q: "CalculationServiceTest に「全置換でも結果の桁あふれは 422 で元の式は変わらない」というテストがある。何を確かめている？",
          a: "例外が投げられても、エンティティの result が元の値（2）のままであること。計算を書き換えより前に行う順序になっていることを固定している。" }
      ]
    },
    {
      id: "s6",
      title: "open-in-view を切る：境界の外で DB を触らせない",
      body: `
${Fig.compare(
  { t: "open-in-view: true（Spring Boot の既定）", tone: "warn", html: "Controller や JSON の組み立て中も DB との接続を開いたまま。<br>・どこで SQL が飛ぶか分からない<br>・接続を長く握る" },
  { t: "open-in-view: false（このリポジトリ）", tone: "ok", html: "Service（トランザクション）を抜けたら閉じる。<br>境界の外で DB を触ると<b>すぐ例外</b>になり、設計ミスに気づける" }
)}`,
      refs: [
        code("src/main/resources/application.yml", "open-in-view: false", "境界の外で DB を触らせない設定")
      ],
      checks: [
        { q: "application.yml のコメントで、open-in-view を切る「代償」と「得るもの」はそれぞれ何？",
          a: "既定の true は遅延読み込みの例外が減るが、どこで SQL が飛ぶか分からず接続を長く握る。切ると、トランザクションの外で DB を触った時点で例外になり、境界の設計ミスにすぐ気づける。" }
      ]
    }
  ],
  observe: {
    intro: "<p>アプリを起動し、SQL のログ（show-sql）を見ながら試す。</p>",
    steps: [
      { do: "記録を 1 件作り、PUT で <code>{\"left\":1,\"operator\":\"DIVIDE\",\"right\":0}</code> を送る。",
        expect: "422。ログに select はあるが update は無い。直後に GET すると元の式のまま" },
      { do: "同じ記録に PATCH <code>{\"memo\":\"x\"}</code> を送ってから、もう一度 PATCH <code>{}</code> を送る。",
        expect: "1 回目は update が出る。2 回目は変更が無いので update が出ず、updatedAt も変わらない" },
      { do: "<code>./mvnw test -Dtest=CalculationServiceTest</code>", expect: "「全置換でも結果の桁あふれは 422 で元の式は変わらない」を含め全部成功" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "📍", t: "@Transactional の場所を見る", d: "Controller や Repository に付けていないか。読むだけのメソッドに書き込み用を付けていないか", tone: "warn" },
  { ic: "⏱️", t: "SQL のタイミングを疑う", d: "返した値と DB の値がずれるバグは、flush のタイミングが原因のことが多い。show-sql のログを AI に見せる", tone: "accent" },
  { ic: "🔓", t: "open-in-view を戻させない", d: "遅延読み込みの例外を消すために AI が true に戻す提案をすることがある。境界の設計を直すのが筋", tone: "err" }
])}`,
  questions: [
    { q: "トランザクションの説明として正しいものは？",
      choices: ["複数の DB 操作を「全部成功か、全部取り消し」にまとめる単位", "HTTP のリクエスト 1 回のこと", "DB への接続そのもの", "テストの単位"],
      explain: "半分だけ終わった状態を DB に残さない。", see: "s1" },
    { q: "トランザクションの境界を Service に置く理由は？",
      choices: ["1 つの業務（ユースケース）を 1 つのまとまりとして成功・取り消しできるから", "Service が一番速いから", "Controller では @Transactional が使えないから", "Spring の決まりだから"],
      explain: "Controller だと HTTP の都合が混ざり、Repository だと SQL ごとにコミットされる。", see: "s2" },
    { q: "@Transactional を Repository に付けた場合の問題は？",
      choices: ["SQL 1 本ごとにコミットされ、複数の操作をまとめて取り消せない", "SQL が発行されない", "コンパイルエラーになる", "問題は無い"],
      explain: "「まとめて成功/失敗」が表現できない。", see: "s2" },
    { q: "CalculationService のクラスに @Transactional(readOnly = true) を付けている意図は？",
      choices: ["既定を読み取り専用にし、書き込むメソッドだけ @Transactional で明示するため", "全部のメソッドを書き込み禁止にするため", "速度を上げるためだけ", "テストのため"],
      explain: "書き込むメソッドが目立ち、付け忘れても読み取り専用になる。", see: "s3" },
    { q: "readOnly = true の効果として正しいものは？",
      choices: ["Hibernate が「変更されたか」の確認（ダーティチェック）を省ける", "SELECT が禁止される", "DB が読み取り専用になる", "例外が起きなくなる"],
      explain: "最適化であり、意図の表明でもある。", see: "s3" },
    { q: "トランザクションの中で取得したエンティティのフィールドを書き換えた。save を呼ばなかったら？",
      choices: ["flush のタイミングで変更が検知され、UPDATE が発行される", "何も保存されない", "例外になる", "INSERT される"],
      explain: "ダーティチェック。save の呼び忘れで困らない代わりに、意図しない UPDATE の危険もある。", see: "s4" },
    { q: "replace や updateMemo で saveAndFlush を呼んでいる主な理由は？",
      choices: ["今すぐ UPDATE させて @PreUpdate を走らせ、新しい updatedAt を返す DTO に入れるため", "保存しないと消えるから", "速くするため", "テストのため"],
      explain: "flush 前に DTO を作ると updatedAt が古いまま返る（Sprint 6 の不具合）。", see: "s4" },
    { q: "Sprint 6 で「PATCH の応答の updatedAt が古い」不具合が起きた原因は？",
      choices: ["@PreUpdate はフラッシュ時に走るのに、その前に DTO を作っていたから", "時計がずれていたから", "DB が時刻を保存しなかったから", "Jackson のバグ"],
      explain: "「いつ SQL が飛ぶか」を意識しないと、返した JSON と DB がずれる。", see: "s4" },
    { q: "PUT で 0 除算の例外が起きたとき、DB の記録はどうなる？",
      choices: ["元のまま（トランザクションが取り消され、書き換えも起きていない）", "0 が保存される", "削除される", "半分だけ書き換わる"],
      explain: "計算は書き換えより前。さらに例外でロールバックされる。", see: "s5" },
    { q: "Spring が既定でトランザクションを取り消すのは、どんな例外が出たとき？",
      choices: ["非検査例外（RuntimeException とその子孫）と Error", "すべての例外（検査例外も含む）", "Error だけ", "取り消さない"],
      explain: "検査例外は既定では取り消さない（rollbackFor で指定できる）。このリポジトリの例外は RuntimeException を継承しているので確実に取り消される。", see: "s5" },
    { q: "replace で、新しい式の計算をエンティティの書き換えより前に行っている利点は？",
      choices: ["計算で例外が起きても、エンティティが中途半端に書き換わらない", "速くなる", "SQL が減る", "テストが不要になる"],
      explain: "テスト「全置換でも結果の桁あふれは 422 で元の式は変わらない」で固定している。", see: "s5" },
    { q: "open-in-view: false にすると何が起きる？",
      choices: ["Service（トランザクション）を抜けたら DB のセッションが閉じ、外で DB を触ると例外になる", "DB に接続できなくなる", "SQL が表示されなくなる", "トランザクションが使えなくなる"],
      explain: "境界の設計ミスにすぐ気づける。", see: "s6" },
    { q: "open-in-view: true（既定）の問題点として挙げられているのは？",
      choices: ["どこで SQL が飛ぶか分からず、DB との接続を長く握る", "SQL が速すぎる", "データが保存されない", "HTTP が遅くなる"],
      explain: "便利だが、境界があいまいになる代償が大きい。", see: "s6" },
    { q: "PATCH {} を送ったとき UPDATE が発行されないのは、この章のどの仕組みによる？",
      choices: ["ダーティチェック（変更が無ければ UPDATE しない）", "readOnly = true", "open-in-view", "ロールバック"],
      explain: "flush しても、変更が無ければ UPDATE は作られない。", see: "s4" },
    { q: "AI が「遅延読み込みの例外が出たので open-in-view: true に戻しましょう」と提案した。どう判断する？",
      choices: ["境界の外で DB を触っている設計を直すのが先。true に戻すのは問題を隠すだけ", "すぐ受け入れる", "トランザクションを全部外す", "DB を変える"],
      explain: "例外は設計ミスを知らせる合図。", see: "s6" },
    { q: "AI が Controller のメソッドに @Transactional を付けた。どの不変条件に反する？",
      choices: ["#5 トランザクション境界は Service", "#2 package-by-feature", "#3 内部表現を公開しない", "#4 ProblemDetail"],
      explain: "Controller にも Repository にも置かない。", see: "s2" }
  ]
});
