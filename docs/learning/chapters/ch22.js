// 第 22 章 Docker（書き方は AUTHORING.md）
Calc.register({
  no: 22,
  goal: [
    "Docker が「環境ごと箱に詰める」ことで何を解決するかを説明できる",
    "イメージとコンテナの違いが分かる",
    "このリポジトリの Dockerfile（2 段構え・レイヤ・一般ユーザー）の意図を読める",
    "compose.yaml で手元の PostgreSQL がどう立ち上がるかが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "Docker：環境ごと箱に詰める",
      body: `
${Fig.compare(
  { t: "😩 箱に詰めないと", tone: "err", html: "「私の PC では動いたのに」<br>Java の版・OS・設定が人や機械ごとに違い、本番だけ動かない" },
  { t: "📦 箱に詰めると", tone: "ok", html: "OS の必要な部分・Java・アプリ・起動方法を<b>1 つの箱（イメージ）</b>にする。<br>どこで動かしても中身は同じ" }
)}
${Fig.flow([
  { ic: "📄", t: "Dockerfile", s: "箱の作り方（レシピ）", tone: "dim" },
  { ic: "📦", t: "イメージ", s: "出来上がった箱（変わらない）", tone: "accent" },
  { ic: "▶️", t: "コンテナ", s: "箱を動かしている実体<br>（何個でも起動できる）", tone: "ok" }
], ["docker build", "docker run"], { caption: "イメージは設計図兼ひな形、コンテナはそこから起動した実行中のもの" })}`,
      refs: [
        code("Dockerfile", "FROM eclipse-temurin:21-jdk AS build", "箱の作り方の始まり")
      ],
      checks: [
        { q: "このリポジトリで Docker が使われている場所は 2 つある。どこ？",
          a: "① compose.yaml：手元の PostgreSQL をコンテナで動かす。② Dockerfile：このアプリ自体をイメージにする（本番の Render で動かす）。" }
      ]
    },
    {
      id: "s2",
      title: "Dockerfile は 2 段構え（マルチステージ）",
      body: `
${Fig.compare(
  { t: "🔨 1 段目：build（JDK 入り）", tone: "lec", html: Fig.flow([
    { t: "pom.xml だけコピーして依存を取得" },
    { t: "ソースをコピーして jar を作る" },
    { t: "jar をレイヤに分解する" }
  ], ["", ""], { dir: "v" }) + "コンパイラなど、作るための道具が全部入った大きな箱" },
  { t: "🚀 2 段目：runtime（JRE だけ）", tone: "ok", html: Fig.flow([
    { t: "一般ユーザー spring を作る" },
    { t: "1 段目から完成品だけをコピー" },
    { t: "java -jar application.jar で起動" }
  ], ["", ""], { dir: "v" }) + "動かすための最小限だけの小さな箱" },
  "本番に持っていくのは 2 段目だけ。小さく、道具が無いぶん攻撃されにくい"
)}
${Fig.cards([
  { ic: "🧪", t: "テストはしない", d: "jar を作るときテスト・Checkstyle・Spotless をスキップ。検査は CI の責務（第 23 章）", tone: "dim" },
  { ic: "👤", t: "一般ユーザーで動かす", d: "管理者（root）で動かさない。乗っ取られても被害を狭くする（第 19 章）", tone: "warn" },
  { ic: "🏷️", t: "prod プロファイル", d: "ENV SPRING_PROFILES_ACTIVE=prod。箱の中では本番の設定で起動する", tone: "accent" }
])}`,
      refs: [
        code("Dockerfile", "FROM eclipse-temurin:21-jre AS runtime", "2 段目：実行用の小さな箱"),
        code("Dockerfile", "USER spring:spring", "一般ユーザーで動かす"),
        code("Dockerfile", "ENV SPRING_PROFILES_ACTIVE=prod", "本番のプロファイル")
      ],
      checks: [
        { q: "1 段目は eclipse-temurin:21-jdk、2 段目は eclipse-temurin:21-jre。jdk と jre の違いは？",
          a: "JDK はコンパイラなど開発の道具を含む。JRE は動かすための最小限だけ。jar を作るには JDK、動かすには JRE で足りる。" }
      ]
    },
    {
      id: "s3",
      title: "レイヤとキャッシュ：変わりにくいものを下に",
      body: `
${Fig.stack([
  { t: "application", d: "自分たちのコード。毎回変わる", tone: "err" },
  { t: "snapshot-dependencies", d: "開発中の依存。ときどき変わる", tone: "warn" },
  { t: "spring-boot-loader", d: "起動の仕組み。めったに変わらない", tone: "ok" },
  { t: "dependencies", d: "Spring などの部品（大きい）。pom.xml を変えない限り変わらない", tone: "ok" }
], "イメージは層（レイヤ）の積み重ね。変わっていない下の層は、前回作ったものを使い回せる（キャッシュ）")}
${Fig.compare(
  { t: "✅ 分けてある（このリポジトリ）", tone: "ok", html: "コードを 1 行直しても、作り直すのは一番上の application 層だけ。数十 MB の依存は使い回し。<br>依存の取得（<code>dependency:go-offline</code>）もソースのコピーより先にして、キャッシュを効かせている" },
  { t: "❌ jar 1 つを丸ごとコピー", tone: "err", html: "1 行直すたびに、依存を含む jar 全体が新しい層になる。ビルドも転送も毎回重い" }
)}`,
      refs: [
        code("Dockerfile", "RUN java -Djarmode=tools -jar target/*.jar extract --layers", "jar をレイヤに分解する"),
        code("Dockerfile", "COPY --from=build /workspace/extracted/dependencies/ ./", "変わりにくい順にコピー（最初は依存）")
      ],
      checks: [
        { q: "Dockerfile で、pom.xml のコピーと src のコピーを分けているのはなぜ？（1 段目のコメント）",
          a: "依存解決とソースのコピーを分けると、ソースだけ変えたときに依存レイヤ（重い）のキャッシュが効くから。" }
      ]
    },
    {
      id: "s4",
      title: "compose.yaml：手元の PostgreSQL を 1 行で",
      body: `
${Fig.code([
  { c: "services:" },
  { c: "  postgres:" },
  { c: "    image: postgres:17-alpine", tag: "版を固定（latest にしない）", tone: "accent" },
  { c: "    environment: { POSTGRES_DB: calc, POSTGRES_USER: calc, … }", tag: "DB 名・ユーザー", tone: "dim" },
  { c: "    ports: ['5432:5432']", tag: "PC の 5432 → 箱の 5432", tone: "ok" },
  { c: "    healthcheck: { test: pg_isready … }", tag: "受け付け可能か確認", tone: "lec" },
  { c: "    volumes: [calc-pgdata:/var/lib/postgresql/data]", tag: "データを箱の外に残す", tone: "warn" }
], "compose.yaml（簡略）。アプリの起動時に spring-boot-docker-compose が docker compose up を自動で実行する")}
${Fig.matrix("操作", ["データは"], [
  { h: "docker compose stop / start", c: [{ v: "残る", tone: "ok" }] },
  { h: "docker compose down（コンテナを消す）", c: [{ v: "残る（ボリュームにある）", tone: "ok" }] },
  { h: "docker compose down -v（ボリュームも消す）", c: [{ v: "消える（まっさら）", tone: "err" }] }
], "コンテナは使い捨て。データはボリュームという箱の外の置き場に残す")}`,
      refs: [
        code("compose.yaml", "image: postgres:17-alpine", "版を固定した PostgreSQL"),
        code("compose.yaml", "calc-pgdata:/var/lib/postgresql/data", "データを残すボリューム")
      ],
      checks: [
        { q: "compose.yaml のコメントで、image のタグを latest にしない理由は何と書いてある？",
          a: "latest にすると「昨日動いた環境」が今日は別のバージョンになりうる（再現性が無くなる）から。" }
      ]
    },
    {
      id: "s5",
      title: "同じ箱を、設定だけ変えてどこでも動かす",
      body: `
${Fig.flow([
  { ic: "📦", t: "同じイメージ", s: "中身は 1 種類", tone: "accent" },
  { ic: "⚙️", t: "実行時に渡す環境変数", s: "DB_HOST・DB_PASSWORD…", tone: "warn" },
  { ic: "☁️", t: "Render・別のクラウド・手元", s: "どこでも同じ動き", tone: "ok" }
], ["", ""], { caption: "接続先や秘密情報はイメージに焼き込まず、動かす場所が外から渡す（第 14・24 章）" })}`,
      refs: [
        code("render.yaml", "dockerfilePath: ./Dockerfile", "本番はこの Dockerfile でイメージを作る")
      ],
      checks: [
        { q: "もし DB のパスワードを Dockerfile の ENV に書いたら、何が困る？",
          a: "イメージを手に入れた人なら誰でもパスワードを読めてしまう。また、環境ごとに別のイメージが必要になり「同じ箱をどこでも」が崩れる。" }
      ]
    }
  ],
  observe: {
    intro: "<p>Docker Desktop を起動してから試す。</p>",
    steps: [
      { do: "<code>docker compose ps</code>（アプリを spring-boot:run で起動した後）", expect: "postgres のコンテナが running（healthy）" },
      { do: "<code>docker build -t calc-api:local .</code>", expect: "2 段のビルドが走り、最後にイメージができる。もう一度実行すると、変わっていない層は CACHED と表示されて速い" },
      { do: "<code>docker images calc-api</code>", expect: "イメージのサイズ。JDK 入りの 1 段目は含まれない" },
      { do: "コードを 1 行変えて再ビルドする。", expect: "依存の層は CACHED のまま、application の層だけ作り直される" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🏷️", t: "latest を疑う", d: "AI は FROM や image に latest を書きがち。版を固定させる", tone: "warn" },
  { ic: "👤", t: "root で動かしていないか", d: "USER の指定が消えていないか確認する", tone: "err" },
  { ic: "🔐", t: "秘密情報を焼き込ませない", d: "ENV や COPY でパスワード・鍵を入れる提案は差し戻す", tone: "err" }
])}`,
  questions: [
    { q: "Docker が解決する主な問題は？",
      choices: ["人や機械ごとに環境が違い、「私の PC では動く」が起きること", "コードのバグ", "DB の設計", "API の設計"],
      explain: "OS の必要な部分・Java・アプリをまとめて箱に詰める。", see: "s1" },
    { q: "イメージとコンテナの関係は？",
      choices: ["イメージは変わらない箱（ひな形）、コンテナはそこから起動した実行中のもの", "同じもの", "コンテナからイメージが作られる", "イメージは実行中のもの"],
      explain: "1 つのイメージから何個でもコンテナを起動できる。", see: "s1" },
    { q: "Dockerfile の役割は？",
      choices: ["イメージの作り方（手順）を書いたもの", "コンテナの実行ログ", "DB の設定", "テストの手順"],
      explain: "docker build が Dockerfile を読んでイメージを作る。", see: "s1" },
    { q: "Dockerfile を 2 段（build と runtime）に分けている理由は？",
      choices: ["作るための道具（JDK など）を本番の箱に入れず、小さく攻撃されにくくするため", "速く起動するため", "テストを 2 回するため", "Docker の決まり"],
      explain: "本番に持っていくのは 2 段目だけ。", see: "s2" },
    { q: "2 段目で JDK ではなく JRE を使う理由は？",
      choices: ["動かすだけならコンパイラなどの道具は要らないから", "JRE の方が新しいから", "JDK では動かないから", "無料だから"],
      explain: "最小限にするほど、小さく安全。", see: "s2" },
    { q: "Dockerfile の USER spring:spring の目的は？",
      choices: ["アプリを管理者（root）ではなく一般ユーザーで動かすため", "ログインを必須にするため", "Spring を起動するため", "DB のユーザーを作るため"],
      explain: "乗っ取られても被害を狭くする（最小権限）。", see: "s2" },
    { q: "イメージのビルドでテストをスキップしている理由は？",
      choices: ["検査は CI の責務で、ここでは jar を作ることだけに集中するため", "Docker ではテストが動かないから", "テストが不要だから", "時間が無いから"],
      explain: "責務を分けて、ビルドを速く軽くしている。", see: "s2" },
    { q: "レイヤを「変わりにくい順」に積む理由は？",
      choices: ["変わっていない下の層を前回のまま使い回し（キャッシュ）、ビルドと転送を速くするため", "見た目のため", "セキュリティのため", "決まりは無い"],
      explain: "コードを 1 行直しても、作り直すのは一番上の層だけ。", see: "s3" },
    { q: "このリポジトリのレイヤで、一番変わりやすいものは？",
      choices: ["application（自分たちのコード）", "dependencies", "spring-boot-loader", "OS"],
      explain: "だから一番上に置く。", see: "s3" },
    { q: "pom.xml のコピーと依存の取得を、ソースのコピーより先にする理由は？",
      choices: ["ソースだけ変えたときに、重い依存の層のキャッシュが効くから", "pom.xml が小さいから", "順番は関係ない", "ソースを隠すため"],
      explain: "変わる頻度の違いで順番を決める。", see: "s3" },
    { q: "compose.yaml の ports: '5432:5432' の意味は？",
      choices: ["PC の 5432 番を、コンテナの 5432 番につなぐ", "ポートを 2 つ開く", "5432 秒で止まる", "5432 人まで接続できる"],
      explain: "左が PC（ホスト）、右がコンテナ。", see: "s4" },
    { q: "image を postgres:latest ではなく postgres:17-alpine にしている理由は？",
      choices: ["版を固定して、いつ作り直しても同じ環境にするため（再現性）", "latest は無料でないから", "alpine は必ず速いから", "決まりは無い"],
      explain: "latest だと「昨日動いた環境」が今日は別物になりうる。", see: "s4" },
    { q: "docker compose down -v を実行すると？",
      choices: ["コンテナに加えてボリュームも消え、DB のデータがまっさらになる", "コンテナだけ消え、データは残る", "何も起きない", "コンテナが起動する"],
      explain: "-v を付けなければデータはボリュームに残る。", see: "s4" },
    { q: "コンテナを消してもデータが残る仕組みは？",
      choices: ["データを名前付きボリューム（箱の外の置き場）に置いているから", "コンテナが自動で保存するから", "DB がクラウドにあるから", "残らない"],
      explain: "コンテナは使い捨て、データは外に。", see: "s4" },
    { q: "DB のパスワードをイメージに焼き込まず、実行時の環境変数で渡す理由として誤っているものは？",
      choices: ["イメージが速く起動するから", "イメージを手に入れた人にパスワードを読まれないため", "同じイメージを環境ごとに使い回すため", "秘密情報をリポジトリに入れないため"],
      explain: "速さの問題ではない。安全と使い回しのため。", see: "s5" },
    { q: "AI が Dockerfile を FROM eclipse-temurin:latest に書き換えた。どう判断する？",
      choices: ["版を固定させる（再現性が無くなる）", "最新なので良い", "テストが通れば良い", "Docker をやめる"],
      explain: "いつの間にか中身が変わる箱は、原因の分からない障害のもと。", see: "s4" }
  ]
});
