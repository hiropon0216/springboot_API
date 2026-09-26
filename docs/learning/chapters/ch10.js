// 第 10 章 層と依存方向（書き方は AUTHORING.md）
Calc.register({
  no: 10,
  goal: [
    "3 層（Controller / Service / Repository）それぞれの責任を一言で言える",
    "依存の向きを一方向にする理由と、「逆流」「飛び越し」がなぜ困るかを説明できる",
    "package-by-feature（機能ごとにまとめる配置）の考え方が分かる",
    "ルールを人ではなく機械（ArchUnit）に守らせる意味を説明できる"
  ],
  sections: [
    {
      id: "s1",
      title: "3 つの層と、それぞれの責任",
      body: `
${Fig.stack([
  { t: "Controller", d: "HTTP の通訳。受け取って渡し、ステータスを付けて返す。計算も SQL もしない", tone: "ok" },
  { t: "Service", d: "業務ロジックとトランザクションの境界。HTTP を知らない", tone: "accent" },
  { t: "Repository", d: "DB の窓口。保存と取得だけ。業務の判断はしない", tone: "lec" },
  { t: "DB", d: "PostgreSQL（テストでは H2）", tone: "dim" }
], "上の層は下の層だけを知っている。下の層は上の層を知らない")}
${Fig.matrix("こんな変更をしたい", ["触る層"], [
  { h: "URL や成功のステータスを変える", c: [{ v: "Controller", tone: "ok" }] },
  { h: "業務ルール（0 除算、桁数）を変える", c: [{ v: "Service", tone: "accent" }] },
  { h: "検索条件を足す", c: [{ v: "Repository（＋ Service）", tone: "lec" }] },
  { h: "エラーの形を変える", c: [{ v: "GlobalExceptionHandler（common）", tone: "warn" }] },
  { h: "JSON の項目を変える", c: [{ v: "DTO ＋ Mapper（第 11 章）", tone: "dim" }] }
], "責任が分かれていると、変更の影響範囲が狭くなる。AI に頼むときも「どの層を触るか」を言える")}`,
      refs: [
        code("CLAUDE.md", "**層の依存方向は一方向**", "不変条件 #1（このプロジェクトの約束）")
      ],
      checks: [
        { q: "CLAUDE.md の不変条件 #1 で禁止されている 2 つのことは何？",
          a: "逆向きの参照（Service が Controller を見る）と、飛び越し（Controller が Repository を直接触る）。" }
      ]
    },
    {
      id: "s2",
      title: "依存は一方向：逆流と飛び越しを禁じる",
      body: `
${Fig.compare(
  { t: "✅ 一方向", tone: "ok", html: Fig.flow([
    { t: "Controller", tone: "ok" }, { t: "Service", tone: "accent" }, { t: "Repository", tone: "lec" }
  ], ["使う", "使う"], { dir: "v" }) },
  { t: "❌ 逆流と飛び越し", tone: "err", html: `
<ul>
<li><b>逆流</b>：Service が Controller を参照する<br>→ 業務ロジックが HTTP の都合に縛られ、Web 以外から使えなくなる</li>
<li><b>飛び越し</b>：Controller が Repository を直接使う<br>→ 「1 行で済むから」と SQL や業務の判断が Controller に漏れ、トランザクション境界も曖昧になる</li>
</ul>` },
  "依存の向きがそろっていると、下の層を変えても上の層への影響を見積もれる"
)}
${Fig.flow([
  { ic: "🔍", t: "コンストラクタを見る", s: "Controller(CalculationService service)", tone: "ok" },
  { ic: "✅", t: "Service だけに依存", s: "Repository は出てこない", tone: "ok" }
], [""], { caption: "依存はコンストラクタに全部並ぶ（第 2 章）。見れば向きが分かる" })}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "CalculationController(CalculationService service)", "Controller が知っているのは Service だけ"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "CalculationService(CalculationRepository repository)", "Service が知っているのは Repository だけ")
      ],
      checks: [
        { q: "CalculationService の import 文を見よう。web（org.springframework.web や http）に関するものはある？",
          a: "無い（Transactional や data.domain の Page などだけ）。Service が HTTP を知らないことが import からも分かる。" }
      ]
    },
    {
      id: "s3",
      title: "package-by-feature：機能ごとにまとめる",
      body: `
${Fig.compare(
  { t: "❌ 層ごとにまとめる（package-by-layer）", tone: "dim", html: "<pre>controller/  CalculationController\n            UserController\nservice/     CalculationService\n            UserService\nrepository/  …</pre>1 つの機能を直すのに、フォルダを行ったり来たりする" },
  { t: "✅ 機能ごとにまとめる（このリポジトリ）", tone: "ok", html: "<pre>calculation/  Controller・Service・\n              Repository・Entity・\n              Mapper・dto/\ncommon/       exception/（機能をまたぐ）\nconfig/       Cors・OpenApi（設定）</pre>1 つの機能が 1 つのフォルダに収まる" }
)}
${Fig.cards([
  { ic: "📁", t: "新しい機能を足すとき", d: "calculation/ を鏡写しにした新しいフォルダを作る（CLAUDE.md のゴールデンパス）", tone: "accent" },
  { ic: "🤝", t: "common に置くのは", d: "機能をまたいで使うものだけ（例外など）。安易に置くと何でも入れの箱になる", tone: "warn" },
  { ic: "🔄", t: "機能どうしの循環は禁止", d: "A が B を使い、B が A を使う関係は作らない（ArchUnit で検査）", tone: "err" }
])}`,
      refs: [
        code("CLAUDE.md", "**package-by-feature**", "不変条件 #2"),
        code("docs/adr/0004-package-by-feature-and-guardrails.md", "# ADR 0004", "この配置を選んだ理由")
      ],
      checks: [
        { q: "src/main/java/com/example/calc/calculation の中にあるファイルを数え、どの層のものか振り分けよう。",
          a: "Controller・Service・Repository・Calculation（Entity）・CalculationMapper・Operator（enum）と dto/ の 3 つ。1 つの機能の全層が 1 フォルダに収まっている。" }
      ]
    },
    {
      id: "s4",
      title: "ルールは機械に守らせる：ArchUnit",
      body: `
<p>約束を文書に書くだけでは、人も AI も忘れる。<b>ArchUnit</b> は「クラスどうしの依存」をテストとして書ける道具で、
<code>./mvnw verify</code> のたびに検査される。破れば<b>ビルドが赤くなる</b>。</p>
${Fig.matrix("ArchUnit のルール（6 つ）", ["守っているもの"], [
  { h: "controllers_are_not_used_by_services", c: [{ v: "逆流の禁止（Service → Controller）", tone: "ok" }] },
  { h: "controllers_do_not_depend_on_repositories", c: [{ v: "飛び越しの禁止（Controller → Repository）", tone: "ok" }] },
  { h: "repositories_are_interfaces", c: [{ v: "Repository は interface（実装は Spring が作る）", tone: "lec" }] },
  { h: "entities_are_not_exposed_by_controllers", c: [{ v: "エンティティを Controller に出さない（第 11 章）", tone: "lec" }] },
  { h: "feature_packages_are_free_of_cycles", c: [{ v: "機能どうしの循環の禁止", tone: "warn" }] },
  { h: "rest_controllers_have_controller_in_name", c: [{ v: "@RestController は名前に Controller を含む", tone: "dim" }] }
])}
${Fig.code([
  { c: "noClasses()" },
  { c: '    .that().haveSimpleNameEndingWith("Controller")', tag: "Controller という名前のクラスは", tone: "accent" },
  { c: "    .should().dependOnClassesThat()" },
  { c: '    .haveSimpleNameEndingWith("Repository")', tag: "Repository に依存してはいけない", tone: "err" }
], "ルールは英文のように読める。「命名の約束」があるから名前で判定できる")}`,
      refs: [
        code("src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java", "static final ArchRule controllers_do_not_depend_on_repositories", "飛び越しの禁止"),
        code("src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java", "static final ArchRule feature_packages_are_free_of_cycles", "機能どうしの循環の禁止")
      ],
      checks: [
        { q: "LayeredArchitectureTest の javadoc に、このテストが「誰に効くガードレール」と書かれている？",
          a: "「人にも AI にも効くガードレール」。人が忘れても、AI が近道を書いても、ビルドが赤くなって止まる。" }
      ]
    },
    {
      id: "s5",
      title: "層の価値は「差し替え」と「見積もり」",
      body: `
${Fig.cards([
  { ic: "🧪", t: "テストで差し替えられる", d: "層の境目で偽物に差し替えられる。Service は Repository を偽物に、Controller は Service を偽物にしてテストする（第 20 章）", tone: "ok" },
  { ic: "📏", t: "影響を見積もれる", d: "「DB の列を足す」なら Entity と Mapper、「URL を変える」なら Controller。触る範囲が先に分かる", tone: "accent" },
  { ic: "🤖", t: "AI に指示しやすい", d: "「Service にルールを足して、Controller は変えないで」と層で指示でき、差分もその範囲で見ればよい", tone: "lec" }
], "層は「きれいに見せるため」ではなく、変更とテストを安くするためにある")}`,
      refs: [
        code("CLAUDE.md", "## ゴールデンパス（お手本 feature）", "新しい機能を層の順に足す手順")
      ],
      checks: [
        { q: "CLAUDE.md のゴールデンパスで、テストを書く順番はどうなっている？",
          a: "単体（Service を new し Repository をモック）→ @DataJpaTest（Repository）→ @WebMvcTest（Controller、Service は @MockitoBean）。層ごとに差し替えてテストする。" }
      ]
    }
  ],
  observe: {
    intro: "<p>ルールを破ると本当に止まるか確かめる。<b>試したら必ず元に戻す</b>（<code>git checkout -- ファイル名</code>）。</p>",
    steps: [
      { do: "CalculationController に <code>private final CalculationRepository repository;</code> というフィールドを足し、コンストラクタで受け取るように書き換えて <code>./mvnw verify</code>。",
        expect: "LayeredArchitectureTest の controllers_do_not_depend_on_repositories が失敗し、どのクラスがどこで Repository を参照したかが表示される" },
      { do: "元に戻して <code>./mvnw verify</code>。", expect: "BUILD SUCCESS" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🧭", t: "層を指定して頼む", d: "「どの層に何を足すか」を言ってから頼む。言わないと、AI は一番近い場所（Controller）に書きがち", tone: "accent" },
  { ic: "🚧", t: "近道はビルドが止める", d: "AI が飛び越しを書いても ArchUnit が赤くする。その失敗を AI に見せれば、自分で直せる", tone: "ok" },
  { ic: "🧹", t: "common の肥大化を見る", d: "「共通っぽい」ものを何でも common に入れていないか。機能をまたぐものだけ", tone: "warn" }
])}`,
  questions: [
    { q: "Controller の責任として最も適切なものは？",
      choices: ["HTTP の通訳（受け取って渡し、ステータスを付けて返す）", "業務ルールの判断", "SQL の発行", "トランザクションの管理"],
      explain: "計算も SQL もしない。業務ルールは Service、SQL は Repository。", see: "s1" },
    { q: "「0 で割ったら 422」の業務ルールを変えたい。主に触る層は？",
      choices: ["Service（422 という番号は GlobalExceptionHandler）", "Controller", "Repository", "DB"],
      explain: "ルールの判断は Service。番号の対応は Handler に集まっている。", see: "s1" },
    { q: "依存の「逆流」の例は？",
      choices: ["Service が Controller を参照する", "Controller が Service を参照する", "Service が Repository を参照する", "Repository が DB を使う"],
      explain: "下の層が上の層を知ってしまうこと。", see: "s2" },
    { q: "「飛び越し」（Controller が Repository を直接使う）が困る理由として最も適切なものは？",
      choices: ["業務の判断や SQL が Controller に漏れ、トランザクション境界も曖昧になるから", "動作が遅くなるから", "コンパイルできないから", "Repository が使えなくなるから"],
      explain: "1 行で済む近道が積み重なると、業務ロジックが web 層に散らばる。", see: "s2" },
    { q: "Service が HTTP を知らないことの利点は？",
      choices: ["Web 以外（バッチなど）からも同じ業務ロジックを使える", "HTTP が速くなる", "テストが不要になる", "DB が不要になる"],
      explain: "HTTP の都合に縛られない。", see: "s2" },
    { q: "package-by-feature の説明として正しいものは？",
      choices: ["1 つの機能の Controller・Service・Repository などを 1 つのフォルダにまとめる", "層ごとに controller/ service/ にまとめる", "ファイルを 1 つのフォルダに全部入れる", "機能ごとに別のアプリにする"],
      explain: "1 つの機能を直すとき、1 フォルダの中で済む。", see: "s3" },
    { q: "新しいリソース（例: タグ）を足すとき、このリポジトリの約束では？",
      choices: ["calculation/ を鏡写しにした新しい機能フォルダを作る", "calculation/ の中に全部入れる", "common/ に入れる", "config/ に入れる"],
      explain: "CLAUDE.md のゴールデンパス。", see: "s3" },
    { q: "common/ に置いてよいものは？",
      choices: ["機能をまたいで使うもの（例外クラスなど）", "よく使いそうなもの全部", "設定ファイル", "テスト"],
      explain: "安易に置くと何でも入れの箱になる。設定は config/。", see: "s3" },
    { q: "ArchUnit の役割は？",
      choices: ["クラスどうしの依存のルールをテストとして書き、破ればビルドを失敗させる", "コードの書式を整える", "API の説明書を作る", "DB のテーブルを作る"],
      explain: "約束を機械に守らせる道具。", see: "s4" },
    { q: "ArchUnit のルールを「名前」（…Controller / …Repository）で書けるのはなぜ？",
      choices: ["命名の約束（XxxController など）が守られているから", "Java が名前で層を判断するから", "Spring が名前を強制するから", "ArchUnit が推測するから"],
      explain: "命名規約とガードレールは組になっている。rest_controllers_have_controller_in_name がその前提も守る。", see: "s4" },
    { q: "feature_packages_are_free_of_cycles が禁じているのは？",
      choices: ["機能パッケージどうしが互いに依存し合う（循環する）こと", "同じ名前のクラスを作ること", "パッケージを増やすこと", "テストを書くこと"],
      explain: "A → B → A の循環があると、片方だけを変えたり外したりできなくなる。", see: "s4" },
    { q: "ルールを文書に書くだけでなく ArchUnit で検査する最大の理由は？",
      choices: ["人も AI も忘れるが、テストなら破った瞬間にビルドが赤くなって気づけるから", "文書は読みにくいから", "テストの方が速いから", "ArchUnit が必須だから"],
      explain: "「人にも AI にも効くガードレール」。", see: "s4" },
    { q: "層を分けることの利点として誤っているものは？",
      choices: ["プログラムの実行速度が必ず上がる", "テストで層の境目を偽物に差し替えられる", "変更の影響範囲を見積もれる", "AI に層を指定して頼める"],
      explain: "層は変更とテストを安くするためのもの。速さのためではない。", see: "s5" },
    { q: "「DB に列を 1 つ足し、API のレスポンスにも出したい」。触る場所として正しい組み合わせは？",
      choices: ["エンティティ・Response の DTO・Mapper", "Controller だけ", "Service だけ", "GlobalExceptionHandler"],
      explain: "DB の形（Entity）と API の形（DTO）をつなぐのが Mapper（第 11 章）。", see: "s1" },
    { q: "AI に「計算に上限チェックを足して」とだけ頼んだら、Controller に if 文を足してきた。次からどう頼む？",
      choices: ["「Service にルールを足し、Controller は変えない。違反は BusinessRuleException で」と層を指定する", "もっと丁寧な言葉で頼む", "Controller で良いので受け入れる", "テストを消す"],
      explain: "層を言わないと、AI は一番近い場所に書きがち。", see: "s5" },
    { q: "AI が飛び越し（Controller → Repository）を書き、ArchUnit のテストが落ちた。効率のよい対応は？",
      choices: ["失敗メッセージを AI に見せて、Service 経由に直させる", "ArchUnit のルールを消す", "テストをスキップする", "Controller に Repository を置いてよいことにする"],
      explain: "ガードレールの失敗は、AI にとっても直し方の手がかりになる。", see: "s4" }
  ]
});
