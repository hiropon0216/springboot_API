// 第 24 章 設定と運用・可観測性（書き方は AUTHORING.md）
Calc.register({
  no: 24,
  goal: [
    "設定をコードから分け、環境ごとに外から渡す理由を説明できる",
    "プロファイル・環境変数・Actuator の役割が分かる",
    "ログの出し方（ロガー・レベル）と、このリポジトリの学習用ログの限界が分かる",
    "可観測性の 3 本柱（ログ・メトリクス・トレース）と、障害対応の流れが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "設定はコードから分けて、外から渡す",
      body: `
${Fig.compare(
  { t: "❌ コードに設定を埋め込む", tone: "err", html: "<pre>String url = \"jdbc:postgresql://prod-db…\";</pre>環境ごとに作り直しが必要。秘密情報がコードに残る" },
  { t: "✅ 外から渡す", tone: "ok", html: "<pre>url: jdbc:postgresql://${DB_HOST}…</pre>同じ jar・同じイメージのまま、動かす場所が値を渡す" }
)}
${Fig.stack([
  { t: "環境変数・起動引数", d: "いちばん強い。本番の接続先・秘密情報（SPRING_PROFILES_ACTIVE・DB_PASSWORD など）", tone: "err" },
  { t: "プロファイル別の設定", d: "application.yml の --- で区切った local / prod の部分", tone: "warn" },
  { t: "共通の設定", d: "application.yml の先頭（全環境に共通）", tone: "accent" },
  { t: "Spring Boot の既定値", d: "何も書かなければこれ", tone: "dim" }
], "上ほど優先される。共通の値を、環境ごとに上から上書きしていく")}`,
      refs: [
        code("src/main/resources/application.yml", "on-profile: prod", "本番のプロファイルの部分"),
        code("Dockerfile", "ENV SPRING_PROFILES_ACTIVE=prod", "イメージの中では prod で起動")
      ],
      checks: [
        { q: "Dockerfile に ENV SPRING_PROFILES_ACTIVE=prod があるのに、render.yaml でも SPRING_PROFILES_ACTIVE=prod を渡している。どちらが使われる？",
          a: "実行時に渡す環境変数（Render の設定）が優先される。ここではどちらも prod なので結果は同じだが、Render 側で変えればイメージを作り直さずに切り替えられる。" }
      ]
    },
    {
      id: "s2",
      title: "プロファイルで変わるもの",
      body: `
${Fig.matrix("設定", ["local（手元）", "prod（本番）", "test（自動テスト）"], [
  { h: "DB", c: [{ v: "Docker の PostgreSQL", tone: "accent" }, { v: "Render の PostgreSQL", tone: "lec" }, { v: "H2", tone: "ok" }] },
  { h: "接続情報", c: ["compose.yaml から自動", "環境変数 ${DB_HOST} など", "ファイルに直接"] },
  { h: "ddl-auto", c: ["update", "update", "create-drop"] },
  { h: "SQL の表示（show-sql）", c: [{ v: "表示する", tone: "ok" }, { v: "表示しない", tone: "dim" }, { v: "表示しない", tone: "dim" }] },
  { h: "ログのレベル", c: ["既定（INFO）", { v: "全体 WARN・アプリ INFO", tone: "warn" }, "既定"] }
], "コードは 1 つ。違いは設定だけにまとまっている")}`,
      refs: [
        code("src/main/resources/application.yml", "default: local", "指定が無ければ local"),
        code("src/main/resources/application.yml", "root: WARN", "本番はフレームワークのログを絞る")
      ],
      checks: [
        { q: "本番で show-sql を false にしている理由として考えられることは？",
          a: "SQL を毎回ログに出すと量が多すぎて重く、値によっては入力された情報がログに残るから。手元では N+1 に気づくために表示している（第 17 章）。" }
      ]
    },
    {
      id: "s3",
      title: "Actuator：運用のための窓口",
      body: `
${Fig.cards([
  { ic: "💓", t: "/actuator/health", d: "生きているか・DB につながるか。Render や監視の仕組みがこれを見る", tone: "ok" },
  { ic: "ℹ️", t: "/actuator/info", d: "アプリの情報（版など）", tone: "accent" },
  { ic: "🔒", t: "それ以外は閉じている", d: "設定値・環境変数・メトリクスなどを見せる窓口もあるが、公開は health と info だけ", tone: "warn" },
  { ic: "🙈", t: "詳細は見せない", d: "show-details: never。どの部品が落ちたかは外に出さない（第 19 章）", tone: "warn" }
])}
${Fig.compare(
  { t: "💓 liveness（生きているか）", tone: "lec", html: "固まっていないか。ダメなら<b>再起動</b>してもらう" },
  { t: "🚦 readiness（受け付けられるか）", tone: "lec", html: "起動中・DB の準備中など、今は受け付けられないか。ダメなら<b>要求を回さない</b>" },
  "Kubernetes などでは 2 つを分けて使う。このリポジトリでも Spring Boot が /actuator/health/liveness・/readiness を用意している（health の応答の groups に出る）"
)}`,
      refs: [
        code("src/main/resources/application.yml", "include: health,info", "公開する窓口"),
        code("src/main/resources/application.yml", "show-details: never", "詳細を見せない")
      ],
      checks: [
        { q: "health の詳細（どの部品が DOWN か）を外に見せない代わりに、運用する人はどうやって原因を知る？",
          a: "サーバーのログや、内部だけで見られる監視の仕組み（メトリクス）で知る。外の利用者には「UP / DOWN」だけで十分。" }
      ]
    },
    {
      id: "s4",
      title: "ログ：ロガーとレベル",
      body: `
${Fig.compare(
  { t: "📢 System.out.printf（学習用ログ）", tone: "warn", html: "<code>[3/5 業務] 計算する…</code><br>手軽だが、<b>レベルで絞れない</b>・時刻や出どころが付かない。<b>本番でもそのまま出る</b>（このリポジトリの割り切り）" },
  { t: "📝 ロガー（SLF4J / logger）", tone: "ok", html: "<code>logger.error(\"想定していない例外…\", ex)</code><br>レベル・時刻・クラス名・スタックトレースが付き、<b>設定で出す量を変えられる</b>" }
)}
${Fig.matrix("レベル", ["使う場面", "本番（このリポジトリ）"], [
  { h: "ERROR", c: ["直すべき異常（想定外の 500）", { v: "出す", tone: "err" }] },
  { h: "WARN", c: ["気にするべきだが動いている", { v: "出す", tone: "warn" }] },
  { h: "INFO", c: ["主な出来事（起動・重要な操作）", { v: "アプリのものだけ出す", tone: "accent" }] },
  { h: "DEBUG / TRACE", c: ["調査のための細かい情報", { v: "出さない", tone: "dim" }] }
], "prod では root: WARN、com.example.calc: INFO。フレームワークの細かいログは出さない")}
${Fig.cards([
  { ic: "🧾", t: "構造化ログ（座学）", d: "ログを 1 行の JSON で出すと、検索・集計の仕組みにそのまま流せる。Spring Boot は設定だけで対応できる", tone: "lec" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "logger.error(", "本番でも残るロガーで記録（500 のとき）"),
        code("README.md", "学習用の実行ログ", "[n/5] のログは学習用という説明")
      ],
      checks: [
        { q: "GlobalExceptionHandler の 500 の処理だけ System.out ではなく logger.error を使っているのはなぜ？（コメントを読もう）",
          a: "学習ログではなく、本番でも残るロガーで記録するため。500 はバグなので、スタックトレース付きで確実に残す必要がある。" }
      ]
    },
    {
      id: "s5",
      title: "可観測性：3 本柱（座学）",
      body: `
<p><b>可観測性</b>は「外から見て、中で何が起きているか分かる」性質。ログだけでは足りず、3 つを組み合わせる。</p>
${Fig.cards([
  { ic: "📈", t: "メトリクス（数値）", d: "1 秒あたりの要求数・応答時間・エラー率・DB の接続数。<b>異常に気づく</b>。Micrometer → Prometheus / Grafana", tone: "accent" },
  { ic: "🧵", t: "トレース（経路）", d: "1 つの要求が、どのサービス・どの処理を何ミリ秒で通ったか。<b>どこが遅い・壊れているかを絞る</b>。OpenTelemetry", tone: "lec" },
  { ic: "📝", t: "ログ（出来事）", d: "その時に何が起きたかの詳細。<b>原因を確かめる</b>。トレース ID を付けると、1 つの要求のログを串刺しで探せる", tone: "ok" }
])}
${Fig.timeline([
  { t: "気づく（メトリクス）", d: "エラー率が 5% を超えたとアラートが鳴る", tone: "err" },
  { t: "絞る（トレース）", d: "遅いのは計算 API → DB の区間だと分かる", tone: "warn" },
  { t: "確かめる（ログ）", d: "そのトレース ID のログに、DB の接続待ちのエラーがある", tone: "accent" },
  { t: "直す・記録する", d: "原因を直し、再発防止を progress や ADR に残す", tone: "ok" }
], "第 4 章の「どこで止まったか」を、本番の規模でやるための道具")}`,
      refs: [
        code("pom.xml", "spring-boot-starter-actuator", "入れるならここ：メトリクスの土台（Actuator ＋ Micrometer）は既に入っている")
      ],
      checks: []
    }
  ],
  observe: {
    intro: "<p>アプリを起動して、運用の窓口とログを見る。</p>",
    steps: [
      { do: "<code>curl -s http://localhost:8080/actuator/health</code>", expect: '{"groups":["liveness","readiness"],"status":"UP"}（どの部品が UP かの詳細は出ない）' },
      { do: "<code>curl -s http://localhost:8080/actuator/health/readiness</code>", expect: '{"status":"UP"}（受け付けられるか）' },
      { do: "<code>curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/actuator/env</code>", expect: "404。公開していない窓口は開かない" },
      { do: "application.yml の prod の部分と render.yaml の envVars を並べて開き、環境変数の名前を見比べる。", expect: "DB_HOST・DB_PORT・DB_NAME・DB_USER・DB_PASSWORD の 5 つが両方にある。設定は「読む側」と「渡す側」の名前がそろって初めて動く" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "⚙️", t: "設定値のハードコードを疑う", d: "URL・タイムアウト・上限値などが Java のコードに直書きされていないか", tone: "warn" },
  { ic: "📝", t: "ログの中身を見る", d: "AI が足したログに、パスワード・トークン・個人情報が出ていないか", tone: "err" },
  { ic: "🧵", t: "障害の相談にはトレース ID を", d: "本番の不具合を AI に相談するときは、該当のトレース ID のログ一式を渡すと早い", tone: "accent" }
])}`,
  questions: [
    { q: "設定をコードから分け、実行時に外から渡す一番の理由は？",
      choices: ["同じ jar・同じイメージのまま、環境ごとに値だけを変えられ、秘密情報もコードに残らないから", "コードが短くなるから", "速くなるから", "Spring の決まり"],
      explain: "環境ごとに作り直す必要が無くなる。", see: "s1" },
    { q: "設定の優先順位として正しいものは？（強い順）",
      choices: ["環境変数 → プロファイル別 → 共通 → 既定値", "既定値 → 共通 → プロファイル別 → 環境変数", "共通 → 環境変数 → 既定値", "すべて同じ強さ"],
      explain: "共通の値を、環境ごとに上から上書きする。", see: "s1" },
    { q: "Dockerfile の ENV と Render の環境変数で同じ項目を指定した。使われるのは？",
      choices: ["実行時に渡す Render の環境変数", "Dockerfile の ENV", "どちらも使われない", "エラーになる"],
      explain: "実行時の値が優先。イメージを作り直さずに切り替えられる。", see: "s1" },
    { q: "local と prod で違う設定として正しいものは？",
      choices: ["local は SQL を表示し、prod は表示しない", "prod だけ ddl-auto: create-drop", "local は H2 を使う", "prod だけ DB を使わない"],
      explain: "テスト（test）が H2 と create-drop。", see: "s2" },
    { q: "prod のログ設定（root: WARN、com.example.calc: INFO）の意図は？",
      choices: ["フレームワークの細かいログは絞り、アプリのログだけ INFO で出す", "すべてのログを消す", "すべてのログを出す", "エラーだけ出す"],
      explain: "本番のログの量と中身を必要なものに絞る。", see: "s2" },
    { q: "/actuator/health を見ているのは誰？",
      choices: ["Render や監視の仕組み（生きているか・DB につながるかの確認）", "利用者の画面", "テスト", "Docker Compose の healthcheck"],
      explain: "compose の healthcheck は DB 側の準備の確認で別物（第 14 章）。", see: "s3" },
    { q: "Actuator の窓口を health と info だけ公開している理由は？",
      choices: ["設定値や環境変数などを見せる窓口を不必要に開けないため", "ほかの窓口は壊れているから", "速くするため", "Render の決まり"],
      explain: "運用の窓口は攻撃者にとっても便利な情報源。", see: "s3" },
    { q: "liveness と readiness の違いは？",
      choices: ["liveness は「固まっていないか（ダメなら再起動）」、readiness は「今受け付けられるか（ダメなら要求を回さない）」", "同じ意味", "liveness は DB、readiness はアプリ", "readiness は再起動のため"],
      explain: "起動中や DB 準備中は readiness だけ NG にする、など使い分ける。", see: "s3" },
    { q: "このリポジトリの [n/5] の学習用ログ（System.out.printf）の限界は？",
      choices: ["レベルで絞れず、本番でもそのまま出る", "速すぎる", "ログが出ない", "ファイルに保存される"],
      explain: "学習用の割り切り。実務ではロガーを使う。", see: "s4" },
    { q: "ロガー（logger）を使う利点として誤っているものは？",
      choices: ["プログラムが必ず速くなる", "レベルで出す量を変えられる", "時刻やクラス名が付く", "スタックトレースを残せる"],
      explain: "速さの問題ではなく、制御と情報量の問題。", see: "s4" },
    { q: "ERROR レベルで出すべきものは？",
      choices: ["直すべき異常（想定外の 500 など）", "起動した", "計算した", "調査用の細かい値"],
      explain: "INFO は主な出来事、DEBUG は調査用。", see: "s4" },
    { q: "可観測性の 3 本柱の組み合わせは？",
      choices: ["ログ・メトリクス・トレース", "テスト・レビュー・CI", "CPU・メモリ・ディスク", "Controller・Service・Repository"],
      explain: "気づく（メトリクス）→ 絞る（トレース）→ 確かめる（ログ）。", see: "s5" },
    { q: "「エラー率が上がった」ことに最初に気づくのに向いているのは？",
      choices: ["メトリクス", "ログを 1 行ずつ読む", "トレース 1 本", "ソースコード"],
      explain: "数値の変化を監視してアラートにする。", see: "s5" },
    { q: "トレースの役割は？",
      choices: ["1 つの要求がどの処理・サービスを何ミリ秒で通ったかを示し、問題の場所を絞る", "数値を集計する", "設定を保存する", "テストを実行する"],
      explain: "OpenTelemetry などで取る。", see: "s5" },
    { q: "ログにトレース ID を付ける利点は？",
      choices: ["1 つの要求に関係するログを、サービスをまたいで串刺しで探せる", "ログが小さくなる", "ログが暗号化される", "ログが不要になる"],
      explain: "大量のログから、その要求の分だけを取り出せる。", see: "s5" },
    { q: "AI が足したログに、リクエストの本文を丸ごと出す行があった。まず確かめることは？",
      choices: ["パスワード・トークン・個人情報が出ていないか", "ログの色", "ログの行数", "ログの言語"],
      explain: "ログも外に出る情報として扱う（第 19 章）。", see: "s4" }
  ]
});
