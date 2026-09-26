// 第 14 章 DB のつなぎ方の基本（書き方は AUTHORING.md）
Calc.register({
  no: 14,
  goal: [
    "アプリと DB が別のプログラムで、ネットワーク越しに話していることを説明できる",
    "接続に必要な情報（JDBC URL・ユーザー・パスワード）と、ドライバの役割が分かる",
    "コネクションプールがなぜ必要かを説明できる",
    "環境（手元・テスト・本番）ごとに接続先を切り替える仕組みと、秘密情報の扱いが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "アプリと DB は別のプログラム",
      body: `
${Fig.flow([
  { ic: "☕", t: "このアプリ", s: "Repository → Hibernate", tone: "accent" },
  { ic: "🔌", t: "JDBC ドライバ", s: "Java の共通の呼び方を<br>PostgreSQL の言葉に翻訳", tone: "lec" },
  { ic: "🐘", t: "PostgreSQL", s: "別のプログラム<br>（Docker のコンテナ）", tone: "ok" }
], ["JDBC（Java 共通の窓口）", "ネットワーク（5432 番）"], { caption: "DB はアプリの中にあるのではない。ネットワーク越しに、決まった手順で会話している" })}
${Fig.cards([
  { ic: "📏", t: "JDBC", d: "Java から DB を使うための共通の約束。どの DB でも同じ呼び方", tone: "accent" },
  { ic: "🔌", t: "ドライバ", d: "JDBC の呼び出しを、各 DB 固有の通信に翻訳する部品。PostgreSQL 用・H2 用がある", tone: "lec" },
  { ic: "🏷️", t: "scope は runtime", d: "アプリのコードからドライバを直接使わない。実行時にだけあればよい", tone: "dim" }
])}`,
      refs: [
        code("pom.xml", "<artifactId>postgresql</artifactId>", "PostgreSQL の JDBC ドライバ（runtime）")
      ],
      checks: [
        { q: "pom.xml の postgresql ドライバの直前のコメントを読もう。「アプリコードから org.postgresql.* を直接書いたら」何が漏れていると書いてある？",
          a: "DB 依存が漏れている。アプリのコードが特定の DB に縛られないよう、ドライバは実行時だけ使う（runtime スコープ）。" }
      ]
    },
    {
      id: "s2",
      title: "接続に必要な情報",
      body: `
${Fig.http("JDBC URL の分解（本番の設定）", [
  { k: "種類", v: "jdbc:postgresql://", n: "JDBC で、PostgreSQL のドライバを使う", tone: "lec" },
  { k: "ホスト", v: "${DB_HOST}", n: "DB が動いているマシン", tone: "accent" },
  { k: "ポート", v: ":${DB_PORT}", n: "PostgreSQL の窓口（既定は 5432）", tone: "ok" },
  { k: "DB 名", v: "/${DB_NAME}", n: "1 つのサーバーの中の、どのデータベースか", tone: "warn" }
], "${…} は「環境変数の値」。URL のほかに username と password が要る")}
${Fig.code([
  { c: "spring:" },
  { c: "  datasource:" },
  { c: "    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}", tag: "どこへ", tone: "accent" },
  { c: "    username: ${DB_USER}", tag: "誰として", tone: "ok" },
  { c: "    password: ${DB_PASSWORD}", tag: "合言葉", tone: "err" }
], "application.yml の prod の部分。値そのものはリポジトリに書かない")}`,
      refs: [
        code("src/main/resources/application.yml", "url: jdbc:postgresql://", "本番の接続先（環境変数から）"),
        code("src/main/resources/application.yml", "password: ${DB_PASSWORD}", "パスワードも環境変数から")
      ],
      checks: [
        { q: "prod の設定のコメントに、環境変数 DB_HOST が未設定だったらどうなると書いてある？ それは良いこと？",
          a: "起動時に落ちる。良いこと：設定漏れのまま動き出すより、すぐ気づける（事故に気づける）。" }
      ]
    },
    {
      id: "s3",
      title: "コネクションプール：接続を使い回す",
      body: `
${Fig.compare(
  { t: "❌ 毎回つなぐ", tone: "err", html: Fig.flow([
    { t: "リクエスト" }, { t: "接続を開く（遅い）", tone: "err" }, { t: "SQL" }, { t: "接続を閉じる", tone: "err" }
  ], ["", "", ""], { dir: "v" }) + "接続を開くのは、認証などで時間がかかる" },
  { t: "✅ プールから借りる（HikariCP）", tone: "ok", html: Fig.flow([
    { t: "リクエスト" }, { t: "プールから借りる（速い）", tone: "ok" }, { t: "SQL" }, { t: "プールに返す", tone: "ok" }
  ], ["", "", ""], { dir: "v" }) + "起動時に何本か開いておき、使い回す" }
)}
${Fig.cards([
  { ic: "🏊", t: "HikariCP", d: "Spring Boot の既定のコネクションプール。data-jpa の starter に含まれ、設定しなくても動く", tone: "accent" },
  { ic: "🔢", t: "本数には上限がある", d: "同時に使える接続の数は有限。長く握る処理（open-in-view など、第 12 章）があると、ほかの要求が待たされる", tone: "warn" }
], "起動ログの「HikariPool-1 - Start completed.」は、このプールが準備できた合図（第 2 章）")}`,
      refs: [
        code("pom.xml", "HikariCP", "data-jpa の starter が連れてくる部品の説明（コメント）")
      ],
      checks: [
        { q: "第 12 章で open-in-view を false にした理由のうち、コネクションプールと関係するものは何？",
          a: "true だと Controller や JSON の組み立て中も接続を握り続け、プールの接続を長く占有する。false なら Service を抜けたら返せる。" }
      ]
    },
    {
      id: "s4",
      title: "環境ごとの接続先と、秘密情報の扱い",
      body: `
${Fig.matrix("環境", ["DB", "接続情報の出どころ"], [
  { h: "💻 local（手元）", c: [{ v: "PostgreSQL（Docker）", tone: "accent" }, "compose.yaml の値を spring-boot-docker-compose が自動で渡す"] },
  { h: "🧪 test（自動テスト）", c: [{ v: "H2（メモリ上）", tone: "ok" }, "application-test.yml に直接書く（捨てる DB なので秘密ではない）"] },
  { h: "☁️ prod（Render）", c: [{ v: "PostgreSQL（Render）", tone: "lec" }, "render.yaml の fromDatabase → 環境変数 → application.yml の ${…}"] }
], "同じコードのまま、接続先だけが変わる（第 2 章のプロファイル）")}
${Fig.flow([
  { ic: "🗄️", t: "Render が DB を作る", s: "パスワードも Render が決める", tone: "lec" },
  { ic: "🔐", t: "fromDatabase", s: "実行時に環境変数として注入", tone: "warn" },
  { ic: "☕", t: "application.yml", s: "${DB_PASSWORD} で読む", tone: "accent" }
], ["", ""], { caption: "本番のパスワードはリポジトリのどこにも無い。コードを見られても DB は開かない" })}`,
      refs: [
        code("compose.yaml", "POSTGRES_PASSWORD: calc", "手元用のパスワード（手元専用なので書いてよい）"),
        code("src/test/resources/application-test.yml", "jdbc:h2:mem:calc-test", "テストは H2"),
        code("render.yaml", "fromDatabase:", "本番の接続情報は Render が注入する")
      ],
      checks: [
        { q: "compose.yaml にはパスワード（calc）が書いてあるのに、なぜ問題にならない？ 本番と何が違う？",
          a: "手元の Docker の中だけで使う使い捨ての DB で、外から守るべきデータが無いから。本番は実データを持つので、パスワードをリポジトリに置かず Render が注入する。" }
      ]
    },
    {
      id: "s5",
      title: "DB は起動している？：2 つのヘルスチェック",
      body: `
${Fig.compare(
  { t: "🐘 compose.yaml の healthcheck", tone: "lec", html: "<code>pg_isready</code> で「DB が受け付けられるか」を 5 秒ごとに確認。<br>Spring は DB が準備できてから接続する" },
  { t: "☕ /actuator/health", tone: "accent", html: "アプリの健康状態。<b>DB に接続できるかも含む</b>（DB が落ちていれば DOWN）。<br>Render はこれが UP になるまで利用者を向けない" }
)}
${Fig.flow([
  { ic: "☁️", t: "Render", s: "healthCheckPath", tone: "lec" },
  { ic: "☕", t: "/actuator/health", s: "DB にも確認する", tone: "accent" },
  { ic: "🐘", t: "DB", s: "つながる？", tone: "ok" }
], ["確認", "確認"], { caption: "詳細（どの部品が落ちたか）は外に見せない設定（show-details: never。第 19・24 章）" })}`,
      refs: [
        code("compose.yaml", "healthcheck:", "DB が受け付け可能かの確認"),
        code("src/main/resources/application.yml", "DB を持つと health に db の状態が含まれる", "health が DB も見る"),
        code("render.yaml", "healthCheckPath: /actuator/health", "本番の生存確認")
      ],
      checks: [
        { q: "compose.yaml の volumes の設定は何のため？ docker compose down -v とすると何が起きる？",
          a: "名前付きボリューム（calc-pgdata）にデータを置き、コンテナを作り直してもデータが残るようにするため。-v を付けるとボリュームも消え、DB がまっさらになる。" }
      ]
    }
  ],
  observe: {
    intro: "<p>Docker を起動した状態で、アプリの起動からつなぎ方を観察する。</p>",
    steps: [
      { do: "<code>./mvnw spring-boot:run</code> の起動ログで「compose」「Hikari」を含む行を探す。",
        expect: "compose.yaml を見つけて PostgreSQL のコンテナを起動し、HikariPool が接続を準備している" },
      { do: "<code>docker compose ps</code>", expect: "postgres のコンテナが healthy で動いている" },
      { do: "<code>curl -s http://localhost:8080/actuator/health</code>", expect: '"status":"UP"（ほかに groups として liveness・readiness が並ぶ）' },
      { do: "アプリを動かしたまま <code>docker compose stop postgres</code> してから、もう一度 health を見る。最後に <code>docker compose start postgres</code>。",
        expect: "DB を止めると DOWN（503）になる。health が DB も見ている" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🔐", t: "秘密情報を書かせない", d: "AI は動かすために application.yml にパスワードを直書きしがち。環境変数で受ける形にさせる", tone: "err" },
  { ic: "🧭", t: "どの環境の話かを明示", d: "「DB につながらない」を相談するとき、local / test / prod のどれかを伝える。接続情報の出どころが全部違う", tone: "accent" },
  { ic: "🔌", t: "ドライバの直接利用を疑う", d: "アプリのコードに org.postgresql.* が出てきたら、DB 依存が漏れている", tone: "warn" }
])}`,
  questions: [
    { q: "アプリと DB の関係として正しいものは？",
      choices: ["別のプログラムで、ネットワーク越しに決まった手順で会話している", "DB はアプリの中の一部", "DB はファイルとしてアプリに埋め込まれている", "アプリが起動すると DB も自動でアプリの中に作られる"],
      explain: "PostgreSQL は別のプログラム（手元では Docker のコンテナ）。", see: "s1" },
    { q: "JDBC ドライバの役割は？",
      choices: ["Java の共通の呼び方（JDBC）を、各 DB 固有の通信に翻訳する", "SQL を自動で書く", "JSON を変換する", "テーブルを設計する"],
      explain: "PostgreSQL 用・H2 用とドライバを替えれば、同じ呼び方で違う DB を使える。", see: "s1" },
    { q: "PostgreSQL のドライバの scope が runtime になっている意味は？",
      choices: ["アプリのコードからは直接使わず、実行時にだけあればよい", "テストの時だけ使う", "本番では使わない", "コンパイル時だけ使う"],
      explain: "コードが特定の DB に縛られないようにしている。", see: "s1" },
    { q: "JDBC URL「jdbc:postgresql://db.example:5432/calc」の calc は？",
      choices: ["DB サーバーの中の、どのデータベースか", "ユーザー名", "テーブル名", "パスワード"],
      explain: "ホスト・ポートのあとがデータベース名。", see: "s2" },
    { q: "application.yml の ${DB_HOST} という書き方の意味は？",
      choices: ["環境変数 DB_HOST の値を使う", "DB_HOST という文字列そのもの", "コメント", "既定値"],
      explain: "値そのものをリポジトリに書かず、実行環境から受け取る。", see: "s2" },
    { q: "prod で環境変数 DB_HOST が未設定のとき起動時に落ちるのは、なぜ良いこと？",
      choices: ["設定漏れのまま動き出すより、すぐ気づけるから", "速く起動するから", "セキュリティのため必ず落とす決まりだから", "良いことではない"],
      explain: "壊れた状態で動き続ける方が危ない。", see: "s2" },
    { q: "コネクションプールを使う理由は？",
      choices: ["接続を開くのは時間がかかるので、開いておいた接続を使い回すため", "SQL を速くするため", "データを暗号化するため", "DB を複数にするため"],
      explain: "リクエストのたびに開いて閉じると遅い。", see: "s3" },
    { q: "Spring Boot の既定のコネクションプールは？",
      choices: ["HikariCP", "Tomcat", "Jackson", "Hibernate"],
      explain: "data-jpa の starter に含まれ、設定しなくても動く。", see: "s3" },
    { q: "コネクションプールの接続を長く握る処理があると、何が起きる？",
      choices: ["同時に使える接続の数には上限があるので、ほかの要求が待たされる", "DB が速くなる", "接続が増え続ける", "何も起きない"],
      explain: "open-in-view を切った理由の 1 つ（第 12 章）。", see: "s3" },
    { q: "local（手元）で、DB の接続情報が application.yml に無いのにつながる理由は？",
      choices: ["spring-boot-docker-compose が compose.yaml の値を自動で渡すから", "H2 を使っているから", "Spring Boot が推測するから", "PostgreSQL は接続情報が不要だから"],
      explain: "接続情報が compose.yaml の 1 か所にまとまる。", see: "s4" },
    { q: "本番（Render）の DB パスワードはどこにある？",
      choices: ["リポジトリには無い。Render が作り、実行時に環境変数として注入する", "application.yml", "render.yaml", "compose.yaml"],
      explain: "render.yaml の fromDatabase で注入。コードを見られても DB は開かない。", see: "s4" },
    { q: "compose.yaml にパスワードが書いてあっても問題にならない理由は？",
      choices: ["手元の使い捨ての DB で、守るべき実データが無いから", "暗号化されているから", "Docker が隠すから", "問題になる"],
      explain: "本番の秘密情報とは扱いを分ける。", see: "s4" },
    { q: "テストで H2 を使っている利点は？",
      choices: ["Docker を起動しなくても ./mvnw verify が通り、CI も速い", "PostgreSQL と完全に同じ動きをする", "本番でも使える", "SQL が不要"],
      explain: "ただし DB 固有の機能を使い始めたら、本物の PostgreSQL でテストすべき（第 20 章）。", see: "s4" },
    { q: "/actuator/health が DB も確認していることの意味は？",
      choices: ["DB に接続できなければ DOWN になり、Render は利用者を向けない", "DB のデータを表示する", "DB を自動で修復する", "DB を起動する"],
      explain: "アプリだけ動いていても、DB が落ちていれば使えない。", see: "s5" },
    { q: "compose.yaml の healthcheck（pg_isready）の役割は？",
      choices: ["DB が受け付け可能になったかを確認し、Spring が準備できてから接続できるようにする", "アプリの健康状態を見る", "データをバックアップする", "パスワードを確認する"],
      explain: "/actuator/health とは別物。こちらは DB 側の準備の確認。", see: "s5" },
    { q: "AI が「つながらないので application.yml にパスワードを直接書きました」と言ってきた。どうする？",
      choices: ["環境変数（${DB_PASSWORD}）で受ける形に戻させ、秘密情報をリポジトリに入れない", "動いたので受け入れる", "パスワードを短くする", "コメントで隠す"],
      explain: "一度コミットされた秘密情報は履歴に残る。", see: "s4" }
  ]
});
