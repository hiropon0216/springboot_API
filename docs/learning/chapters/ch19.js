// 第 19 章 API セキュリティの基本（座学。書き方は AUTHORING.md）
Calc.register({
  no: 19,
  goal: [
    "OWASP API Security Top 10 の主な項目を、例で説明できる",
    "このリポジトリで既に効いている対策と、まだ無いものを見分けられる",
    "DTO の分離・ページングの上限・エラーの隠し方が、なぜセキュリティ対策でもあるのか説明できる",
    "AI の出力をセキュリティの観点でレビューする着眼点を持つ"
  ],
  sections: [
    {
      id: "s1",
      title: "OWASP API Security Top 10 と、このリポジトリ",
      body: `
<p><b>OWASP</b> は Web のセキュリティの知見をまとめている団体。API 向けの「よくある 10 の弱点」（2023 年版）を、このリポジトリに当てはめてみる。</p>
${Fig.matrix("弱点（OWASP API Top 10）", ["ひとことで", "このリポジトリ"], [
  { h: "API1 オブジェクト単位の認可の不備（BOLA）", c: ["id を変えると他人のデータに届く", { v: "認証なし（第 18 章）", tone: "err" }] },
  { h: "API2 認証の不備", c: ["ログイン・トークンの扱いが甘い", { v: "認証なし", tone: "err" }] },
  { h: "API3 プロパティ単位の認可の不備", c: ["見せてはいけない項目を返す・書けてはいけない項目を書ける", { v: "DTO で対策済み", tone: "ok" }] },
  { h: "API4 リソースの無制限な消費", c: ["大量の要求・巨大な要求でサーバーを疲弊させる", { v: "一部対策（上限あり・回数制限なし）", tone: "warn" }] },
  { h: "API5 機能単位の認可の不備（BFLA）", c: ["一般利用者が管理者の機能を呼べる", { v: "認証なし", tone: "err" }] },
  { h: "API6 業務フローへの無制限なアクセス", c: ["買い占めなど、業務の流れを悪用される", { v: "該当する業務なし", tone: "dim" }] },
  { h: "API7 SSRF", c: ["サーバーに内部の URL を叩かせる", { v: "外部呼び出しなし", tone: "dim" }] },
  { h: "API8 セキュリティ設定の不備", c: ["エラーで内部情報を出す・不要な窓口を開けっぱなし", { v: "多くは対策済み", tone: "ok" }] },
  { h: "API9 管理されていない API の一覧", c: ["古い版や試験用の API が放置される", { v: "/v1 と OpenAPI で把握", tone: "ok" }] },
  { h: "API10 外部 API の安易な利用", c: ["外部からの応答を信用しすぎる", { v: "外部呼び出しなし（第 13 章）", tone: "dim" }] }
], "赤は認証が無いことに起因する。公開する前に最初に埋めるべき穴")}`,
      refs: [],
      checks: []
    },
    {
      id: "s2",
      title: "項目単位の守り：DTO はセキュリティ対策でもある",
      body: `
${Fig.compare(
  { t: "📤 見せすぎ（過剰なデータ公開）", tone: "err", html: "エンティティをそのまま返すと、内部用の列（削除フラグ・持ち主の情報・パスワードのハッシュ…）まで出る" },
  { t: "📥 書かせすぎ（マスアサインメント）", tone: "err", html: "エンティティでそのまま受けると、<code>{\"id\": 1, \"result\": 999}</code> のように、クライアントが決めてはいけない項目まで書き換えられる" }
)}
${Fig.flow([
  { ic: "📥", t: "CalculationRequest", s: "left / operator / right だけ<br>id や result は受け取れない", tone: "ok" },
  { ic: "🧮", t: "Service", s: "id は DB、result は計算で決まる", tone: "accent" },
  { ic: "📤", t: "CalculationResponse", s: "見せてよい項目だけ", tone: "ok" }
], ["", "Mapper"], { caption: "第 11 章の「内部表現を公開しない」は、そのまま API3 への対策になっている。ArchUnit が崩れを止める" })}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/dto/CalculationRequest.java", "public record CalculationRequest(", "受け取れる項目は型で決まる"),
        code("src/test/java/com/example/calc/architecture/LayeredArchitectureTest.java", "static final ArchRule entities_are_not_exposed_by_controllers", "エンティティを外に出さないルール")
      ],
      checks: [
        { q: "作成のリクエストに \"result\": 999 を混ぜて送ったら、保存される result は？",
          a: "送った 999 ではなく、Service が計算した値。CalculationRequest に result が無いので、そもそも受け取られない（無視される）。" }
      ]
    },
    {
      id: "s3",
      title: "使いすぎを防ぐ：上限と回数制限",
      body: `
${Fig.matrix("攻め方", ["このリポジトリの守り", "状態"], [
  { h: "?size=1000000 で全件を取らせる", c: ["size は最大 100（超えたら 400）", { v: "対策済み", tone: "ok" }] },
  { h: "巨大な数値で計算させる・DB を溢れさせる", c: ["@Digits と結果の桁数の確認", { v: "対策済み", tone: "ok" }] },
  { h: "巨大なメモを送る", c: ["@Size(max = 200)", { v: "対策済み", tone: "ok" }] },
  { h: "1 秒に 1 万回呼ぶ", c: ["回数制限（レート制限）は無い", { v: "未対策", tone: "err" }] }
])}
${Fig.flow([
  { ic: "🤖", t: "大量の要求", s: "同じ相手から 1 秒に 1 万回", tone: "err" },
  { ic: "🚦", t: "回数制限", s: "API ゲートウェイや<br>Bucket4j などで数える", tone: "lec" },
  { ic: "⛔", t: "429 Too Many Requests", s: "Retry-After ヘッダで<br>いつまた呼べるか伝える", tone: "warn" }
], ["", "上限を超えたら"], { caption: "回数制限は座学。アプリの前段（ゲートウェイ）で行うことが多い" })}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "static final int MAX_PAGE_SIZE = 100;", "1 回で取れる量の上限")
      ],
      checks: [
        { q: "ページングの size の上限（第 7 章）は、性能だけでなくセキュリティ上も意味がある。なぜ？",
          a: "上限が無いと、1 回の要求で全件を読ませてサーバーや DB を疲弊させられる（API4 リソースの無制限な消費）。" }
      ]
    },
    {
      id: "s4",
      title: "設定の不備を作らない",
      body: `
${Fig.matrix("確かめること", ["このリポジトリ", "状態"], [
  { h: "エラーで内部情報を出していないか", c: ["500 は固定の文言、原因はログだけ（第 6 章）", { v: "対策済み", tone: "ok" }] },
  { h: "運用の窓口を開けすぎていないか", c: ["actuator は health と info だけ公開", { v: "対策済み", tone: "ok" }] },
  { h: "health で内部の構成を見せていないか", c: ["show-details: never（どの部品が落ちたかは見せない）", { v: "対策済み", tone: "ok" }] },
  { h: "秘密情報をリポジトリに置いていないか", c: ["本番の DB パスワードは Render が環境変数で注入", { v: "対策済み", tone: "ok" }] },
  { h: "コンテナを管理者権限で動かしていないか", c: ["Dockerfile で専用の一般ユーザーに切り替え", { v: "対策済み", tone: "ok" }] },
  { h: "CORS を広く許しすぎていないか", c: ["localhost:* などの開発用の許可が本番にも効く", { v: "要見直し", tone: "warn" }] },
  { h: "説明書（Swagger UI）を本番で公開していないか", c: ["本番でも /swagger-ui.html が開く", { v: "要判断", tone: "warn" }] }
])}`,
      refs: [
        code("src/main/resources/application.yml", "include: health,info", "公開する運用の窓口を絞る"),
        code("src/main/resources/application.yml", "show-details: never", "health の詳細を見せない"),
        code("Dockerfile", "USER spring:spring", "一般ユーザーで動かす"),
        code("src/main/java/com/example/calc/config/CorsConfig.java", ".allowedOriginPatterns(", "開発用の広い許可（本番では絞る）")
      ],
      checks: [
        { q: "Dockerfile で一般ユーザー（spring）に切り替えているのはなぜ？",
          a: "アプリに穴があって乗っ取られても、コンテナの中で管理者（root）権限を持たせないため。被害の範囲を狭くする。" }
      ]
    },
    {
      id: "s5",
      title: "入力を信用しない",
      body: `
${Fig.cards([
  { ic: "🔎", t: "検証は入口で", d: "型・必須・桁・長さを @Valid で確かめる。外から来たものは全部疑う", tone: "accent" },
  { ic: "💉", t: "SQL インジェクション", d: "入力を SQL の文字列に埋め込むと、SQL を書き換えられる。JPA の派生クエリや ? のパラメータは値として渡すので安全。文字列を連結して SQL を作らない", tone: "err" },
  { ic: "🌐", t: "SSRF", d: "利用者が渡した URL をサーバーが叩く機能は、社内の URL を叩かせる踏み台になる。許可した宛先だけにする", tone: "warn" },
  { ic: "🧾", t: "ログにも注意", d: "受け取った値をそのままログに書くと、秘密情報が残ったり、ログを偽装されたりする", tone: "lec" }
])}
${Fig.compare(
  { t: "❌ 文字列を連結した SQL", tone: "err", html: "<pre>\"select * from calculations where operator = '\" + op + \"'\"</pre>op に <code>' or '1'='1</code> を入れられると全件が返る" },
  { t: "✅ パラメータで渡す（このリポジトリ）", tone: "ok", html: "<pre>findByOperator(operator, pageable)\n→ where operator = ?</pre>値は SQL の外から渡されるので、SQL は書き換わらない" }
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationRepository.java", "Page<Calculation> findByOperator(Operator operator, Pageable pageable);", "派生クエリはパラメータで値を渡す")
      ],
      checks: []
    }
  ],
  ai: `
${Fig.cards([
  { ic: "📋", t: "Top 10 を観点表にする", d: "AI の変更をレビューするとき、「他人の id で呼べないか」「見せすぎていないか」「上限はあるか」を毎回聞く", tone: "accent" },
  { ic: "🧵", t: "文字列連結の SQL を止める", d: "AI が @Query に文字列を連結した SQL を書いたら差し戻す", tone: "err" },
  { ic: "🔐", t: "秘密情報のコミットを止める", d: "API キーやパスワードを設定ファイルに書く提案は、環境変数に置き換えさせる", tone: "warn" }
])}`,
  questions: [
    { q: "BOLA（オブジェクト単位の認可の不備）の例は？",
      choices: ["URL の id を変えるだけで、他人のデータを見られる", "パスワードが短い", "エラーメッセージが英語", "応答が遅い"],
      explain: "API で最も多い弱点。データの持ち主を確かめて防ぐ（第 18 章）。", see: "s1" },
    { q: "このリポジトリで「赤（未対策）」になっている弱点の共通の原因は？",
      choices: ["認証・認可が無いこと", "DB が遅いこと", "テストが少ないこと", "Docker を使っていること"],
      explain: "公開する前に最初に埋めるべき穴。", see: "s1" },
    { q: "「過剰なデータ公開」への対策として、このリポジトリで効いているのは？",
      choices: ["エンティティを返さず、見せてよい項目だけの DTO（Response）で返す", "HTTPS を使う", "ログを出さない", "ページングする"],
      explain: "第 11 章の「内部表現を公開しない」がそのまま対策になる。", see: "s2" },
    { q: "マスアサインメント（書かせすぎ）とは？",
      choices: ["クライアントが決めてはいけない項目（id・result など）まで書き換えられてしまうこと", "大量のデータを一度に書くこと", "同時に書き込むこと", "DB の容量を使い切ること"],
      explain: "入力をエンティティで直接受けると起きる。", see: "s2" },
    { q: "作成のリクエストに \"result\": 999 を混ぜて送った。保存される result は？",
      choices: ["Service が計算した値（999 は受け取られない）", "999", "400 になる", "null"],
      explain: "CalculationRequest に result が無いので無視される。", see: "s2" },
    { q: "ページングの size に上限を設けることは、どの弱点への対策になる？",
      choices: ["リソースの無制限な消費（API4）", "認証の不備（API2）", "SSRF（API7）", "BOLA（API1）"],
      explain: "1 回の要求で全件を読ませることを防ぐ。", see: "s3" },
    { q: "このリポジトリで未対策の「使いすぎ」の守りは？",
      choices: ["回数制限（レート制限）", "size の上限", "数値の桁数の上限", "メモの長さの上限"],
      explain: "1 秒に 1 万回呼ばれても止める仕組みは無い。", see: "s3" },
    { q: "回数制限を超えたときに返すステータスは？",
      choices: ["429 Too Many Requests", "403", "500", "503"],
      explain: "Retry-After ヘッダで、いつまた呼べるかを伝える。", see: "s3" },
    { q: "500 のときに内部情報を返さないことは、どの分類の対策？",
      choices: ["セキュリティ設定の不備（API8）", "BOLA（API1）", "SSRF（API7）", "リソースの消費（API4）"],
      explain: "エラーの詳細は攻撃の手がかりになる。", see: "s4" },
    { q: "actuator で health と info だけを公開している理由は？",
      choices: ["運用の窓口（設定値・環境変数などを見せるもの）を不必要に開けないため", "速くするため", "health 以外は壊れているから", "Render の決まり"],
      explain: "必要なものだけ開ける。", see: "s4" },
    { q: "Dockerfile でコンテナを一般ユーザー（spring）で動かす理由は？",
      choices: ["乗っ取られても管理者権限を持たせず、被害の範囲を狭くするため", "速くするため", "Java の決まり", "ログを減らすため"],
      explain: "最小権限の原則。", see: "s4" },
    { q: "このリポジトリで「要見直し」の設定は？",
      choices: ["開発用の広い CORS の許可が本番にも効いていること", "500 の文言", "actuator の公開範囲", "DB のパスワードの扱い"],
      explain: "本番で別オリジンの画面を載せるなら、その URL だけに絞る。", see: "s4" },
    { q: "SQL インジェクションを防げる書き方は？",
      choices: ["値をパラメータ（?）として渡す。JPA の派生クエリはこの形", "入力を SQL の文字列に連結する", "入力を大文字にする", "SQL をコメントで囲む"],
      explain: "値が SQL の外から渡されるので、SQL は書き換わらない。", see: "s5" },
    { q: "SSRF の危険がある機能の例は？",
      choices: ["利用者が指定した URL の内容を、サーバーが取りに行って表示する機能", "ページングする機能", "計算する機能", "ログインする機能"],
      explain: "社内の URL を叩かせる踏み台になる。宛先を許可リストで絞る。", see: "s5" },
    { q: "受け取った値をそのままログに書くことの危険として正しいものは？",
      choices: ["秘密情報がログに残ったり、改行を仕込まれてログを偽装されたりする", "ログが速くなる", "危険は無い", "DB が壊れる"],
      explain: "ログも外に出る情報として扱う。", see: "s5" },
    { q: "AI が @Query に \"… where operator = '\" + op + \"'\" と書いた。どうする？",
      choices: ["パラメータで渡す書き方に直させる", "動くのでそのまま", "op を大文字にさせる", "テストを消させる"],
      explain: "文字列連結の SQL は SQL インジェクションの入口。", see: "s5" }
  ]
});
