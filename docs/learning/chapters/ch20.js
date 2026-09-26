// 第 20 章 テスト戦略（書き方は AUTHORING.md）
Calc.register({
  no: 20,
  goal: [
    "自動テストが「変更の安全網」であり、AI 駆動開発で特に効く理由を説明できる",
    "テストの 4 つの粒度（単体・Web スライス・DB スライス・全体）と、それぞれが守るもの・守らないものが分かる",
    "モック（偽物）をどこで使い、どこで使わないかが分かる",
    "H2 でテストする割り切りと、Testcontainers に移るべきときが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "テストは変更の安全網",
      body: `
${Fig.flow([
  { ic: "✏️", t: "コードを変える", s: "人でも AI でも" },
  { ic: "🧪", t: "./mvnw verify", s: "64 件のテスト＋検査を<br>数十秒で全部流す", tone: "accent" },
  { ic: "🟢", t: "緑なら先へ", s: "赤なら、壊したものと<br>場所が分かる", tone: "ok" }
], ["", ""], { caption: "テストは「今動く」ことより「変えても壊れていない」ことを確かめるためにある" })}
${Fig.cards([
  { ic: "🤖", t: "AI 駆動で特に効く", d: "AI は一度に広い範囲を変える。人が全部を読んで確かめるのは無理なので、機械に確かめさせる", tone: "accent" },
  { ic: "📜", t: "仕様の実例になる", d: "「0 除算は 422」「PATCH {} でメモは消えない」がテストとして残り、仕様を読み違えた変更を止める", tone: "lec" }
])}`,
      refs: [
        code("src/test/java/com/example/calc/calculation/CalculationServiceTest.java", "これがテストピラミッドの実践", "テストの役割分担の説明（javadoc）")
      ],
      checks: [
        { q: "CalculationServiceTest の javadoc で、3 つのテストクラスの役割はどう分けられている？",
          a: "計算が正しいか → CalculationServiceTest（速い・DB 不要）、DB に正しく入るか → CalculationRepositoryTest（@DataJpaTest）、HTTP として正しいか → CalculationControllerTest（@WebMvcTest）。" }
      ]
    },
    {
      id: "s2",
      title: "テストピラミッド：速いものを多く、重いものを少なく",
      body: `
${Fig.stack([
  { t: "全体（1 件）", d: "@SpringBootTest。アプリ全体が起動するか。遅い", tone: "err" },
  { t: "スライス（31 件）", d: "@WebMvcTest 25 件（HTTP の層だけ）＋ @DataJpaTest 6 件（DB の層だけ）", tone: "warn" },
  { t: "単体（23 件）", d: "Service を new して、Repository は偽物。Spring も DB も起動しない。一番速い", tone: "ok" },
  { t: "構造・教材の検査（9 件）", d: "ArchUnit 6 件（層のルール）＋ LearningLinksTest 3 件（教材のリンク）", tone: "lec" }
], "下の段ほど数が多く速い。上の段は少なく重い。合計 64 件")}
${Fig.matrix("テスト", ["起動するもの", "速さ", "件数"], [
  { h: "単体（CalculationServiceTest）", c: ["何も（new するだけ）", { v: "最速", tone: "ok" }, "23"] },
  { h: "@WebMvcTest（ControllerTest）", c: ["Controller・例外処理・JSON 変換・検証", { v: "速い", tone: "ok" }, "25"] },
  { h: "@DataJpaTest（RepositoryTest）", c: ["Repository・JPA・H2", { v: "速い", tone: "ok" }, "6"] },
  { h: "@SpringBootTest（ApplicationTests）", c: ["全部", { v: "遅い", tone: "warn" }, "1"] }
])}`,
      refs: [
        code("src/test/java/com/example/calc/CalcApiApplicationTests.java", "@SpringBootTest", "全体を起動する唯一のテスト")
      ],
      checks: [
        { q: "@SpringBootTest のテストが 1 件しか無いのに、それで十分なのはなぜ？",
          a: "全体の起動で確かめたいのは「部品が全部つながって起動するか」だけだから。個々の振る舞いは速いテストで細かく確かめている。" }
      ]
    },
    {
      id: "s3",
      title: "それぞれが守るもの・守らないもの",
      body: `
${Fig.matrix("守るもの ＼ テスト", ["単体", "@WebMvcTest", "@DataJpaTest", "@SpringBootTest", "ArchUnit"], [
  { h: "計算・業務ルールの正しさ", c: [{ v: "✓", tone: "ok" }, "—", "—", "—", "—"] },
  { h: "ステータス・JSON の形・エラーの形", c: ["—", { v: "✓", tone: "ok" }, "—", "—", "—"] },
  { h: "入力検証（@Valid）", c: ["—", { v: "✓", tone: "ok" }, "—", "—", "—"] },
  { h: "エンティティと DB の対応・派生クエリ", c: ["—", "—", { v: "✓", tone: "ok" }, "—", "—"] },
  { h: "部品のつながり（DI）", c: ["—", "—", "—", { v: "✓", tone: "ok" }, "—"] },
  { h: "層の依存ルール", c: ["—", "—", "—", "—", { v: "✓", tone: "ok" }] },
  { h: "本物の PostgreSQL での動き", c: ["—", "—", { v: "H2 なので ✗", tone: "err" }, { v: "H2 なので ✗", tone: "err" }, "—"] }
], "一番大事なのは最後の行のような「何を守っていないか」を知っていること")}`,
      refs: [
        code("src/test/java/com/example/calc/calculation/CalculationControllerTest.java", "@WebMvcTest(CalculationController.class)", "HTTP の層だけ"),
        code("src/test/java/com/example/calc/calculation/CalculationRepositoryTest.java", "@DataJpaTest", "DB の層だけ")
      ],
      checks: [
        { q: "Controller のテストで「0 除算は 422」を確かめるとき、Service は本当に 0 で割っている？",
          a: "割っていない。Service は偽物で、「BusinessRuleException を投げる」ように設定している（thenThrow）。Controller のテストが確かめるのは「その例外が 422 の ProblemDetail になるか」だけ。計算の正しさは Service のテストが確かめる。" }
      ]
    },
    {
      id: "s4",
      title: "モック：境目を偽物にする",
      body: `
${Fig.compare(
  { t: "🎭 モックにする", tone: "ok", html: "<ul><li>層の境目の相手（Service から見た Repository、Controller から見た Service）</li><li>外部 API（第 13 章）</li><li>遅い・不安定・お金がかかるもの</li></ul>" },
  { t: "🙅 モックにしない", tone: "err", html: "<ul><li>テストしたい本人（Service のテストで Service をモックしたら何も確かめていない）</li><li>単純な値（DTO・BigDecimal）</li><li>何でもかんでも（偽物の設定だらけのテストは、実装を写しただけになる）</li></ul>" }
)}
${Fig.code([
  { c: "assertThatThrownBy(() -> result(\"1\", Operator.DIVIDE, \"0\"))", tag: "0 で割ったら", tone: "accent" },
  { c: "    .isInstanceOf(BusinessRuleException.class);", tag: "例外になり", tone: "accent" },
  { c: "verify(repository, never()).save(any());", tag: "保存が呼ばれない", tone: "ok" }
], "モックは「呼ばれなかったこと」も確かめられる。0 除算で DB にゴミが残らないことを固定している")}`,
      refs: [
        code("src/test/java/com/example/calc/calculation/CalculationServiceTest.java", "mock(CalculationRepository.class)", "Repository を偽物にする"),
        code("src/test/java/com/example/calc/calculation/CalculationControllerTest.java", "@MockitoBean CalculationService service", "Service を偽物にする")
      ],
      checks: [
        { q: "CalculationServiceTest の stubSave() は何をしている？ なぜ必要？",
          a: "saveAndFlush が「渡されたものをそのまま返す」ように偽物を設定している。偽物は既定で null を返すので、設定しないと更新系のテストで null を DTO にしようとして失敗する。" }
      ]
    },
    {
      id: "s5",
      title: "H2 の割り切りと、Testcontainers",
      body: `
${Fig.compare(
  { t: "🧪 H2（今のやり方）", tone: "ok", html: "<ul><li>Docker なしで ./mvnw verify が通る</li><li>CI が速い</li><li><b>PostgreSQL と完全には同じでない</b>（方言・型・関数・ロック）</li></ul>" },
  { t: "🐳 Testcontainers（座学）", tone: "lec", html: "<ul><li>テストのたびに本物の PostgreSQL をコンテナで起動</li><li>本番と同じ DB で確かめられる</li><li>Docker が必要・少し遅い</li></ul>" },
  "DB 固有の SQL（ネイティブクエリ・jsonb・ウィンドウ関数…）を書き始めたら Testcontainers に移る"
)}`,
      refs: [
        code(".github/workflows/ci.yml", "DB 固有の SQL を書き始めたら Testcontainers を入れて", "移るタイミング（CI のコメント）"),
        code("src/test/resources/application-test.yml", "jdbc:h2:mem:calc-test", "テストは H2")
      ],
      checks: [
        { q: "このリポジトリの progress.md の「検証不能」に、H2 と関係する記録がある。どんなこと？",
          a: "Docker が起動しておらず、PostgreSQL ではなく H2 でアプリを起動して確認した（PostgreSQL では未確認）という記録。テストでも実機確認でも、H2 で確かめたことは PostgreSQL での保証にならない。" }
      ]
    },
    {
      id: "s6",
      title: "良いテストの見分け方",
      body: `
${Fig.cards([
  { ic: "🏷️", t: "名前が仕様を語る", d: "「部分更新でmemoを省略したらメモは変わらない」のように、何を保証するかが名前で分かる", tone: "accent" },
  { ic: "🎯", t: "振る舞いを確かめる", d: "「どのメソッドを何回呼んだか」より「結果がどうなったか」。実装を変えても壊れにくい", tone: "ok" },
  { ic: "💥", t: "壊したら落ちるか", d: "@Valid を外したら落ちる、が良いテスト。何を壊しても落ちないテストは何も守っていない（第 3 章の実験）", tone: "warn" },
  { ic: "🧱", t: "準備・実行・確認", d: "Arrange（用意）→ Act（実行）→ Assert（確認）の 3 段に分けて書く", tone: "lec" }
])}`,
      refs: [
        code("src/test/java/com/example/calc/calculation/CalculationServiceTest.java", "void 部分更新でmemoを省略したらメモは変わらない()", "名前が仕様になっているテスト")
      ],
      checks: [
        { q: "「結果の整数部がちょうど28桁なら保存できる」というテストは何のためにある？（境界値）",
          a: "上限ちょうど（28 桁）は通り、1 つ超えたら 422 になる、という境目を固定するため。境目は間違いやすいので、両側をテストする。" }
      ]
    }
  ],
  observe: {
    intro: "<p>テストを粒度ごとに流して、速さの違いを体感する。</p>",
    steps: [
      { do: "<code>./mvnw test -Dtest=CalculationServiceTest</code>", expect: "23 件がほぼ一瞬で終わる（Spring も DB も起動しない）" },
      { do: "<code>./mvnw test -Dtest=CalculationControllerTest</code>", expect: "25 件。Spring の Web 部分の起動に数秒かかる" },
      { do: "<code>./mvnw test -Dtest=CalcApiApplicationTests</code>", expect: "1 件。アプリ全体の起動に数秒かかる（1 件あたりが一番重い）" },
      { do: "target/surefire-reports の XML を開き、各テストの time を見比べる。", expect: "粒度が大きいほど時間がかかる。ピラミッドの形の理由" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🧪", t: "テストも一緒に書かせる", d: "機能を頼むときは、どの粒度で何を確かめるテストを書くかまで指示する（CLAUDE.md のゴールデンパス）", tone: "accent" },
  { ic: "🚩", t: "テストを消す・緩める変更を疑う", d: "AI がテストを通すためにテスト側を書き換えることがある。仕様が変わったのか、ごまかしなのかを見る", tone: "err" },
  { ic: "🎭", t: "モックだらけを疑う", d: "偽物の設定ばかりで、実装をなぞっているだけのテストは価値が低い", tone: "warn" }
])}`,
  questions: [
    { q: "自動テストの一番の目的は？",
      choices: ["コードを変えても、既存の振る舞いが壊れていないことを確かめる", "コードを速くする", "バグを 0 にする", "ドキュメントを作る"],
      explain: "変更の安全網。AI が広い範囲を変えるときに特に効く。", see: "s1" },
    { q: "テストピラミッドの考え方として正しいものは？",
      choices: ["速い単体テストを多く、重い全体テストを少なくする", "全体テストを多く、単体テストを少なくする", "すべて同じ数にする", "全体テストだけあればよい"],
      explain: "速いテストが多いほど、変更のたびに気軽に流せる。", see: "s2" },
    { q: "Spring も DB も起動しない、最も速いテストは？",
      choices: ["Service の単体テスト（new して Repository を偽物に）", "@WebMvcTest", "@DataJpaTest", "@SpringBootTest"],
      explain: "ただの Java のオブジェクトとしてテストできる。", see: "s2" },
    { q: "@SpringBootTest（全体の起動）のテストが守っているものは？",
      choices: ["部品が全部つながってアプリが起動すること", "計算の正しさ", "JSON の形", "層のルール"],
      explain: "@Service を外すとここで落ちた（第 3 章）。", see: "s3" },
    { q: "「ステータス・JSON の形・エラーの形」を主に守っているテストは？",
      choices: ["@WebMvcTest（CalculationControllerTest）", "Service の単体テスト", "@DataJpaTest", "ArchUnit"],
      explain: "HTTP の層だけを起動して確かめる。", see: "s3" },
    { q: "このリポジトリのどのテストでも守れていないものは？",
      choices: ["本物の PostgreSQL での動き", "計算の正しさ", "層の依存ルール", "HTTP の形"],
      explain: "テストは H2。「何を守っていないか」を知っておくことが大事。", see: "s3" },
    { q: "Controller のテストで「0 除算は 422」を確かめるとき、Service は？",
      choices: ["偽物で、例外を投げるように設定されている", "本物で 0 で割っている", "起動していない", "DB に保存している"],
      explain: "Controller のテストは例外が 422 になるかだけを見る。", see: "s3" },
    { q: "モックにするのが適切なものは？",
      choices: ["層の境目の相手（Service のテストでの Repository など）", "テストしたい本人", "DTO などの単純な値", "すべてのクラス"],
      explain: "本人をモックにすると何も確かめていないことになる。", see: "s4" },
    { q: "verify(repository, never()).save(any()) が確かめていることは？",
      choices: ["save が一度も呼ばれなかったこと（0 除算で保存されないこと）", "save が 1 回呼ばれたこと", "save が速いこと", "DB が空であること"],
      explain: "モックは「呼ばれなかったこと」も確かめられる。", see: "s4" },
    { q: "偽物の設定ばかりのテストの問題は？",
      choices: ["実装をなぞっているだけになり、実装を変えると壊れる一方で、本当の不具合は見つけにくい", "速すぎる", "コンパイルできない", "問題は無い"],
      explain: "結果（振る舞い）を確かめるテストの方が価値が高い。", see: "s4" },
    { q: "テストで H2 を使う利点は？",
      choices: ["Docker なしで ./mvnw verify が通り、CI も速い", "PostgreSQL と完全に同じ", "本番でも使える", "テストが不要になる"],
      explain: "ただし PostgreSQL と完全には同じでない。", see: "s5" },
    { q: "Testcontainers に移るべきタイミングは？",
      choices: ["DB 固有の SQL（ネイティブクエリ・jsonb など）を書き始めたとき", "テストが 100 件を超えたとき", "Spring Boot のバージョンを上げたとき", "移る必要は無い"],
      explain: "H2 では確かめられない動きが出てきたら、本物の DB でテストする。", see: "s5" },
    { q: "良いテストの名前の例は？",
      choices: ["部分更新でmemoを省略したらメモは変わらない", "test1", "updateMemoTest", "テスト"],
      explain: "何を保証しているかが名前で分かると、落ちたとき何が壊れたか分かる。", see: "s6" },
    { q: "「上限ちょうど 28 桁は通る」と「29 桁は 422」の両方をテストする理由は？",
      choices: ["境目は間違えやすいので、両側を固定するため", "テストの数を増やすため", "速くするため", "決まりは無い"],
      explain: "境界値のテスト。", see: "s6" },
    { q: "何を壊しても落ちないテストは？",
      choices: ["何も守っていない", "とても良いテスト", "速いテスト", "全体テスト"],
      explain: "壊したら落ちることを確かめると、テストの価値が分かる。", see: "s6" },
    { q: "AI がテストを通すために、テストの期待値の方を書き換えてきた。どう判断する？",
      choices: ["仕様が変わったのか、ごまかしなのかを確かめる。仕様変更なら spec も直す", "テストが通ったので受け入れる", "テストを全部消す", "AI を使うのをやめる"],
      explain: "テストは仕様の実例。緩める変更は必ず理由を確かめる。", see: "s1" }
  ]
});
