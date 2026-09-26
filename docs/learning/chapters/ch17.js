// 第 17 章 リレーションと N+1・インデックス（座学。書き方は AUTHORING.md）
Calc.register({
  no: 17,
  goal: [
    "テーブル同士の関係（1 対多・多対多）と、JPA での表し方の大筋が分かる",
    "N+1 問題が「なぜ起き」「なぜ気づきにくいか」を説明できる",
    "N+1 の直し方（まとめて取る）を言える",
    "インデックスが検索を速くする仕組みと、その代償が分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "テーブル同士の関係",
      body: `
<p>このリポジトリはテーブル 1 つだけ。ここでは「<b>計算をフォルダに分けて整理したい</b>」という架空の拡張で考える。</p>
${Fig.flow([
  { ic: "📁", t: "folders", s: "id / name<br>「家計簿」「仕事」", tone: "lec" },
  { ic: "🧮", t: "calculations", s: "id / … / <b>folder_id</b><br>どのフォルダに入るか", tone: "accent" }
], [{ f: "1 つのフォルダに", b: "多くの計算" }], { caption: "1 対多：1 つのフォルダに、多くの計算が入る。「多」の側（calculations）が相手の id（外部キー）を持つ" })}
${Fig.matrix("関係", ["例", "表し方"], [
  { h: "1 対多", c: ["フォルダ 1 : 計算 多", "多の側に folder_id（外部キー）"] },
  { h: "多対多", c: ["計算 多 : タグ 多", "間に中間テーブル（calculation_tags）"] },
  { h: "1 対 1", c: ["計算 1 : 詳細メモ 1", "どちらかに相手の id"] }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/Calculation.java", "@Table(name =", "入れるならここ：Calculation に folder への参照を足す")
      ],
      checks: []
    },
    {
      id: "s2",
      title: "JPA での書き方と「遅延読み込み」",
      body: `
${Fig.code([
  { c: "@Entity class Calculation {" },
  { c: "  @ManyToOne(fetch = FetchType.LAZY)", tag: "多 → 1（遅延読み込み）", tone: "accent" },
  { c: "  private Folder folder;" },
  { c: "}" },
  { c: "" },
  { c: "@Entity class Folder {" },
  { c: '  @OneToMany(mappedBy = "folder")', tag: "1 → 多（逆向き）", tone: "lec" },
  { c: "  private List<Calculation> calculations;" },
  { c: "}" }
], "架空の例。Java ではフィールドで相手を持ち、DB では外部キーで持つ")}
${Fig.compare(
  { t: "🐢 遅延読み込み（LAZY）", tone: "accent", html: "計算を取ったとき、フォルダは<b>まだ読まない</b>。<code>calc.getFolder().getName()</code> と触った瞬間に SELECT が飛ぶ" },
  { t: "🐇 即時読み込み（EAGER）", tone: "warn", html: "計算を取るたびに、フォルダも必ず一緒に読む。使わない画面でも毎回読むので、基本は LAZY にして必要なときだけまとめて取る" },
  "「触った瞬間に SQL が飛ぶ」ことが、次の N+1 の原因になる"
)}`,
      refs: [],
      checks: []
    },
    {
      id: "s3",
      title: "N+1 問題：1 回のつもりが 101 回",
      body: `
<p>「計算の一覧を、フォルダ名付きで返す」だけのコード。見た目は何の問題も無いが、SQL を数えると…</p>
${Fig.stepper({
  nodes: [
    { id: "list", t: "① 一覧を取る", s: "SELECT 1 本" },
    { id: "loop", t: "② 1 件ずつフォルダ名を触る", s: "そのたびに SELECT" },
    { id: "total", t: "③ 合計", s: "1 + N 本" }
  ],
  scenarios: [{ name: "計算 100 件の一覧", steps: [
    { node: "list", t: "計算を 100 件取る", log: ["select * from calculations limit 100"], d: "ここまでは 1 本。" },
    { node: "loop", t: "1 件目のフォルダ名を触る", log: ["select * from folders where id=1"], d: "LAZY なので、触った瞬間にフォルダを読みに行く。" },
    { node: "loop", t: "2 件目、3 件目…", log: ["select * from folders where id=2", "select * from folders where id=1", "select * from folders where id=3", "…"], d: "件数と同じ回数だけ SELECT が飛ぶ。" },
    { node: "total", t: "合計 101 本", stop: true, log: ["1 本（一覧）＋ 100 本（1 件ごと）＝ 101 本"], d: "件数が 1 万件なら 10001 本。手元の少ないデータでは速いので気づきにくい。" }
  ]}]
})}
${Fig.cards([
  { ic: "🙈", t: "コードからは見えない", d: "ループの中の getFolder() が SQL を出しているとは、コードを読んでも分からない", tone: "warn" },
  { ic: "📈", t: "データが増えて初めて遅くなる", d: "開発中の 10 件では問題なく、本番の 1 万件で急に遅くなる", tone: "err" }
])}`,
      refs: [
        code("src/main/resources/application.yml", "show-sql: true", "SQL を表示する設定。N+1 に気づく第一歩")
      ],
      checks: [
        { q: "application.yml の show-sql のコメントに、SQL を表示する目的は何と書いてある？",
          a: "「1 件の API 呼び出しで SQL が何本飛んだか」を目で確認できることが、N+1 問題などに気づく第一歩。" }
      ]
    },
    {
      id: "s4",
      title: "直し方：必要なものを、まとめて取る",
      body: `
${Fig.compare(
  { t: "❌ N+1（101 本）", tone: "err", html: "<pre>select * from calculations limit 100\nselect * from folders where id=1\nselect * from folders where id=2\n… ×100</pre>" },
  { t: "✅ まとめて取る（1 本）", tone: "ok", html: "<pre>select c.*, f.name\n  from calculations c\n  join folders f on f.id = c.folder_id\n limit 100</pre>" }
)}
${Fig.matrix("直し方", ["書き方（例）", "向いている場面"], [
  { h: "JOIN FETCH", c: ["@Query(\"select c from Calculation c join fetch c.folder\")", "その画面で必ず相手も使う"] },
  { h: "@EntityGraph", c: ["@EntityGraph(attributePaths = \"folder\") を Repository のメソッドに", "派生クエリのまま、一緒に取る相手だけ指定"] },
  { h: "DTO で取る（射影）", c: ["必要な列だけを DTO に直接詰める select", "一覧など、読むだけで大量に返す"] }
], "どれも「どの画面で、何を一緒に使うか」を先に決めることが出発点")}
${Fig.cards([
  { ic: "🔒", t: "open-in-view: false が助けになる", d: "トランザクションの外で遅延読み込みをすると例外になるので、「どこで何を取るか」を Service で決めざるを得なくなる（第 12 章）", tone: "ok" }
])}`,
      refs: [
        code("src/main/resources/application.yml", "open-in-view: false", "境界の外での遅延読み込みを禁じる")
      ],
      checks: []
    },
    {
      id: "s5",
      title: "インデックス：本の索引",
      body: `
${Fig.compare(
  { t: "📖 インデックスが無い", tone: "err", html: "「割り算だけ」を探すのに、<b>全部の行を最初から最後まで</b>見る（全件走査）。行が増えるほど遅くなる" },
  { t: "🔖 インデックスがある", tone: "ok", html: "本の索引のように、operator の値ごとに行の場所を並べた表を別に持つ。<b>目的の行へすぐ飛べる</b>" }
)}
${Fig.code([
  { c: "-- このリポジトリの一覧の検索（第 7 章）" },
  { c: "select … from calculations" },
  { c: "  where operator = ?", tag: "絞り込み", tone: "accent" },
  { c: "  order by created_at desc, id desc", tag: "並び", tone: "lec" },
  { c: "  limit 20" },
  { c: "" },
  { c: "-- 入れるならこのインデックス（例）" },
  { c: "create index idx_calc_operator_created", tag: "絞り込み ＋ 並びの順", tone: "ok" },
  { c: "  on calculations (operator, created_at desc, id desc);" }
], "WHERE と ORDER BY の列の組み合わせに合わせて作る。Flyway の V ファイルで足すのが筋（第 16 章）")}
${Fig.cards([
  { ic: "✍️", t: "代償：書き込みが遅くなる", d: "行を足すたびに索引も更新する。何でも作ればよいわけではない", tone: "warn" },
  { ic: "🔬", t: "EXPLAIN で確かめる", d: "SQL の前に EXPLAIN（ANALYZE）を付けると、索引を使ったか・全件を見たかが分かる", tone: "accent" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationRepository.java", "Page<Calculation> findByOperator(Operator operator, Pageable pageable);", "インデックスの恩恵を受ける検索")
      ],
      checks: []
    }
  ],
  ai: `
${Fig.cards([
  { ic: "🔢", t: "SQL の本数を数えさせる", d: "一覧の API を AI に作らせたら、1 リクエストで何本の SQL が出るかをログで確認させる", tone: "accent" },
  { ic: "🚫", t: "EAGER で逃げさせない", d: "N+1 を直すために AI が EAGER を提案することがある。使わない画面でも毎回読むので、まとめて取る方法を選ばせる", tone: "warn" },
  { ic: "🔖", t: "インデックスは根拠とセットで", d: "「遅いのでインデックスを足しました」には、EXPLAIN の結果を添えさせる", tone: "lec" }
])}`,
  questions: [
    { q: "「1 つのフォルダに多くの計算が入る」関係で、外部キー（folder_id）を持つのはどちら？",
      choices: ["計算（多の側）", "フォルダ（1 の側）", "両方", "どちらも持たない"],
      explain: "多の側が相手の id を持つ。1 の側に「計算の id の一覧」を持つことはできない。", see: "s1" },
    { q: "多対多（計算とタグ）を DB で表す方法は？",
      choices: ["間に中間テーブル（calculation_tags）を置く", "両方に相手の id を 1 つずつ持つ", "1 つのテーブルにまとめる", "表せない"],
      explain: "どちらも多いので、組み合わせを行として持つ中間テーブルが要る。", see: "s1" },
    { q: "@ManyToOne(fetch = FetchType.LAZY) の意味は？",
      choices: ["相手（フォルダ）は、触った瞬間に初めて読みに行く", "相手を必ず一緒に読む", "相手を読まない", "相手を削除する"],
      explain: "遅延読み込み。触った瞬間に SELECT が飛ぶ。", see: "s2" },
    { q: "EAGER（即時読み込み）を基本にしない理由は？",
      choices: ["相手を使わない画面でも毎回読んでしまうから", "EAGER はエラーになるから", "LAZY の方が必ず SQL が少ないから", "JPA が禁止しているから"],
      explain: "基本は LAZY、必要な画面だけまとめて取る。", see: "s2" },
    { q: "N+1 問題の説明として正しいものは？",
      choices: ["一覧を 1 本の SQL で取った後、1 件ごとに関連を読むため、合計 1 + N 本の SQL が飛ぶ", "SQL が 1 本足りない", "N 件目でエラーになる", "インデックスが N 個必要になる"],
      explain: "100 件なら 101 本、1 万件なら 10001 本。", see: "s3" },
    { q: "N+1 問題が開発中に気づきにくい理由は？",
      choices: ["コードからは SQL が見えず、手元の少ないデータでは速く動くから", "エラーメッセージが英語だから", "テストで必ず失敗するから", "コンパイラが隠すから"],
      explain: "本番の大量データで初めて遅くなる。", see: "s3" },
    { q: "N+1 に気づくための第一歩として、このリポジトリで用意しているものは？",
      choices: ["show-sql で発行された SQL を表示する設定", "ArchUnit", "Spotless", "CORS の設定"],
      explain: "1 リクエストで何本の SQL が出たかを目で数えられる。", see: "s3" },
    { q: "N+1 の直し方として適切でないものは？",
      choices: ["関連を全部 EAGER にする", "JOIN FETCH でまとめて取る", "@EntityGraph で一緒に取る相手を指定する", "必要な列だけを DTO に詰めて取る"],
      explain: "EAGER は使わない画面でも読むため、別の無駄を生む。", see: "s4" },
    { q: "@EntityGraph の利点は？",
      choices: ["派生クエリのまま、一緒に取る相手だけを指定できる", "SQL を書かなくてよくなる", "インデックスを自動で作る", "トランザクションが不要になる"],
      explain: "JOIN FETCH の SQL を書かずに済む。", see: "s4" },
    { q: "open-in-view: false が N+1 対策の助けになる理由は？",
      choices: ["トランザクションの外で遅延読み込みをすると例外になるので、Service で何を取るかを決めざるを得なくなるから", "SQL を自動でまとめるから", "N+1 が起きなくなる設定だから", "インデックスを作るから"],
      explain: "Controller や JSON の変換中にこっそり SQL が飛ぶのを防ぐ。", see: "s4" },
    { q: "インデックスの役割は？",
      choices: ["本の索引のように、目的の行へすぐ飛べるようにする", "データを暗号化する", "データを圧縮する", "トランザクションを速くする"],
      explain: "無ければ全件を最初から見る。", see: "s5" },
    { q: "このリポジトリの一覧（where operator = ? order by created_at desc, id desc）に合うインデックスは？",
      choices: ["(operator, created_at desc, id desc) の組み合わせ", "memo だけ", "result だけ", "インデックスは使えない"],
      explain: "絞り込みの列と並びの列の組み合わせに合わせて作る。", see: "s5" },
    { q: "インデックスの代償は？",
      choices: ["行を書き込むたびに索引も更新するので、書き込みが遅くなり容量も使う", "読み込みが遅くなる", "データが消える", "代償は無い"],
      explain: "何でも作ればよいわけではない。", see: "s5" },
    { q: "インデックスが実際に使われたかを確かめる方法は？",
      choices: ["SQL の前に EXPLAIN（ANALYZE）を付けて実行計画を見る", "テストを実行する", "show-sql を見る", "アプリを再起動する"],
      explain: "全件走査かインデックスを使ったかが分かる。", see: "s5" },
    { q: "このリポジトリにインデックスを足すなら、どう入れるのが筋？",
      choices: ["Flyway のマイグレーション（V ファイル）で CREATE INDEX する", "エンティティにコメントを書く", "application.yml に書く", "手で DB に直接作る"],
      explain: "スキーマの変更は手順として残す（第 16 章）。", see: "s5" },
    { q: "AI が「N+1 を直すため関連を EAGER にしました」と言ってきた。どう返す？",
      choices: ["使わない画面でも読むので、その画面だけ JOIN FETCH や @EntityGraph でまとめて取るよう直させる", "受け入れる", "LAZY も EAGER も外させる", "インデックスを足させる"],
      explain: "EAGER は別の無駄を生む。", see: "s4" }
  ]
});
