// 第 21 章 ガードレール（書き方は AUTHORING.md）
Calc.register({
  no: 21,
  goal: [
    "ガードレール（機械による規約の強制）が、人の注意力や AI の気まぐれに頼らないための仕組みだと説明できる",
    "./mvnw verify の中で、何がどの順番で検査されるかが分かる",
    "Spotless・Checkstyle・ArchUnit・LearningLinksTest がそれぞれ何を守るかを言える",
    "機械に任せることと、人が見るべきことを分けられる"
  ],
  sections: [
    {
      id: "s1",
      title: "ガードレール：落ちる前に止める",
      body: `
${Fig.compare(
  { t: "📜 文書に書くだけ", tone: "warn", html: "「star import は禁止」「Controller から Repository を呼ばない」と README に書く。<br>→ 人は忘れる。AI は読み飛ばす。レビューで毎回指摘することになる" },
  { t: "🚧 機械が止める", tone: "ok", html: "破ったら <b>./mvnw verify が赤くなる</b>。<br>→ 誰が書いても、同じ基準で、すぐ止まる。指摘の議論が要らない" }
)}
${Fig.cards([
  { ic: "🎨", t: "Spotless", d: "書式（インデント・改行・import の順）", tone: "accent" },
  { ic: "📏", t: "Checkstyle", d: "書式では拾えない規約（star import・命名・中カッコ）", tone: "lec" },
  { ic: "🏛️", t: "ArchUnit", d: "構造（層の向き・循環・命名とアノテーション）", tone: "ok" },
  { ic: "🔗", t: "LearningLinksTest", d: "教材のリンクが切れていないか", tone: "warn" }
], "CLAUDE.md の不変条件は「CI でも強制する」と明記されている")}`,
      refs: [
        code("CLAUDE.md", "CI（ArchUnit / Checkstyle / Spotless）でも強制する", "不変条件は機械でも守る"),
        code("docs/adr/0004-package-by-feature-and-guardrails.md", "# ADR 0004", "ガードレールを入れた理由")
      ],
      checks: [
        { q: "CLAUDE.md の「アーキテクチャ不変条件」の冒頭に、破る変更について何と書いてある？",
          a: "「CI（ArchUnit / Checkstyle / Spotless）でも強制する。破る変更は入れない。」" }
      ]
    },
    {
      id: "s2",
      title: "./mvnw verify の中で起きること",
      body: `
${Fig.timeline([
  { t: "validate：Checkstyle", d: "コンパイルより前に規約を確かめる（いちばん早く失敗する）", tone: "lec" },
  { t: "compile：コンパイル", d: "Java を実行できる形にする", tone: "dim" },
  { t: "test：テスト 64 件", d: "単体・@WebMvcTest・@DataJpaTest・@SpringBootTest・ArchUnit・LearningLinksTest", tone: "ok" },
  { t: "package：jar を作る", d: "実行ファイルにまとめる", tone: "dim" },
  { t: "verify：Spotless の書式チェック", d: "最後に書式を確かめる。崩れていれば赤", tone: "accent" }
], "Maven は決まった順番（ライフサイクル）で進む。どこかで失敗すると、そこで止まる")}
<div class="note"><b>直し方の違い</b>　書式の崩れは <code>./mvnw spotless:apply</code> で<b>機械が直す</b>。
Checkstyle・ArchUnit の違反は、<b>人（または AI）が設計を直す</b>。</div>`,
      refs: [
        code("pom.xml", "<phase>validate</phase>", "Checkstyle は validate の段階で動く"),
        code("pom.xml", "<googleJavaFormat/>", "Spotless は google-java-format で書式を決める")
      ],
      checks: [
        { q: "Dockerfile の jar 作成では、テスト・Checkstyle・Spotless をスキップしている。なぜ問題にならない？（Dockerfile のコメントを読もう）",
          a: "イメージのビルドの責務は「jar を作る」ことだけで、検査は CI の責務だから。CI で verify が通ったものだけがデプロイされる（第 23 章）。" }
      ]
    },
    {
      id: "s3",
      title: "Spotless：書式は議論しない",
      body: `
${Fig.flow([
  { ic: "✍️", t: "誰かが書く", s: "インデント 4、import バラバラ" },
  { ic: "🎨", t: "./mvnw spotless:apply", s: "google-java-format に整形", tone: "accent" },
  { ic: "✅", t: "全員同じ書式", s: "差分に書式の変更が混ざらない", tone: "ok" }
], ["", ""], { caption: "書式の好みを人間どうしで議論しない。「唯一の正」を機械に置く" })}
${Fig.cards([
  { ic: "🔍", t: "差分が読みやすくなる", d: "書式だけの変更が混ざらないので、レビューで中身に集中できる", tone: "ok" },
  { ic: "🤖", t: "AI の出力もそろう", d: "AI がどんな書式で書いても、apply すれば同じ見た目になる", tone: "accent" }
])}`,
      refs: [
        code("pom.xml", "Spotless がフォーマットの唯一の正", "Spotless の位置づけ（コメント）")
      ],
      checks: [
        { q: "CLAUDE.md のコーディング規約で、コミット前に実行するよう書かれているコマンドは？",
          a: "./mvnw spotless:apply（書式を自動で整える）。" }
      ]
    },
    {
      id: "s4",
      title: "Checkstyle：書式では拾えない規約",
      body: `
${Fig.matrix("ルール", ["止めるもの"], [
  { h: "AvoidStarImport", c: [{ v: "import java.util.*; のような一括 import", tone: "lec" }] },
  { h: "UnusedImports", c: [{ v: "使っていない import", tone: "lec" }] },
  { h: "TypeName / MethodName / ConstantName", c: [{ v: "命名の規約違反", tone: "lec" }] },
  { h: "NeedBraces", c: [{ v: "if の中カッコ省略", tone: "lec" }] },
  { h: "EqualsHashCode / StringLiteralEquality", c: [{ v: "equals と hashCode の片方だけ・文字列を == で比較", tone: "err" }] }
], "書式（Spotless）と役割が重ならないよう、最小構成にしている")}
${Fig.cards([
  { ic: "🇯🇵", t: "テストの日本語名は例外", d: "テストのメソッド名（例: 足し算()）は MethodName の規約から外している（suppressions.xml）", tone: "dim" }
])}`,
      refs: [
        code("config/checkstyle/checkstyle.xml", '<module name="AvoidStarImport"/>', "star import を禁止"),
        code("config/checkstyle/suppressions.xml", 'checks="MethodName"', "テストの日本語のメソッド名を許す")
      ],
      checks: [
        { q: "checkstyle.xml の冒頭のコメントで、Checkstyle とフォーマットの役割分担は何と書かれている？",
          a: "フォーマット（インデント・改行・import 順）は Spotless（google-java-format）が担当するので、Checkstyle はフォーマットで拾えない規約だけを見る（最小構成）。" }
      ]
    },
    {
      id: "s5",
      title: "構造と文書もテストにする",
      body: `
${Fig.compare(
  { t: "🏛️ ArchUnit（第 10 章）", tone: "ok", html: "層の依存の向き、機能どうしの循環、エンティティを外に出さない、名前とアノテーションの一致。<br><b>設計図をテストにしたもの</b>" },
  { t: "🔗 LearningLinksTest", tone: "warn", html: "この教材のコードへのリンクが実在するか、行番号が最新か。<br><b>文書をテストにしたもの</b>。コードを変えて教材が嘘になるのを止める" }
)}
${Fig.flow([
  { ic: "✏️", t: "コードを変えた", s: "目印の行が消えた・ずれた" },
  { ic: "🔴", t: "LearningLinksTest が赤", s: "どの章のどのリンクかを表示", tone: "err" },
  { ic: "🔧", t: "直す", s: "リンクを直すか、行番号の一覧を作り直す", tone: "ok" }
], ["", ""], { caption: "「文書は黙って古くなる」問題（sprint-8 学習ノート）への機械の答え" })}`,
      refs: [
        code("src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java", "@AnalyzeClasses(", "ArchUnit の検査対象"),
        code("src/test/java/com/example/calc/learning/LearningLinksTest.java", "class LearningLinksTest", "教材のリンク検査")
      ],
      checks: [
        { q: "LearningLinksTest の 3 つのテストはそれぞれ何を確かめている？",
          a: "① 章ファイルのリンク先ファイルと目印がすべて実在する、② 行番号の一覧 anchors.js が最新、③ index.html が読み込む章ファイルと実在する章ファイルが一致する。" }
      ]
    },
    {
      id: "s6",
      title: "機械に任せること、人が見ること",
      body: `
${Fig.matrix("確かめたいこと", ["担当"], [
  { h: "書式", c: [{ v: "Spotless（機械）", tone: "ok" }] },
  { h: "import・命名・中カッコ", c: [{ v: "Checkstyle（機械）", tone: "ok" }] },
  { h: "層の向き・循環", c: [{ v: "ArchUnit（機械）", tone: "ok" }] },
  { h: "振る舞い（仕様の実例）", c: [{ v: "テスト（機械）", tone: "ok" }] },
  { h: "仕様・契約（spec）と合っているか", c: [{ v: "人", tone: "lec" }] },
  { h: "設計判断は妥当か・ほかの案は", c: [{ v: "人", tone: "lec" }] },
  { h: "セキュリティ（認可の漏れ・秘密情報）", c: [{ v: "人（＋ 一部は機械）", tone: "lec" }] },
  { h: "実際に動くか", c: [{ v: "人が動かして確かめる", tone: "lec" }] }
], "機械に任せられることを任せるほど、人は「判断」に時間を使える")}`,
      refs: [
        code("CLAUDE.md", "**コードを読むだけで合格を出さない。**", "人が必ずやること：実際に動かす")
      ],
      checks: [
        { q: "CLAUDE.md で、検証について「やってはいけない」とされていることは？ できなかった検証はどうする？",
          a: "コードを読むだけで合格を出さない（実際に動かす）。実施できなかった検証は「検証不能」と正直に記録する。" }
      ]
    }
  ],
  observe: {
    intro: "<p>ガードレールに引っかかってみる。<b>試したら必ず元に戻す</b>。</p>",
    steps: [
      { do: "CalculationService の import 文の並びに <code>import java.util.*;</code> を 1 行足して <code>./mvnw verify</code>。",
        expect: "コンパイルより前の validate で Checkstyle（AvoidStarImport）が失敗する" },
      { do: "元に戻し、どこかの行のインデントをわざと崩して <code>./mvnw verify</code>。", expect: "テストは通るが、最後の Spotless の check で失敗する" },
      { do: "<code>./mvnw spotless:apply</code> を実行してから、もう一度 <code>./mvnw verify</code>。", expect: "書式が自動で直り、BUILD SUCCESS" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🔁", t: "AI に verify を回させる", d: "変更のたびに ./mvnw verify を実行させ、赤ならその出力を読んで直させる。人は緑になってからレビューする", tone: "accent" },
  { ic: "🚫", t: "ガードレールを外させない", d: "「テストが通らないので ArchUnit のルールを緩めました」「Checkstyle をスキップしました」は差し戻す", tone: "err" },
  { ic: "➕", t: "繰り返す指摘はルールにする", d: "レビューで同じ指摘を 2 回したら、機械のルールにできないか考える", tone: "ok" }
])}`,
  questions: [
    { q: "ガードレール（機械による規約の強制）の一番の利点は？",
      choices: ["誰が書いても同じ基準で、破った瞬間に止まり、人の注意力に頼らない", "コードが速くなる", "テストが不要になる", "ドキュメントが不要になる"],
      explain: "人は忘れ、AI は読み飛ばす。機械は毎回同じように止める。", see: "s1" },
    { q: "./mvnw verify で、いちばん最初に動く検査は？",
      choices: ["Checkstyle（validate の段階）", "Spotless", "ArchUnit", "@SpringBootTest"],
      explain: "コンパイルより前に規約を確かめる。", see: "s2" },
    { q: "Spotless の書式チェックが動くのは、verify のどの段階？",
      choices: ["最後（verify の段階）", "最初（validate）", "コンパイルの前", "テストの前"],
      explain: "テストが通った後でも、書式が崩れていれば最後に赤くなる。", see: "s2" },
    { q: "書式の崩れで verify が失敗した。最も手早い直し方は？",
      choices: ["./mvnw spotless:apply で機械に直させる", "手で 1 行ずつ直す", "Spotless を外す", "テストを消す"],
      explain: "書式は機械が直せる。規約・設計の違反は人が直す。", see: "s2" },
    { q: "Spotless を入れる目的として最も適切なのは？",
      choices: ["書式の好みを議論せず、唯一の正を機械に置くため", "バグを見つけるため", "速くするため", "セキュリティのため"],
      explain: "差分に書式の変更が混ざらず、レビューで中身に集中できる。", see: "s3" },
    { q: "Checkstyle が担当するのは？",
      choices: ["書式では拾えない規約（star import・命名・中カッコなど）", "インデント", "層の依存の向き", "テストの実行"],
      explain: "書式は Spotless、構造は ArchUnit と役割を分けている。", see: "s4" },
    { q: "import java.util.*; と書いたら何が止める？",
      choices: ["Checkstyle の AvoidStarImport", "Spotless", "ArchUnit", "コンパイラ"],
      explain: "一括 import は、何を使っているか分かりにくくし、名前の衝突も招く。", see: "s4" },
    { q: "テストのメソッド名を日本語（例: 足し算()）にできている理由は？",
      choices: ["suppressions.xml で、テストには MethodName の規約を適用しないようにしているから", "Java が日本語を特別扱いするから", "Checkstyle が日本語を読めないから", "テストは検査対象外だから"],
      explain: "テストの名前は仕様を語るので、読みやすさを優先している。", see: "s4" },
    { q: "ArchUnit が守っているものは？",
      choices: ["層の依存の向きや循環などの構造", "書式", "import の順番", "教材のリンク"],
      explain: "設計図をテストにしたもの（第 10 章）。", see: "s5" },
    { q: "LearningLinksTest が守っているものは？",
      choices: ["教材からコードへのリンクが実在し、行番号が最新であること", "API の応答", "DB の中身", "書式"],
      explain: "文書が黙って古くなるのを止める。", see: "s5" },
    { q: "機械に任せにくく、人が見るべきことは？",
      choices: ["設計判断が妥当か、仕様（契約）と合っているか", "インデント", "import の順番", "層の依存の向き"],
      explain: "機械に任せられることを任せるほど、人は判断に時間を使える。", see: "s6" },
    { q: "CLAUDE.md で、検証について禁じていることは？",
      choices: ["コードを読むだけで合格を出すこと", "テストを書くこと", "実際に動かすこと", "検証不能と書くこと"],
      explain: "実際に動かす。できなかった検証は「検証不能」と正直に書く。", see: "s6" },
    { q: "Dockerfile の jar 作成でテストや検査をスキップしてよい理由は？",
      choices: ["検査は CI の責務で、CI で verify が通ったものだけがデプロイされるから", "Docker ではテストが動かないから", "速ければ何でもよいから", "Docker が自動で検査するから"],
      explain: "責務を分けている（第 22・23 章）。", see: "s2" },
    { q: "AI が「テストが通らないので ArchUnit のルールを緩めました」と言ってきた。どうする？",
      choices: ["差し戻し、ルールを守る形でコードを直させる", "受け入れる", "ArchUnit ごと消す", "ルールをさらに緩める"],
      explain: "ガードレールを外すのは、設計の約束を捨てること。", see: "s1" },
    { q: "レビューで同じ指摘を何度もしている。次に考えるべきことは？",
      choices: ["その指摘を機械のルール（Checkstyle・ArchUnit・テスト）にできないか", "レビューをやめる", "指摘を減らす", "ドキュメントに書くだけにする"],
      explain: "繰り返す指摘はガードレールの候補。", see: "s6" },
    { q: "AI 駆動開発でのガードレールの使い方として最も適切なのは？",
      choices: ["AI に verify を回させ、赤ならその出力を読んで直させる。人は緑になってからレビューする", "AI には verify を使わせない", "人が先に全部読む", "ガードレールは AI には効かない"],
      explain: "機械の失敗メッセージは、AI にとっても直し方の手がかり。", see: "s1" }
  ]
});
