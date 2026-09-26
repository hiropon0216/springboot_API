// 第 11 章 境界の型：DTO・エンティティ・Mapper（書き方は AUTHORING.md）
Calc.register({
  no: 11,
  goal: [
    "DTO（API の形）とエンティティ（DB の形）の違いを説明できる",
    "似ていても 2 つを分ける理由（内部表現を公開しない）を具体例で言える",
    "Mapper が変換を 1 か所に集める役割を説明できる",
    "リクエスト用とレスポンス用の型を分ける理由が分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "API の形と DB の形",
      body: `
${Fig.compare(
  { t: "📦 DTO（CalculationResponse など）", tone: "accent", html: `
<ul><li><b>API の形</b>。外の利用者との契約</li><li><code>record</code>（不変。作ったら変わらない）</li><li>層の境目を越えるための入れ物</li></ul>` },
  { t: "🗄️ エンティティ（Calculation）", tone: "lec", html: `
<ul><li><b>DB の形</b>。テーブルの 1 行</li><li>普通のクラス（可変。書き換えると UPDATE になる）</li><li>DB のスキーマに縛られる</li></ul>` }
)}
${Fig.pairs("エンティティ Calculation（DB の形）", "CalculationResponse（API の形）", [
  { l: "id", r: "id", tone: "dim" },
  { l: "leftOperand", lnote: "列は left_operand", r: "left", rnote: "API では短い名前", tone: "warn" },
  { l: "operator", r: "operator", tone: "dim" },
  { l: "rightOperand", r: "right", tone: "warn" },
  { l: "result = 5.0000000000", lnote: "NUMERIC(38,10)", r: "result = 5", rnote: "末尾ゼロを落とす", tone: "accent" },
  { l: "memo / createdAt / updatedAt", r: "memo / createdAt / updatedAt", tone: "dim" }
], "項目はほぼ同じ。でも名前や値の見せ方が違い、それぞれ別の理由で変わる", "→")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/dto/CalculationResponse.java", "項目はほぼ同じだが", "似ていても別の型にする理由（javadoc）"),
        code("src/main/java/com/example/calc/calculation/Calculation.java", "@Entity", "DB の 1 行を表すクラス")
      ],
      checks: [
        { q: "CalculationResponse の javadoc によると、エンティティと DTO を同じ型にすると何が起きる？",
          a: "「DB のカラムを足した ＝ API の契約が変わった」になり、外部に約束していない情報まで漏れる。" }
      ]
    },
    {
      id: "s2",
      title: "なぜ分ける：内部表現を公開しない",
      body: `
${Fig.matrix("もしエンティティをそのまま返していたら", ["起きること"], [
  { h: "DB に内部用の列（例: 削除フラグ・パスワード）を足した", c: [{ v: "気づかないうちに API で外に出る", tone: "err" }] },
  { h: "DB の列名を変えた", c: [{ v: "JSON の項目名が変わり、利用者が壊れる", tone: "err" }] },
  { h: "リクエストもエンティティで受けた", c: [{ v: "id や result まで送り込まれて上書きされうる（第 19 章）", tone: "err" }] },
  { h: "DB の小数 10 桁の都合", c: [{ v: "5 が 5.0000000000 で返る", tone: "warn" }] }
], "DB の都合と API の契約は、変わる理由もタイミングも違う。だから型を分けて、つなぎ目を 1 か所にする")}
${Fig.flow([
  { ic: "🗄️", t: "DB の変更", s: "列を足す・名前を変える", tone: "lec" },
  { ic: "🔄", t: "Mapper で吸収", s: "変換を 1 か所で直す", tone: "accent" },
  { ic: "🌐", t: "API は変わらない", s: "変えたいときだけ DTO を直す", tone: "ok" }
], ["", ""])}`,
      refs: [
        code("CLAUDE.md", "**内部表現をそのまま公開しない**", "不変条件 #3")
      ],
      checks: [
        { q: "CLAUDE.md の不変条件 #3 で、エンティティを登場させてはいけない場所はどこ？ 変換はどこに閉じる？",
          a: "Controller にエンティティを登場させない。変換は XxxMapper に閉じる。" }
      ]
    },
    {
      id: "s3",
      title: "Mapper：変換を 1 か所に集める",
      body: `
${Fig.code([
  { c: "final class CalculationMapper {", tag: "継承させない", tone: "dim" },
  { c: "  private CalculationMapper() {}", tag: "インスタンスを作らせない", tone: "dim" },
  { c: "  static CalculationResponse toResponse(Calculation entity) {", tag: "エンティティ → DTO", tone: "accent" },
  { c: "    return new CalculationResponse(entity.getId(), normalize(…), …);" },
  { c: "  }" },
  { c: "  private static BigDecimal normalize(BigDecimal value) { … }", tag: "DB の都合を吸収", tone: "lec" },
  { c: "}" }
], "状態も依存も無いので、Spring の部品にせず static の道具にしている")}
${Fig.cards([
  { ic: "📍", t: "1 か所に集める", d: "変換がここにしか無いので、「API にどう見せるか」を直す場所が 1 つ", tone: "accent" },
  { ic: "✍️", t: "手書きで十分", d: "MapStruct などで自動生成もできるが、項目が少ないうちは手書き。本質は「1 か所」であって道具ではない", tone: "ok" },
  { ic: "🧭", t: "呼ぶのは Service", d: "Service がエンティティを DTO にしてから返す。Controller はエンティティを見ない", tone: "lec" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationMapper.java", "static CalculationResponse toResponse(Calculation entity)", "唯一の変換"),
        code("src/main/java/com/example/calc/calculation/CalculationMapper.java", "private static BigDecimal normalize(BigDecimal value)", "末尾ゼロを落とす")
      ],
      checks: [
        { q: "CalculationService の中で CalculationMapper.toResponse が呼ばれている場所をすべて探そう。Controller では呼ばれている？",
          a: "create・findAll（map で）・findById・replace・updateMemo の Service の中だけ。Controller では呼ばれていない（Controller はエンティティを見ないから）。" }
      ]
    },
    {
      id: "s4",
      title: "リクエストとレスポンスの型も分ける",
      body: `
${Fig.pairs("入ってくる型（Request）", "出ていく型（Response）", [
  { l: "CalculationRequest", lnote: "POST・PUT。left / operator / right（全部必須）", r: "CalculationResponse", rnote: "id・result・時刻などサーバーが決めた値も含む", tone: "accent" },
  { l: "MemoUpdateRequest", lnote: "PATCH。memo だけ", r: "（同じ CalculationResponse）", tone: "lec" }
], "入力はクライアントが決めてよい項目だけ。出力はサーバーが決めた値も含む", "≠")}
${Fig.compare(
  { t: "❌ 1 つの型で入出力を兼ねると", tone: "err", html: "id や result を<b>送れてしまう</b>。無視する処理を忘れれば上書きされる。検証ルールも「作成時は必須、応答では不要」と場合分けになる" },
  { t: "✅ 分けると", tone: "ok", html: "送れるものが型で決まる。<code>@NotNull</code> などの検証ルールも入力の型だけに付ければよい" }
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/dto/CalculationRequest.java", "public record CalculationRequest(", "入力の型"),
        code("src/main/java/com/example/calc/calculation/dto/CalculationResponse.java", "public record CalculationResponse(", "出力の型")
      ],
      checks: [
        { q: "CalculationRequest に id を足さないのはなぜ？ もし足したら何が起きうる？",
          a: "id はサーバー（DB）が採番するもので、クライアントが決めてはいけないから。足すと、クライアントが好きな id を送り込めてしまう。" }
      ]
    },
    {
      id: "s5",
      title: "エンティティは「操作の名前」で変える",
      body: `
${Fig.compare(
  { t: "❌ setter を並べる", tone: "err", html: "<pre>entity.setLeftOperand(…);\nentity.setOperator(…);\nentity.setResult(…);   // 忘れたら？</pre>どう変わってよいかをエンティティが決められない。結果だけ古いまま、などの不正な状態を作れる" },
  { t: "✅ 操作に名前を付ける", tone: "ok", html: "<pre>entity.replaceExpression(\n    left, operator, right, result);\nentity.changeMemo(memo);</pre>「式の置き換え」「メモの変更」だけが許される。式と結果が必ずそろう" }
)}
${Fig.cards([
  { ic: "🔒", t: "protected の空コンストラクタ", d: "JPA は DB から読むとき空のオブジェクトを作って値を詰める。外からは使わせないので protected", tone: "dim" },
  { ic: "🚫", t: "Lombok は使わない", d: "getter を自動生成する道具はあるが、このリポジトリでは手で書く（生成されたコードを読めない状態を作らない）", tone: "warn" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/Calculation.java", "void replaceExpression(", "「式の置き換え」という操作"),
        code("src/main/java/com/example/calc/calculation/Calculation.java", "protected Calculation() {}", "JPA のための空のコンストラクタ"),
        code("CLAUDE.md", "**Lombok は使わない**", "コーディング規約")
      ],
      checks: [
        { q: "Calculation に setter（setResult など）はある？ 値を変える方法は何種類？",
          a: "setter は無い。値を変える方法は replaceExpression と changeMemo の 2 つだけ（それとライフサイクルの onCreate / onUpdate）。" }
      ]
    },
    {
      id: "s6",
      title: "境界を機械で守る",
      body: `
${Fig.flow([
  { ic: "🚪", t: "Controller", s: "DTO だけを扱う", tone: "ok" },
  { ic: "🧮", t: "Service", s: "エンティティ → DTO にして返す", tone: "accent" },
  { ic: "🗄️", t: "Repository", s: "エンティティを出し入れ", tone: "lec" }
], [{ f: "DTO", b: "DTO" }, { f: "エンティティ", b: "エンティティ" }], { caption: "エンティティは Service より下の世界だけに住む。Controller に出てきたら ArchUnit が止める" })}`,
      refs: [
        code("src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java", "static final ArchRule entities_are_not_exposed_by_controllers", "Controller が @Entity に依存したら失敗")
      ],
      checks: [
        { q: "このルールは Controller の何を検査している？",
          a: "Controller が @Entity の付いたクラスに依存していないこと（引数・戻り値・フィールドなどでエンティティを使っていないこと）。" }
      ]
    }
  ],
  observe: {
    intro: "<p>API の形と DB の形の違いを実物で見る（Docker で PostgreSQL を起動している場合）。</p>",
    steps: [
      { do: `<pre>curl -s -X POST http://localhost:8080/api/v1/calculations -H "Content-Type: application/json" -d '{"left":50.0,"operator":"MULTIPLY","right":2}'</pre>`,
        expect: '"left":50,"result":100（末尾ゼロが落ちている）' },
      { do: "<code>docker compose exec postgres psql -U calc -d calc -c 'select left_operand, result from calculations;'</code>",
        expect: "DB では 50.0000000000 / 100.0000000000。同じ値でも、API の形と DB の形は違う" },
      { do: `作成のリクエストに <code>"id":999,"result":1</code> を混ぜて送る。`, expect: "無視される（CalculationRequest に無い項目だから）。id は DB が振り、result はサーバーが計算する" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "⚡", t: "「エンティティを返せば早い」を断る", d: "AI は DTO と Mapper を省略した近道を出しがち。不変条件 #3 と ArchUnit で止める", tone: "err" },
  { ic: "🔍", t: "入力の型に何が増えたか", d: "id・result・createdAt のような「サーバーが決める値」が入力の型に増えていないか", tone: "warn" },
  { ic: "🧩", t: "列を足すときの 3 点セット", d: "エンティティ・DTO・Mapper を一緒に直すよう指示する（どれかを忘れると API に出ない／ずれる）", tone: "accent" }
])}`,
  questions: [
    { q: "DTO とエンティティの違いとして正しいものは？",
      choices: ["DTO は API の形（契約）、エンティティは DB の形（テーブルの 1 行）", "DTO は DB の形、エンティティは API の形", "同じものの別名", "DTO はテスト専用"],
      explain: "似ていても役割と変わる理由が違う。", see: "s1" },
    { q: "このリポジトリで DTO を record にしている理由は？",
      choices: ["不変（作ったら変わらない）で、層の境目を越える入れ物に向くから", "速いから", "JPA が record を要求するから", "Lombok の代わりに必要だから"],
      explain: "エンティティは可変（書き換えると UPDATE）なので普通のクラス。", see: "s1" },
    { q: "エンティティのフィールド leftOperand が、API では left という名前になっている。これを可能にしているのは？",
      choices: ["エンティティと DTO を別の型にし、Mapper で変換しているから", "Jackson が自動で短くしているから", "DB が名前を変えているから", "偶然"],
      explain: "型を分けているので、それぞれにふさわしい名前を付けられる。", see: "s1" },
    { q: "エンティティをそのまま API で返していた場合、DB に内部用の列を足すと何が起きる？",
      choices: ["気づかないうちに API の応答に出てしまう", "何も起きない", "コンパイルエラーになる", "列が保存されなくなる"],
      explain: "DB の変更がそのまま API の契約の変更になる。", see: "s2" },
    { q: "「内部表現をそのまま公開しない」はこのプロジェクトの何番目の不変条件？",
      choices: ["#3", "#1", "#4", "#5"],
      explain: "#1 層の依存方向、#2 package-by-feature、#3 内部表現を公開しない、#4 ProblemDetail、#5 トランザクション境界。", see: "s2" },
    { q: "CalculationMapper の役割は？",
      choices: ["エンティティを API 用の DTO に変換する（変換を 1 か所に集める）", "DB に保存する", "HTTP のステータスを決める", "入力を検証する"],
      explain: "API にどう見せるかを直す場所が 1 つになる。", see: "s3" },
    { q: "CalculationMapper を Spring の部品（Bean）にせず static にしているのはなぜ？",
      choices: ["状態も、注入してほしい依存も無いから", "Spring では Mapper を部品にできないから", "速いから", "テストで使わないから"],
      explain: "部品にする理由が無いものは、ただの道具（static）でよい。", see: "s3" },
    { q: "MapStruct のような自動生成ではなく手書きの Mapper にしている理由は？",
      choices: ["項目が少ないうちは手書きで十分で、本質は「変換が 1 か所にあること」だから", "MapStruct は使えないから", "手書きの方が速いから", "Lombok が無いから"],
      explain: "道具は手段。1 か所に集めることが本質。", see: "s3" },
    { q: "Mapper を呼んでエンティティを DTO にしているのはどの層？",
      choices: ["Service", "Controller", "Repository", "GlobalExceptionHandler"],
      explain: "Controller にエンティティを登場させないため、Service の中で変換してから返す。", see: "s3" },
    { q: "リクエスト用とレスポンス用の型を分ける理由として最も適切なものは？",
      choices: ["クライアントが送れる項目を型で限定し、サーバーが決める値（id・result）を送り込めないようにするため", "ファイル数を増やすため", "JSON の変換を速くするため", "Spring の決まりだから"],
      explain: "1 つの型で兼ねると、id や result を上書きされる危険がある。", see: "s4" },
    { q: "作成のリクエストに \"id\": 999 を混ぜて送った。何が起きる？",
      choices: ["無視される（CalculationRequest に id が無いから）", "id が 999 で保存される", "400 になる", "500 になる"],
      explain: "知らない項目は無視される。id は DB が振る。", see: "s4" },
    { q: "エンティティに setter を並べず replaceExpression のような操作を置く理由は？",
      choices: ["どう変わってよいかをエンティティ自身が決め、式と結果がずれるような不正な状態を作らせないため", "setter は Java で使えないから", "速いから", "JPA の決まりだから"],
      explain: "式を変えたのに結果が古いまま、を防げる。", see: "s5" },
    { q: "Calculation に protected の引数なしコンストラクタがある理由は？",
      choices: ["JPA が DB から読むときに空のオブジェクトを作って値を詰めるため。外からは使わせない", "テストのため", "Lombok のため", "JSON の変換のため"],
      explain: "JPA の要求。アプリのコードからは使わないので protected。", see: "s5" },
    { q: "このリポジトリで Lombok を使わない理由は？",
      choices: ["自動生成されたコードを読めない状態を作らないため（学習用）", "Lombok は Java 21 で動かないから", "遅いから", "Spring Boot 4 で禁止されたから"],
      explain: "CLAUDE.md のコーディング規約。getter は手で書く。", see: "s5" },
    { q: "Controller の引数や戻り値にエンティティが出てきたとき、それを止めるのは？",
      choices: ["ArchUnit の entities_are_not_exposed_by_controllers", "Checkstyle", "Spotless", "コンパイラ"],
      explain: "約束を機械で守っている。", see: "s6" },
    { q: "「DB に列を足して、それを API にも出したい」と AI に頼むとき、一緒に直すよう指示すべきものは？",
      choices: ["エンティティ・レスポンス DTO・Mapper", "Controller だけ", "application.yml だけ", "テストだけ"],
      explain: "どれかを忘れると API に出ない、またはずれる。", see: "s2" }
  ]
});
