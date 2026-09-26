// 第 15 章 ORM と JPA（書き方は AUTHORING.md）
Calc.register({
  no: 15,
  goal: [
    "ORM（オブジェクトとテーブルの対応づけ）が何を肩代わりしているかを説明できる",
    "エンティティの一生（新規 → 管理中 → 管理外）と、そのとき SQL が飛ぶタイミングが分かる",
    "Repository の継承メソッドと派生クエリ（メソッド名 → SQL）が読める",
    "同じ制約を DB・入力検証・業務ロジックの 3 か所で持つ理由を説明できる"
  ],
  sections: [
    {
      id: "s1",
      title: "ORM：オブジェクトとテーブルをつなぐ",
      body: `
${Fig.flow([
  { ic: "☕", t: "Java のオブジェクト", s: "Calculation<br>leftOperand = 2", tone: "accent" },
  { ic: "🔄", t: "ORM（Hibernate）", s: "対応表（@Entity・@Column）を見て<br>SQL を組み立てる", tone: "lec" },
  { ic: "🐘", t: "DB のテーブルの行", s: "calculations<br>left_operand = 2", tone: "ok" }
], [{ f: "save", b: "find" }, { f: "INSERT / UPDATE", b: "SELECT" }], { caption: "ORM ＝ Object-Relational Mapping。SQL を書かずに、オブジェクトの保存・取得ができる" })}
${Fig.stack([
  { t: "Spring Data JPA", d: "Repository の interface から実装を自動生成する（第 2 章）", tone: "accent" },
  { t: "JPA", d: "Java 標準の ORM の約束（@Entity などのアノテーション）", tone: "lec" },
  { t: "Hibernate", d: "JPA の実装。実際に SQL を作って発行する", tone: "ok" },
  { t: "JDBC ＋ ドライバ", d: "DB との通信（第 14 章）", tone: "dim" }
], "上ほど便利、下ほど DB に近い")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/Calculation.java", "@Entity", "対応表の起点")
      ],
      checks: [
        { q: "Calculation の javadoc で、エンティティと DTO の違いは何と説明されている？",
          a: "DTO は不変（record）で層の境界を越える入れ物・API の契約。エンティティは可変（フィールドを書き換えると UPDATE 文になる）で、DB のスキーマに縛られる。" }
      ]
    },
    {
      id: "s2",
      title: "エンティティの一生と SQL のタイミング",
      body: `
${Fig.timeline([
  { t: "新規（new）", d: "new Calculation(…)。まだ DB と無関係。id は null", tone: "dim" },
  { t: "保存（save）", d: "@PrePersist で時刻を入れ → INSERT → DB が id を振り、書き戻す", tone: "accent" },
  { t: "管理中（managed）", d: "トランザクションの中で Hibernate が見張る。フィールドを変えると flush 時に UPDATE（ダーティチェック）", tone: "lec" },
  { t: "管理外（detached）", d: "トランザクションが終わると見張りも終わる。書き換えても DB に反映されない", tone: "warn" },
  { t: "削除（delete）", d: "DELETE が発行される", tone: "err" }
], "「管理中」の間だけ、書き換えが自動で DB に反映される。これが第 12 章の「save しなくても UPDATE」の正体")}
${Fig.compare(
  { t: "save の戻り値を使う", tone: "ok", html: "<pre>Calculation saved = repository.save(entity);\nsaved.getId(); // 1</pre>DB が振った id が入った「管理中」のもの" },
  { t: "キャッシュに注意（テストで）", tone: "warn", html: "同じトランザクションの中の find は、DB ではなくメモリ上のもの（1 次キャッシュ）を返すことがある。<br>本当に DB に入ったかは flush と clear をしてから確かめる" }
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/Calculation.java", "@PrePersist", "保存の直前に呼ばれる"),
        code("src/test/java/com/example/calc/calculation/CalculationRepositoryTest.java", "溜めている SQL を今すぐ DB に送る", "flush と clear の説明（javadoc）")
      ],
      checks: [
        { q: "CalculationService.create のコメントで、save の戻り値を使うのが作法だとしている理由は？",
          a: "save() が INSERT を実行し、DB が採番した id を書き戻した「管理された永続エンティティ」が戻り値だから。引数の entity を使い続けるのは避ける。" }
      ]
    },
    {
      id: "s3",
      title: "Repository：継承したメソッドと派生クエリ",
      body: `
${Fig.matrix("メソッド", ["出どころ", "発行される SQL（イメージ）"], [
  { h: "save(entity)", c: [{ v: "継承", tone: "dim" }, "INSERT（新規）／ UPDATE（既存）"] },
  { h: "findById(id)", c: [{ v: "継承", tone: "dim" }, "SELECT … WHERE id = ?（結果は Optional）"] },
  { h: "findAll(pageable)", c: [{ v: "継承", tone: "dim" }, "SELECT … ORDER BY … LIMIT / OFFSET ＋ COUNT"] },
  { h: "delete(entity)", c: [{ v: "継承", tone: "dim" }, "DELETE … WHERE id = ?"] },
  { h: "findByOperator(op, pageable)", c: [{ v: "自分で宣言", tone: "accent" }, "SELECT … WHERE operator = ? …"] }
], "JpaRepository&lt;Calculation, Long&gt; を継承するだけで上の 4 つが使える")}
${Fig.flow([
  { t: "find", s: "取得する", tone: "accent" },
  { t: "By", s: "条件の始まり", tone: "dim" },
  { t: "Operator", s: "operator 列が", tone: "ok" },
  { t: "(Pageable)", s: "並びとページ", tone: "lec" }
], ["", "", ""], { compact: true, caption: "派生クエリ：メソッド名そのものが仕様。綴りを間違えると起動時に例外で止まる（実行前に気づける）" })}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationRepository.java", "Page<Calculation> findByOperator(Operator operator, Pageable pageable);", "自分で宣言した唯一の派生クエリ")
      ],
      checks: [
        { q: "findById の戻り値はなぜ Calculation ではなく Optional&lt;Calculation&gt; なの？ Service ではどう扱っている？",
          a: "「無いかもしれない」ことを型で表すため。Service の mustFind が orElseThrow で「無い」を ResourceNotFoundException（404）に変えている。" }
      ]
    },
    {
      id: "s4",
      title: "制約は 3 か所で持つ",
      body: `
${Fig.matrix("制約", ["DB（エンティティ）", "入力検証（DTO）", "業務ロジック（Service）"], [
  { h: "数値の大きさ", c: [{ v: "NUMERIC(38,10)", tone: "lec" }, { v: "@Digits(28, 10)", tone: "warn" }, { v: "結果の整数部 ≦ 28 桁", tone: "accent" }] },
  { h: "メモの長さ", c: [{ v: "length = 200", tone: "lec" }, { v: "@Size(max = 200)", tone: "warn" }, "—"] },
  { h: "必須", c: [{ v: "nullable = false", tone: "lec" }, { v: "@NotNull", tone: "warn" }, "—"] }
], "DB は最後の砦、入力検証は入口の関所、Service は「入口では分からないこと」の確認")}
${Fig.compare(
  { t: "🐛 Sprint 7 で見つかった穴", tone: "err", html: "入力は 28 桁以内で @Digits を通るのに、<b>28 桁 + 28 桁の結果は 29 桁</b>。DB が拒否して 500 になった" },
  { t: "✅ 直し方", tone: "ok", html: "結果は計算するまで分からないので、Service で計算直後に確かめて 422 にした（MAX_INTEGER_DIGITS）" },
  "どこか 1 か所でもずれると「400 で返すべきものが 500」になる。スキーマを変えるときは 3 か所セットで直す"
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/Calculation.java", "@Column(nullable = false, precision = 38, scale = 10)", "DB の制約（result 列）"),
        code("src/main/java/com/example/calc/calculation/dto/CalculationRequest.java", "@NotNull @Digits(integer = 28, fraction = 10) BigDecimal left", "入力検証の制約"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "private static final int MAX_INTEGER_DIGITS = 28;", "業務ロジックの制約")
      ],
      checks: [
        { q: "NUMERIC(38, 10) から、整数部の上限 28 桁はどう計算される？",
          a: "全体 38 桁のうち小数が 10 桁なので、整数部は 38 − 10 = 28 桁。" }
      ]
    },
    {
      id: "s5",
      title: "ORM の落とし穴を避ける設定",
      body: `
${Fig.compare(
  { t: "❌ @Enumerated(ORDINAL)（既定）", tone: "err", html: "enum の順番（0, 1, 2…）で保存。<br><code>ADD=0, SUBTRACT=1</code> の間に新しい値を足すと、<b>既存データの意味が変わる</b>" },
  { t: "✅ @Enumerated(STRING)", tone: "ok", html: "<code>'ADD'</code> という文字列で保存。順番を入れ替えても安全" }
)}
${Fig.cards([
  { ic: "🔢", t: "BigDecimal ↔ NUMERIC", d: "double（誤差あり）ではなく、正確な 10 進数で保存する", tone: "accent" },
  { ic: "🆔", t: "IDENTITY 採番", d: "番号は DB の自動採番に任せる。保存するまで id は null", tone: "lec" },
  { ic: "🚫", t: "予約語を避ける", d: "left / right は SQL の予約語なので left_operand などに改名", tone: "warn" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/Calculation.java", "@Enumerated(EnumType.STRING)", "enum は文字列で保存"),
        code("src/main/java/com/example/calc/calculation/Calculation.java", "@GeneratedValue(strategy = GenerationType.IDENTITY)", "番号は DB が振る")
      ],
      checks: [
        { q: "Calculation の javadoc で、ORDINAL について何と注意している？",
          a: "enum の定義順を入れ替えた瞬間に既存データの意味が変わる地雷なので使わない。実務でも事故が多い。" }
      ]
    }
  ],
  observe: {
    intro: "<p>SQL のログ（show-sql）を見ながら、ORM が作る SQL を観察する。</p>",
    steps: [
      { do: "作成（POST）を 1 回送り、ログの insert 文を見る。", expect: "insert into calculations (…left_operand, operator, result…) の形。Java の名前（leftOperand）ではなく DB の列名が使われている" },
      { do: "<code>curl -s 'http://localhost:8080/api/v1/calculations?operator=ADD&size=2'</code> を送り、ログを見る。", expect: "where operator=? と order by created_at desc, id desc と fetch first / limit の付いた select、続いて select count(…) の 2 本" },
      { do: "<code>docker compose exec postgres psql -U calc -d calc -c 'select operator from calculations limit 3;'</code>", expect: "ADD などの文字列（0 や 1 ではない）" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🧪", t: "SQL を見せて議論する", d: "ORM が何本の SQL を出しているかは、コードを読んでも分かりにくい。show-sql のログを AI に見せる", tone: "accent" },
  { ic: "🧩", t: "制約は 3 点セットで", d: "列の桁や長さを変えるときは、エンティティ・DTO の検証・Service のルールを一緒に直させる", tone: "warn" },
  { ic: "🔤", t: "ORDINAL を見逃さない", d: "@Enumerated を付け忘れると既定の ORDINAL になる", tone: "err" }
])}`,
  questions: [
    { q: "ORM が肩代わりしているのは？",
      choices: ["オブジェクトとテーブルの行を対応づけ、SQL を組み立てること", "HTTP の受け付け", "JSON の変換", "テストの実行"],
      explain: "私たちは @Entity などで対応表を書くだけ。", see: "s1" },
    { q: "JPA と Hibernate の関係は？",
      choices: ["JPA は Java 標準の約束、Hibernate はその実装", "同じもの", "Hibernate が約束、JPA が実装", "JPA は DB の種類"],
      explain: "Spring Data JPA はさらにその上で Repository を自動生成する。", see: "s1" },
    { q: "new Calculation(…) を作った直後、id は？",
      choices: ["null（保存するまで決まらない）", "0", "1", "ランダムな値"],
      explain: "IDENTITY 採番なので、INSERT の瞬間に DB が振る。", see: "s2" },
    { q: "「管理中（managed）」のエンティティのフィールドを書き換えると？",
      choices: ["flush 時に変更が検知され、UPDATE が発行される", "何も起きない", "すぐに DELETE される", "例外になる"],
      explain: "ダーティチェック。トランザクションの中だけの動き。", see: "s2" },
    { q: "トランザクションが終わった後（管理外）のエンティティを書き換えると？",
      choices: ["DB には反映されない", "自動で UPDATE される", "例外で止まる", "INSERT される"],
      explain: "見張りは管理中の間だけ。", see: "s2" },
    { q: "@DataJpaTest で「本当に DB に入ったか」を確かめるとき flush と clear をするのはなぜ？",
      choices: ["しないと find がメモリ上のもの（1 次キャッシュ）を返し、DB を確かめたことにならないから", "速くするため", "テストの決まり", "データを消すため"],
      explain: "flush で SQL を送り、clear でキャッシュを空にしてから読み直す。", see: "s2" },
    { q: "JpaRepository を継承するだけで使えるメソッドに含まれないものは？",
      choices: ["findByOperator", "save", "findById", "delete"],
      explain: "findByOperator は自分で宣言した派生クエリ。", see: "s3" },
    { q: "findById の戻り値が Optional である理由は？",
      choices: ["「見つからないかもしれない」ことを型で表すため", "速くするため", "null を返せないから", "JSON にするため"],
      explain: "Service が orElseThrow で 404 用の例外にしている。", see: "s3" },
    { q: "派生クエリのメソッド名の綴りを間違えるとどうなる？",
      choices: ["起動時に例外で止まる（実行前に気づける）", "実行時まで気づかない", "全件が返る", "無視される"],
      explain: "名前が仕様。規則から外れると Spring Data が解釈できない。", see: "s3" },
    { q: "DB の列が NUMERIC(38, 10) のとき、整数部に入る最大の桁数は？",
      choices: ["28 桁", "38 桁", "10 桁", "48 桁"],
      explain: "38 − 10 = 28。", see: "s4" },
    { q: "Sprint 7 で見つかった「28 桁 + 28 桁で 500」を防ぐのに、入力検証（@Digits）だけでは足りなかった理由は？",
      choices: ["入力は条件を満たしても、計算結果が 29 桁になりうるから", "@Digits が壊れていたから", "DB の設定が間違っていたから", "Jackson のバグ"],
      explain: "結果は計算するまで分からない。Service で確かめる。", see: "s4" },
    { q: "同じ制約を DB・入力検証・Service の 3 か所で持つ理由として適切なものは？",
      choices: ["それぞれ確かめられるタイミングが違い、どこかがずれると 400 のはずが 500 になるから", "多いほど安全だから", "Spring の決まり", "速くなるから"],
      explain: "DB は最後の砦、入力検証は入口、Service は入口で分からないことの確認。", see: "s4" },
    { q: "@Enumerated(EnumType.ORDINAL) の危険は？",
      choices: ["enum の順番で保存するので、値を足したり並べ替えたりすると既存データの意味が変わる", "保存できない", "遅い", "文字化けする"],
      explain: "STRING なら 'ADD' という文字列で残るので安全。", see: "s5" },
    { q: "金額や計算結果を double ではなく BigDecimal ↔ NUMERIC で持つ理由は？",
      choices: ["二進の浮動小数点の誤差（0.1 + 0.2 ≠ 0.3）を持ち込まないため", "容量が小さいから", "速いから", "JPA が double を扱えないから"],
      explain: "正確な 10 進数で計算・保存する。", see: "s5" },
    { q: "Java のフィールド名 left をそのまま列名にしなかった理由は？",
      choices: ["SQL の予約語（LEFT JOIN など）とぶつかるから", "長すぎるから", "日本語にするため", "決まりは無い"],
      explain: "@Column(name = \"left_operand\") で改名した。", see: "s5" },
    { q: "ORM が何本の SQL を出しているか AI と議論したい。何を見せるのが最も確実？",
      choices: ["show-sql で出た実際の SQL のログ", "エンティティのコードだけ", "テストの名前", "pom.xml"],
      explain: "ORM の SQL はコードから読み取りにくい。実物のログが確実（第 17 章の N+1 でも重要）。", see: "s3" }
  ]
});
