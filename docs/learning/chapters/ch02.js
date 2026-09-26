// 第 2 章 Spring Boot の役割と DI（書き方は AUTHORING.md）
Calc.register({
  no: 2,
  goal: [
    "フレームワーク（Spring Boot）が何を肩代わりし、自分たちは何を書いているのかを区別できる",
    "アプリが起動するとき何が起きるか（部品を集めて組み立て、窓口を開く）を説明できる",
    "DI（依存性の注入）とは何か、なぜそれが「差し替え」と「見通しのよさ」を生むのかを説明できる",
    "pom.xml（部品表）と application.yml（設定）の役割の違いが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "フレームワーク：自分で書く部分と、肩代わりしてもらう部分",
      body: `
<p>API を全部自分で書くと何千行にもなるが、その大部分は<b>どの API でも同じ作業</b>。
<b>Spring Boot</b> はそれを肩代わりする<b>フレームワーク</b>（土台）で、私たちは<b>このアプリ固有の部分だけ</b>を書く。</p>
${Fig.stack([
  { t: "✍️ 私たち", d: "何を計算し、何を保存し、どのステータスで返すか（このリポジトリの約 15 クラス）", tone: "accent" },
  { t: "Spring MVC", d: "URL とメソッドを見て、担当のメソッドに振り分ける", tone: "dim" },
  { t: "Jackson", d: "JSON ⇔ Java の型の変換", tone: "dim" },
  { t: "Bean Validation", d: "入力のチェック（必須項目など）", tone: "dim" },
  { t: "Spring Data JPA / Hibernate", d: "DB への接続、SQL の組み立て", tone: "dim" },
  { t: "Tomcat", d: "8080 番で HTTP を待ち受ける", tone: "dim" }
], "氷山の一角：私たちが書くのは上の 1 段だけ。下はすべて Spring Boot が連れてくる部品")}
<p>AI が書くのも主に一番上の段。<b>土台が何をしてくれるかを知っていると、AI の書いたコードの「どこが固有の判断か」が見える</b>。</p>`,
      refs: [
        code("pom.xml", "spring-boot-starter-webmvc", "HTTP の受け付け・振り分け・JSON 変換をまとめて連れてくる部品"),
        code("pom.xml", "spring-boot-starter-data-jpa", "DB 接続と SQL の組み立てをまとめて連れてくる部品")
      ],
      checks: [
        { q: "src/main/java の下にある自分たちのクラスは、いくつのフォルダ（パッケージ）に分かれている？ 名前は？",
          a: "calculation（計算の機能そのもの）、common（機能をまたぐ共通処理＝例外）、config（設定）の 3 つ＋起動クラス。「機能ごとにまとめる」配置（package-by-feature）で、第 10 章で詳しく扱う。" }
      ]
    },
    {
      id: "s2",
      title: "起動の入り口：部品を集めて、組み立てて、窓口を開く",
      body: `
${Fig.code([
  { c: "@SpringBootApplication", tag: "ここが起点", tone: "accent" },
  { c: "public class CalcApiApplication {" },
  { c: "  public static void main(String[] args) {" },
  { c: "    SpringApplication.run(CalcApiApplication.class, args);", tag: "起動の 1 行", tone: "ok" },
  { c: "  }" },
  { c: "}" }
], "アプリ全体の入り口。これだけで下の 5 段階が全部走る")}
${Fig.timeline([
  { t: "見て回る", d: "com.example.calc の下を探し、@RestController / @Service / @Repository などの付箋が付いたクラスを集める", tone: "accent" },
  { t: "部品を作る", d: "集めたクラスのオブジェクト（Bean ＝ 部品）を作る", tone: "accent" },
  { t: "部品をつなぐ", d: "Controller に Service を、Service に Repository を渡す ← DI（2.3 節）", tone: "lec" },
  { t: "自動設定", d: "pom.xml に入っている部品を見て、DB 接続などを準備する ← 2.5 節", tone: "warn" },
  { t: "窓口を開く", d: "8080 番で HTTP の待ち受けを始める。ログに「Tomcat started on port 8080」", tone: "ok" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/CalcApiApplication.java", "@SpringBootApplication", "「ここから下のパッケージを見て回れ」という起点の印"),
        code("src/main/java/com/example/calc/CalcApiApplication.java", "SpringApplication.run(", "起動の 1 行")
      ],
      checks: [
        { q: "CalcApiApplication の javadoc（上のコメント）を読み、自動で見て回る範囲がどこだと書いてあるか確認しよう。",
          a: "@SpringBootApplication が付いたクラスのパッケージ（com.example.calc）とその下。だから calculation / config / common の部品が拾われる。この外に置いたクラスは見つけてもらえない。" }
      ]
    },
    {
      id: "s3",
      title: "DI：部品は自分で作らず、渡してもらう",
      body: `
${Fig.compare(
  { t: "❌ 自分で作る（このリポジトリではやらない）", tone: "err",
    html: "<pre>class CalculationController {\n  service = new CalculationService(\n    new ...Repository(new DB接続(...)));\n}</pre>使う側が、部品の作り方まで全部知っている" },
  { t: "✅ 渡してもらう（DI）", tone: "ok",
    html: "<pre>class CalculationController {\n  CalculationController(\n      CalculationService service) {\n    this.service = service;\n  }\n}</pre>必要な部品を引数に書くだけ。作って渡すのは Spring" }
)}
${Fig.flow([
  { ic: "⚙️", t: "Repository の実装", s: "Spring Data JPA が<br>起動時に自動生成", tone: "dim" },
  { ic: "🧮", t: "CalculationService", s: "コンストラクタで<br>Repository を受け取る", tone: "accent" },
  { ic: "🚪", t: "CalculationController", s: "コンストラクタで<br>Service を受け取る", tone: "accent" }
], ["渡す", "渡す"], { caption: "Spring が部品を作り、必要な相手に渡してつなぐ。これが DI（Dependency Injection：依存性の注入）" })}
<p>Repository は <code>interface</code>（中身の無い「できることの一覧」）しか書いていない。中身は Spring Data JPA が作る。</p>`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "CalculationController(CalculationService service)", "Controller は Service を「受け取る」だけ"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "CalculationService(CalculationRepository repository)", "Service は Repository を「受け取る」だけ"),
        code("src/main/java/com/example/calc/calculation/CalculationRepository.java", "public interface CalculationRepository extends JpaRepository", "Repository は interface だけ。実装は Spring が作る")
      ],
      checks: [
        { q: "CalculationController と CalculationService のコンストラクタの引数を見比べよう。Controller は Repository を受け取っている？",
          a: "受け取っていない。Controller が受け取るのは Service だけ。コンストラクタの引数を見れば「このクラスが何に依存しているか」が一目で分かる。依存の向き（Controller → Service → Repository）は第 10 章で扱う。" }
      ]
    },
    {
      id: "s4",
      title: "DI の価値：差し替えられる、見通せる",
      body: `
${Fig.compare(
  { t: "🏭 本番", tone: "accent", html: Fig.flow([
    { t: "CalculationService", tone: "accent" },
    { t: "本物の Repository", s: "Spring Data が生成" },
    { ic: "🗄️", t: "PostgreSQL", tone: "dim" }
  ], ["使う", "SQL"], { dir: "v" }) },
  { t: "🧪 テスト", tone: "ok", html: Fig.flow([
    { t: "CalculationService", tone: "accent" },
    { ic: "🎭", t: "偽物の Repository", s: "mock(...) で作る", tone: "ok" },
    { ic: "🚫", t: "DB は要らない", tone: "dim", faded: true }
  ], ["使う", ""], { dir: "v" }) },
  "同じ Service に、本番では本物を、テストでは偽物を渡す。コンストラクタで受け取る形だからできる"
)}
${Fig.cards([
  { ic: "🔁", t: "差し替えられる", d: "偽物を渡せば、DB なしで計算ロジックだけを速く確かめられる（Service のテスト）。HTTP だけ見たいときは Service を偽物に（Controller のテスト）", tone: "ok" },
  { ic: "🔍", t: "見通せる", d: "依存がコンストラクタに全部並ぶ。人間も AI も「このクラスが何を使っているか」を一目で確認できる", tone: "accent" }
])}`,
      refs: [
        code("src/test/java/com/example/calc/calculation/CalculationServiceTest.java", "mock(CalculationRepository.class)", "Repository の偽物を作り、Service に渡している"),
        code("src/test/java/com/example/calc/calculation/CalculationControllerTest.java", "@MockitoBean CalculationService service", "Controller のテストでは Service を偽物に差し替えている")
      ],
      checks: [
        { q: "CalculationServiceTest の、mock(...) の次の行を見よう。偽物の Repository をどうやって Service に渡している？",
          a: "new CalculationService(repository)。本番では Spring が本物を渡すところを、テストでは自分で偽物を渡している。コンストラクタで受け取る形だからこそできる。" }
      ]
    },
    {
      id: "s5",
      title: "自動設定と application.yml：決まりごとは任せ、違いだけ書く",
      body: `
<p>Spring Boot は、<code>pom.xml</code> に入っている部品を見て<b>よくある設定を自動で済ませる</b>（自動設定）。
違うことをしたいときだけ <code>application.yml</code> に書く。環境ごとの切り替えは<b>プロファイル</b>で行う。</p>
${Fig.cards([
  { ic: "💻", t: "local（既定）", d: "手元の開発<br>→ Docker の PostgreSQL（compose.yaml）", tone: "accent" },
  { ic: "☁️", t: "prod", d: "本番（Render）<br>→ 環境変数で渡された PostgreSQL", tone: "lec" },
  { ic: "🧪", t: "test", d: "自動テスト<br>→ H2（メモリ上の DB。Docker 不要）", tone: "ok" }
], "同じコードのまま、プロファイル（設定）だけで接続先が変わる")}
<p>local では、DB の接続情報を <b>1 行も書いていない</b>のにつながる。仕組みはこう。</p>
${Fig.flow([
  { ic: "📄", t: "compose.yaml", s: "PostgreSQL の起動方法と<br>ユーザー・パスワード", tone: "dim" },
  { ic: "🔌", t: "spring-boot-docker-compose", s: "起動して<br>接続情報を読む", tone: "warn" },
  { ic: "☕", t: "Spring", s: "その情報で<br>DB につなぐ", tone: "accent" }
], ["読む", "接続情報を渡す"], { caption: "接続情報が compose.yaml の 1 か所にしか無い。2 か所に書くとずれる（第 14 章で詳しく）" })}`,
      refs: [
        code("src/main/resources/application.yml", "default: local", "何も指定しなければ local プロファイルになる"),
        code("src/main/resources/application.yml", "compose.yaml を読んで自動で流し込む", "local では接続情報を書かなくても、compose.yaml から自動で渡される"),
        code("src/test/resources/application-test.yml", "jdbc:h2:mem:calc-test", "テストの時だけ H2 に切り替わる")
      ],
      checks: [
        { q: "application.yml の local の部分に、DB の URL・ユーザー・パスワードは書いてある？ 書いていないならなぜ DB につながる？",
          a: "書いていない。spring-boot-docker-compose という部品が compose.yaml を読み、起動した PostgreSQL の接続情報を自動で Spring に渡すから。「接続情報が 2 か所にある」状態を避けている。" }
      ]
    },
    {
      id: "s6",
      title: "Maven と pom.xml：部品表とビルドの手順",
      body: `
${Fig.cards([
  { ic: "📋", t: "parent", d: "spring-boot-starter-parent。部品同士の相性のよいバージョンをまとめて決めてくれる", tone: "lec" },
  { ic: "📦", t: "starter", d: "「Web をやるならこの一式」の詰め合わせ。webmvc ＝ Tomcat ＋ Spring MVC ＋ Jackson", tone: "accent" },
  { ic: "🏷️", t: "scope", d: "test ＝ テストの時だけ／runtime ＝ 実行時だけ。H2 は test なので本番に入らない", tone: "warn" }
], "pom.xml ＝ 部品表。application.yml（実行時の設定）とは役割が違う")}
${Fig.flow([
  { ic: "📏", t: "規約チェック", s: "Checkstyle" },
  { ic: "🔨", t: "コンパイル" },
  { ic: "🧪", t: "テスト", s: "64 件" },
  { ic: "📦", t: "jar", s: "実行ファイル", tone: "ok" },
  { ic: "🎨", t: "書式チェック", s: "Spotless" }
], ["", "", "", ""], { compact: true, caption: "./mvnw verify 1 回でこの順に全部走る（第 21 章）。部品は最初にインターネットから集める。mvnw は Maven を入れていない PC でも同じ版の Maven を使うための起動スクリプト" })}`,
      refs: [
        code("pom.xml", "spring-boot-starter-parent", "バージョンをまとめて管理する親"),
        code("pom.xml", "<scope>test</scope>", "テストの時だけ使う部品の印（最初の 1 つ）")
      ],
      checks: [
        { q: "pom.xml で H2（com.h2database）の scope は何になっている？ それはなぜ？",
          a: "test。H2 は自動テストでだけ使う DB なので、本番の jar には入れない。本番は PostgreSQL（runtime）を使う。" }
      ]
    }
  ],
  observe: {
    intro: "<p>起動時に Spring が何をしているかを、ログで観察する。</p>",
    steps: [
      { do: "<code>./mvnw spring-boot:run</code> で起動し、最後の数行を見る。" + Fig.term([
          "… HikariPool-1 - Start completed.",
          "… Tomcat started on port 8080 (http) with context path '/'",
          "… Started CalcApiApplication in 4.2 seconds"
        ]),
        expect: "2.2 節の図の「自動設定（DB 接続の準備 ＝ HikariPool）」と「窓口を開く（Tomcat started）」のログが出る" },
      { do: "起動ログの中から「Hikari」や「PostgreSQL」を含む行を探す。",
        expect: "HikariPool（DB 接続の準備）が動いている。自分では接続のコードを 1 行も書いていないのに、自動設定で準備されている" },
      { do: "<code>./mvnw verify</code> を実行する（Docker は不要）。",
        expect: "最後に BUILD SUCCESS。テストでは H2 に切り替わるので Docker が無くても通る（2.5 節のプロファイル）" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "📦", t: "pom.xml の差分を見る", d: "AI は問題を解くために依存を気軽に足す。本当に要るか、scope は正しいか", tone: "warn" },
  { ic: "🔗", t: "コンストラクタを見る", d: "Controller が Repository を受け取っていたら、層を飛び越えている（第 10 章。ArchUnit でも止まる）", tone: "err" },
  { ic: "🧹", t: "手書きの設定を疑う", d: "自動設定でできることを手で書いていないか。手で書いた設定は、あとで誰も理由が分からなくなる", tone: "lec" }
], "設定や組み立ては AI が最も速く書ける部分。だからこそ人間は「何が増えたか」を見る")}`,
  questions: [
    { q: "Spring Boot（フレームワーク）を使う最大の理由として適切なものは？",
      choices: ["どの API でも同じ作業（HTTP の受け付け・JSON 変換・DB 接続など）を肩代わりしてもらい、固有の部分だけ書くため", "プログラムを必ず速くするため", "データベースを不要にするため", "画面のデザインを自動で作るため"],
      explain: "フレームワークは「どこでも同じ作業」の土台。私たちは計算・保存・返し方といった固有の判断だけを書く。", see: "s1" },
    { q: "次のうち、このリポジトリで「私たちが書いている」のはどれ？",
      choices: ["0 で割ったら 422 にする、という判断", "8080 番で HTTP を待ち受ける処理", "JSON の文字列を Java の型に変換する処理", "DB との接続を確立する処理"],
      explain: "待ち受け・JSON 変換・DB 接続は Spring とライブラリの仕事。何を業務ルールとし、どう返すかが私たちの仕事。", see: "s1" },
    { q: "アプリの起動時、Spring が @RestController や @Service の付いたクラスを探す範囲は？",
      choices: ["@SpringBootApplication が付いたクラスのパッケージとその下", "PC のすべてのフォルダ", "pom.xml に列挙したクラスだけ", "application.yml に書いたクラスだけ"],
      explain: "起点のパッケージ（com.example.calc）以下を見て回る。外に置いたクラスは見つけてもらえない。", see: "s2" },
    { q: "起動時に Spring がやることとして誤っているものは？",
      choices: ["リクエストの計算結果を事前に全部計算しておく", "付箋（アノテーション）の付いたクラスを集める", "部品同士をつなぐ", "8080 番で待ち受けを始める"],
      explain: "起動時は「部品を集める → 作る → つなぐ → 自動設定 → 待ち受け」。計算はリクエストが来てから。", see: "s2" },
    { q: "DI（依存性の注入）の説明として正しいものは？",
      choices: ["使う部品を自分で new せず、コンストラクタなどで外から渡してもらうこと", "データベースにデータを注入すること", "アノテーションを自動で追加すること", "テストデータを自動生成すること"],
      explain: "必要な部品を引数に書くだけにして、作って渡すのは Spring に任せる。", see: "s3" },
    { q: "CalculationRepository は interface で、実装クラスを書いていない。それでも動くのはなぜ？",
      choices: ["Spring Data JPA が起動時に実装を自動で作って渡すから", "Java が interface を自動で実行するから", "Service の中に SQL を書いているから", "テストの時しか使わないから"],
      explain: "JpaRepository を継承した interface を宣言すると、Spring Data が SQL を発行する実装を自動生成する。", see: "s3" },
    { q: "あるクラスが何に依存しているかを最も手早く確認できる場所は？（このリポジトリの書き方の場合）",
      choices: ["コンストラクタの引数", "クラス名", "ファイルの行数", "import 文の数"],
      explain: "DI では依存がコンストラクタに全部並ぶ。人間も AI も一目で確認できるのが利点。", see: "s4" },
    { q: "Service の単体テストで DB を用意しなくてよいのはなぜ？",
      choices: ["Repository を偽物（モック）にして、コンストラクタで渡しているから", "Service は DB を使わないから", "テストでは Java が DB を自動で無視するから", "H2 を使っているから"],
      explain: "コンストラクタで受け取る形なので、本物の代わりに偽物を渡せる。計算ロジックだけを速く確かめられる。", see: "s4" },
    { q: "Controller のテストで Service を @MockitoBean（偽物）にする目的は？",
      choices: ["計算や DB を動かさず、HTTP としての振る舞いだけを確かめるため", "Service のバグを見つけるため", "テストを遅くして負荷を確かめるため", "Service を本番から削除するため"],
      explain: "Controller のテストで見るのはステータス・ヘッダ・JSON の形。計算の正しさは Service のテストが見る。", see: "s4" },
    { q: "Spring Boot の「自動設定」とは？",
      choices: ["pom.xml に入った部品を見て、よくある設定を自動で済ませる仕組み", "コードを自動で書く仕組み", "テストを自動で書く仕組み", "バージョンアップを自動で行う仕組み"],
      explain: "部品があれば、DB 接続などの定番の準備を自動で行う。違うことをしたいときだけ application.yml に書く。", see: "s5" },
    { q: "テストの時だけ DB が H2 に切り替わる仕組みは？",
      choices: ["test プロファイル用の設定（application-test.yml）で接続先を変えている", "テスト用にコードを書き換えている", "H2 と PostgreSQL を同時に使っている", "Docker が自動で H2 に変えている"],
      explain: "プロファイルで設定だけを切り替える。コードは同じまま。", see: "s5" },
    { q: "local プロファイルで、DB の接続情報を application.yml に書かなくてもつながる理由は？",
      choices: ["spring-boot-docker-compose が compose.yaml を読み、接続情報を自動で渡すから", "PostgreSQL はパスワードが不要だから", "H2 に自動で切り替わるから", "Spring Boot が DB を自分で作るから"],
      explain: "compose.yaml に書いた情報をそのまま使う。接続情報が 2 か所に分かれない。", see: "s5" },
    { q: "pom.xml の役割として正しいものは？",
      choices: ["使う部品（ライブラリ）の一覧と、ビルドの手順の指示書", "API の URL の一覧", "DB のテーブル定義", "アプリの起動時の設定値（ポート番号など）"],
      explain: "pom.xml は部品表とビルド手順。実行時の設定値は application.yml。", see: "s6" },
    { q: "spring-boot-starter-parent を親にしている主な利点は？",
      choices: ["部品同士の相性のよいバージョンをまとめて決めてくれる", "アプリが速くなる", "テストが不要になる", "Docker が不要になる"],
      explain: "個々の部品のバージョンを自分で合わせなくてよい。", see: "s6" },
    { q: "H2 の scope が test になっている意味は？",
      choices: ["自動テストの時だけ使い、本番の jar には入れない", "テスト中の部品なので本番では使えない", "テストが失敗したときだけ使う", "テスト環境の PC にだけインストールする"],
      explain: "scope は「いつ使う部品か」。test ならテストの時だけ。", see: "s6" },
    { q: "AI が変更を出してきた。pom.xml に見慣れない依存が 3 つ増えている。人間がまずすべきことは？",
      choices: ["本当に必要か、scope が正しいかを確かめる", "テストが通っていれば何もしない", "すべて削除する", "バージョンを最新にする"],
      explain: "AI は問題を解くために依存を気軽に足す。依存は保守・セキュリティの負担になるので、人間が必要性を判断する。", see: "s6" },
    { q: "AI が書いた Controller のコンストラクタに CalculationRepository が引数として増えていた。何を疑う？",
      choices: ["Controller が Service を飛び越えて Repository を直接使っている（層の飛び越し）", "テストが増えたので問題ない", "DI が正しく使われていて良い変更", "Repository の名前が長すぎる"],
      explain: "コンストラクタは依存の一覧。Controller → Service → Repository の順を飛び越えている兆候。第 10 章の ArchUnit でも止まる。", see: "s3" }
  ]
});
