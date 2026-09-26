// 第 18 章 認証・認可（座学。書き方は AUTHORING.md）
Calc.register({
  no: 18,
  goal: [
    "認証（あなたは誰？）と認可（それをしてよい？）の違いと、401 / 403 を言い分けられる",
    "セッション方式とトークン（JWT）方式の違いが分かる",
    "OAuth2 / OpenID Connect の登場人物と、API（リソースサーバー）の役割が分かる",
    "Spring Security がどこで動き、このリポジトリに入れるとどこが変わるかが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "認証と認可",
      body: `
${Fig.compare(
  { t: "🪪 認証（Authentication）", tone: "accent", html: "<b>あなたは誰？</b><br>ログイン・トークンの確認。<br>失敗 → <b>401 Unauthorized</b>（名前は「未認可」だが、実際の意味は「未認証」）" },
  { t: "🔑 認可（Authorization）", tone: "lec", html: "<b>それをしてよい？</b><br>権限・持ち主の確認。<br>失敗 → <b>403 Forbidden</b>（誰かは分かったが、許されていない）" },
  "順番は必ず「認証 → 認可」。誰か分からなければ、してよいかも判断できない"
)}
${Fig.matrix("状況", ["ステータス"], [
  { h: "トークンを付けずに DELETE した", c: [{ v: "401", tone: "warn" }] },
  { h: "期限切れのトークンで GET した", c: [{ v: "401", tone: "warn" }] },
  { h: "一般利用者が管理者用の API を呼んだ", c: [{ v: "403", tone: "warn" }] },
  { h: "他人の計算を GET した", c: [{ v: "404（存在を隠す。18.6 節）", tone: "lec" }] }
])}`,
      refs: [],
      checks: []
    },
    {
      id: "s2",
      title: "今のこの API は、誰でも何でもできる",
      body: `
${Fig.flow([
  { ic: "🌍", t: "インターネットの誰か", s: "URL さえ分かれば", tone: "err" },
  { ic: "☕", t: "この API", s: "認証なし", tone: "warn" },
  { ic: "🗑️", t: "全員の計算履歴", s: "見る・書き換える・消す", tone: "err" }
], ["DELETE /calculations/1", ""], { caption: "学習の足場を小さくするため、認証は意図的に入れていない（ADR 0006・0007）。公開するなら最初に必要になる" })}
${Fig.cards([
  { ic: "📚", t: "昔は入っていた", d: "タスク管理 API 時代（Sprint 0〜4）は JWT 認証と所有者ベースの認可があった。git タグ archive/task-api に残っている", tone: "dim" },
  { ic: "🥇", t: "実務の API ではほぼ必須", d: "この教材で最も大きく欠けている部分（第 26 章の地図）", tone: "warn" }
])}`,
      refs: [
        code("docs/adr/0006-pivot-to-calc-api.md", "DB も認証も無い、極小の API で十分", "認証を外した判断"),
        code("docs/adr/0007-reintroduce-model-and-database.md", "| 認証 | **入れない** |", "DB を入れた後も認証は入れない判断")
      ],
      checks: []
    },
    {
      id: "s3",
      title: "セッションとトークン（JWT）",
      body: `
${Fig.compare(
  { t: "🍪 セッション方式", tone: "lec", html: `
${Fig.flow([
  { t: "ログイン" }, { t: "サーバーが「入館証の控え」を保存", tone: "lec" }, { t: "Cookie で番号だけ渡す" }
], ["", ""], { dir: "v" })}
<ul><li>サーバーが状態を持つ（第 1 章のステートレスに反する）</li><li>ブラウザ向き。取り消しは簡単</li></ul>` },
  { t: "🎫 トークン（JWT）方式", tone: "accent", html: `
${Fig.flow([
  { t: "ログイン" }, { t: "署名付きの「入館証」そのものを渡す", tone: "accent" }, { t: "毎回ヘッダに付けて送る" }
], ["", ""], { dir: "v" })}
<ul><li>サーバーは署名を確かめるだけ（状態を持たない）</li><li>API・スマホ向き。途中で取り消しにくい → 有効期限を短く</li></ul>` }
)}
${Fig.http("JWT の中身（. で 3 つに分かれる）", [
  { k: "ヘッダ", v: "{\"alg\":\"RS256\"}", n: "署名の方式", tone: "dim" },
  { k: "ペイロード", v: "{\"sub\":\"user-42\",\"scope\":\"calc:write\",\"exp\":1790000000}", n: "誰か・何をしてよいか・いつまで有効か", tone: "accent" },
  { k: "署名", v: "k8Hq…", n: "改ざんされていない証明。中身は暗号化されていない（誰でも読める）", tone: "err" }
], "送り方：Authorization: Bearer eyJhbGci…。中身は読めるので、秘密情報を入れない")}`,
      refs: [],
      checks: []
    },
    {
      id: "s4",
      title: "OAuth2 / OpenID Connect：ログインを専門家に任せる",
      body: `
${Fig.flow([
  { ic: "🧑", t: "利用者", s: "ログインする人" },
  { ic: "📱", t: "クライアント", s: "画面・スマホアプリ" },
  { ic: "🏛️", t: "認可サーバー", s: "Keycloak・Auth0・Google など<br>パスワードを預かる専門家", tone: "lec" },
  { ic: "☕", t: "リソースサーバー", s: "この API<br>トークンを確かめるだけ", tone: "accent" }
], ["ログインを頼む", "トークンを受け取る", "Bearer トークン付きで呼ぶ"], { dir: "v" })}
${Fig.cards([
  { ic: "🔐", t: "API はパスワードを扱わない", d: "パスワードの保存・多要素認証は認可サーバーの仕事。API は署名と有効期限と権限（scope）を確かめるだけ", tone: "ok" },
  { ic: "📦", t: "Spring での入れ方", d: "spring-boot-starter-oauth2-resource-server を足し、認可サーバーの場所（issuer-uri）を設定する。署名の鍵は自動で取りに行く", tone: "accent" },
  { ic: "🪪", t: "OpenID Connect", d: "OAuth2 の上に「誰がログインしたか（ID トークン）」の約束を足したもの", tone: "lec" }
])}`,
      refs: [
        code("pom.xml", "spring-boot-starter-validation", "入れるならここ：starter の並びに oauth2-resource-server を足す")
      ],
      checks: []
    },
    {
      id: "s5",
      title: "Spring Security はどこで動くか",
      body: `
${Fig.stack([
  { t: "Tomcat", d: "HTTP を受け取る", tone: "dim" },
  { t: "Spring Security のフィルタ", d: "CORS → 認証（トークン確認）→ 認可（URL ごとの権限）。ここで 401 / 403 を返す", tone: "err" },
  { t: "Spring MVC", d: "URL で振り分け、JSON を型にする（第 4 章の ① 受信）", tone: "accent" },
  { t: "Controller → Service → Repository", d: "ここに来た時点で「誰か」は分かっている", tone: "ok" }
], "Security は Controller より手前で動く。だから影響が 2 つある（下）")}
${Fig.cards([
  { ic: "🌐", t: "CORS の設定を Security 側にも", d: "プリフライト（OPTIONS）がフィルタで弾かれるので、Security に CORS を教える必要がある（第 9 章）", tone: "warn" },
  { ic: "📮", t: "401 / 403 の形をそろえる", d: "Security のエラーは GlobalExceptionHandler を通らない。ProblemDetail の形で返すよう別途設定する（第 6 章の約束を守るため）", tone: "warn" },
  { ic: "📁", t: "置き場所", d: "config/SecurityConfig（@Configuration ＋ SecurityFilterChain の @Bean）", tone: "accent" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/config/CorsConfig.java", "MVC 層より手前のフィルタでプリフライトが弾かれる", "Security を入れたときの CORS の注意"),
        code("src/main/java/com/example/calc/config/OpenApiConfig.java", "@Configuration", "入れるならここ：config/ に SecurityConfig を同じ形で置く")
      ],
      checks: []
    },
    {
      id: "s6",
      title: "認可はデータにも必要：自分の計算だけ",
      body: `
${Fig.compare(
  { t: "❌ URL の認可だけ", tone: "err", html: "「ログインしていれば GET /calculations/{id} を呼べる」だけだと、<b>id を変えれば他人の計算が見える</b>" },
  { t: "✅ データの持ち主も確かめる", tone: "ok", html: "calculations に user_id を持たせ、<br><code>findByIdAndUserId(id, 今の利用者)</code> で探す。<br>他人のものは<b>404</b>（存在すら教えない）" },
  "API で最も多い脆弱性はこれ（BOLA：第 19 章）。URL の認可とデータの認可は別物"
)}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "private Calculation mustFind(Long id)", "入れるならここ：今の利用者の id も条件に加える"),
        code("src/main/java/com/example/calc/calculation/CalculationRepository.java", "Page<Calculation> findByOperator(Operator operator, Pageable pageable);", "入れるならここ：派生クエリに UserId を足す")
      ],
      checks: []
    }
  ],
  ai: `
${Fig.cards([
  { ic: "🔑", t: "認可の漏れを探す", d: "AI は「ログインしているか」は書いても「そのデータの持ち主か」を忘れがち。他人の id で呼ぶテストを書かせる", tone: "err" },
  { ic: "🙅", t: "自作の認証を書かせない", d: "パスワードのハッシュ化やトークンの発行を AI に一から書かせない。実績のある部品（Spring Security・認可サーバー）を使う", tone: "warn" },
  { ic: "📮", t: "401 / 403 の形", d: "Security を入れたら、エラーの形が ProblemDetail のままか確かめる", tone: "accent" }
])}`,
  questions: [
    { q: "認証と認可の違いとして正しいものは？",
      choices: ["認証は「あなたは誰か」、認可は「それをしてよいか」", "認証は「してよいか」、認可は「誰か」", "同じ意味", "認証はパスワード、認可はメールアドレス"],
      explain: "順番は必ず認証 → 認可。", see: "s1" },
    { q: "トークンを付けずに保護された API を呼んだときのステータスは？",
      choices: ["401", "403", "404", "400"],
      explain: "誰か分からない（未認証）→ 401。名前は Unauthorized だが意味は「未認証」。", see: "s1" },
    { q: "ログインした一般利用者が、管理者専用の API を呼んだときのステータスは？",
      choices: ["403", "401", "404", "500"],
      explain: "誰かは分かったが、許されていない → 403。", see: "s1" },
    { q: "今のこの API に認証が無いことによる危険は？",
      choices: ["URL が分かれば誰でも、全員の計算履歴を見て・書き換えて・消せる", "計算が遅くなる", "DB に保存できない", "危険は無い"],
      explain: "学習用に意図的に外している。公開するなら最初に必要。", see: "s2" },
    { q: "このリポジトリに認証が無いのはなぜ？",
      choices: ["学習の足場を小さくするための判断（ADR 0006・0007）", "Spring Boot 4 で使えないから", "DB が無いから", "忘れているから"],
      explain: "タスク管理 API 時代には JWT 認証があった（archive/task-api）。", see: "s2" },
    { q: "トークン（JWT）方式の特徴は？",
      choices: ["サーバーは状態を持たず、トークンの署名を確かめるだけ", "サーバーがログイン状態を保存する", "Cookie が必須", "パスワードを毎回送る"],
      explain: "ステートレス。代わりに途中で取り消しにくいので有効期限を短くする。", see: "s3" },
    { q: "JWT のペイロードについて正しいものは？",
      choices: ["暗号化されておらず誰でも読めるので、秘密情報を入れてはいけない", "暗号化されているので何を入れてもよい", "サーバーしか読めない", "署名だけが入っている"],
      explain: "署名は改ざんを防ぐだけで、中身を隠さない。", see: "s3" },
    { q: "JWT を API に送るときの一般的な書き方は？",
      choices: ["Authorization: Bearer <トークン>", "URL のクエリ ?token=…", "ボディの JSON", "Content-Type ヘッダ"],
      explain: "URL に入れるとログなどに残りやすい。", see: "s3" },
    { q: "OAuth2 で、パスワードを預かって検証するのは誰の仕事？",
      choices: ["認可サーバー（Keycloak・Auth0 など）", "この API（リソースサーバー）", "画面（クライアント）", "DB"],
      explain: "API はトークンを確かめるだけで、パスワードを扱わない。", see: "s4" },
    { q: "OAuth2 の用語で、この API の立場は？",
      choices: ["リソースサーバー", "認可サーバー", "クライアント", "利用者"],
      explain: "守るべきデータ（リソース）を持ち、トークンを確かめて答える。", see: "s4" },
    { q: "Spring Security が動く位置は？",
      choices: ["Controller より手前（Spring MVC の前のフィルタ）", "Service の中", "Repository の後", "DB の中"],
      explain: "Controller に来た時点で、誰かは分かっている。", see: "s5" },
    { q: "Spring Security を入れたとき、CORS について必要になることは？",
      choices: ["プリフライトがフィルタで弾かれないよう、Security 側にも CORS を設定する", "CORS が不要になる", "CorsConfig を消す", "何もしなくてよい"],
      explain: "CorsConfig の javadoc にもある注意（第 9 章）。", see: "s5" },
    { q: "Security が返す 401 / 403 について、このリポジトリの約束を守るために必要なことは？",
      choices: ["GlobalExceptionHandler を通らないので、ProblemDetail の形で返すよう別途設定する", "何もしなくても ProblemDetail になる", "200 で返す", "エラーを返さない"],
      explain: "不変条件 #4（エラーは ProblemDetail に統一）を守るため。", see: "s5" },
    { q: "ログイン済みの利用者が、URL の id を変えて他人の計算を見られてしまう問題の直し方は？",
      choices: ["データに持ち主（user_id）を持たせ、今の利用者のものだけを探す", "URL を長くする", "id を連番にしない", "ログインを必須にする"],
      explain: "URL の認可とデータの認可は別物。ログイン必須だけでは防げない。", see: "s6" },
    { q: "他人の計算を指定されたとき、403 ではなく 404 を返すことがある理由は？",
      choices: ["その id のデータが存在すること自体を相手に教えないため", "403 は使えないから", "404 の方が速いから", "決まりは無い"],
      explain: "403 だと「存在はする」ことが分かってしまう。", see: "s6" },
    { q: "AI に「ログイン機能を作って」と頼んだら、パスワードのハッシュ化から自作し始めた。どうする？",
      choices: ["実績のある部品（Spring Security・認可サーバー）を使うよう方針を変える", "そのまま任せる", "ハッシュ化をやめさせる", "テストを省く"],
      explain: "認証は自作すると穴を作りやすい領域。", see: "s4" }
  ]
});
