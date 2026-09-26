// 第 13 章 外部 API を呼ぶ（座学。書き方は AUTHORING.md）
Calc.register({
  no: 13,
  goal: [
    "自分の API が「別の API のクライアント」になる場面と、その難しさを説明できる",
    "Spring で外部 API を呼ぶ道具（RestClient・HTTP Interface）の位置づけが分かる",
    "外部呼び出しをどの層に置き、外の形をどう内側に入れないかを説明できる",
    "タイムアウト・リトライ・失敗時のステータス（502 / 503 / 504）の考え方が分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "自分の API が、別の API のクライアントになる",
      body: `
<p>このリポジトリは外部の API を呼んでいない。ここでは「<b>通貨の換算機能を足す</b>」という架空の例で考える。
たとえば「100 ドルは何円？」に答えるには、為替レートを外部のサービスに聞く必要がある。</p>
${Fig.flow([
  { ic: "🧑‍💻", t: "クライアント", s: "GET /api/v1/conversions?from=USD&to=JPY&amount=100" },
  { ic: "☕", t: "この API", s: "レートを聞いて計算する", tone: "accent" },
  { ic: "🏦", t: "為替レート API（外部）", s: "自分では直せない・止まることもある", tone: "warn" }
], [{ f: "頼む", b: "15000 円" }, { f: "レートを聞く", b: "150.0" }], { caption: "外部 API は自分の管理外。遅い・止まる・形が変わる、を前提に設計する" })}
${Fig.cards([
  { ic: "🐢", t: "遅い", d: "相手が遅いと、こちらの応答も遅くなる", tone: "warn" },
  { ic: "💤", t: "止まる", d: "相手の障害で、こちらの機能も使えなくなる", tone: "err" },
  { ic: "🔀", t: "形が変わる", d: "相手の都合で項目名や意味が変わる", tone: "lec" }
], "DB と違い、外部 API はトランザクションで取り消せない（相手に届いた要求は戻せない）")}`,
      refs: [],
      checks: []
    },
    {
      id: "s2",
      title: "呼ぶ道具：RestClient と HTTP Interface",
      body: `
${Fig.matrix("道具", ["書き方", "今の位置づけ"], [
  { h: "RestClient", c: ["client.get().uri(…).retrieve().body(…) と流れるように書く", { v: "同期処理の標準", tone: "ok" }] },
  { h: "HTTP Interface（@HttpExchange）", c: ["interface に宣言するだけ。実装は Spring が作る", { v: "宣言的で読みやすい", tone: "ok" }] },
  { h: "WebClient", c: ["非同期・リアクティブ", { v: "WebFlux 向け", tone: "dim" }] },
  { h: "RestTemplate", c: ["昔からある書き方", { v: "新規では使わない", tone: "warn" }] }
])}
${Fig.code([
  { c: '@HttpExchange("https://rates.example.com")', tag: "相手の住所", tone: "accent" },
  { c: "interface ExchangeRateClient {" },
  { c: '  @GetExchange("/rates/{from}/{to}")', tag: "GET /rates/USD/JPY", tone: "ok" },
  { c: "  RateResponse get(@PathVariable String from, @PathVariable String to);" },
  { c: "}" }
], "HTTP Interface の例（架空）。Repository と同じく「interface を書けば実装は Spring が作る」発想")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationRepository.java", "public interface CalculationRepository extends JpaRepository", "同じ発想：interface だけ書き、実装は Spring が作る")
      ],
      checks: []
    },
    {
      id: "s3",
      title: "どこに置くか：外の形を内側に入れない",
      body: `
${Fig.stack([
  { t: "Controller", d: "変わらない。外部 API の存在を知らない", tone: "ok" },
  { t: "Service", d: "ExchangeRateClient（interface）を受け取って使う。業務の判断はここ", tone: "accent" },
  { t: "Repository ／ 外部 API クライアント", d: "どちらも「外の世界への窓口」。同じ高さに並ぶ", tone: "lec" },
  { t: "DB ／ 為替レート API", d: "自分のコードの外", tone: "dim" }
], "外部 API のクライアントは、Repository と同じ「外への窓口」の層に置く。Controller から直接呼ばない")}
${Fig.pairs("外部 API の形（相手が決める）", "この API の中の形（自分が決める）", [
  { l: "RateResponse { base, quote, mid_rate, ts }", r: "ExchangeRate(from, to, rate)", tone: "warn" }
], "相手の JSON の形をそのまま Service や DTO に広げない。窓口で自分たちの型に変換する（第 11 章の Mapper と同じ考え）", "→")}
<p>こうしておくと、相手の形が変わっても直すのは窓口だけで済む。テストでは interface を偽物に差し替えられる（第 2 章の DI）。</p>`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "CalculationService(CalculationRepository repository)", "入れるならここ：コンストラクタに ExchangeRateClient を足す"),
        code("src/main/java/com/example/calc/config/OpenApiConfig.java", "@Bean", "入れるならここ：config/ に RestClient などの部品を作る設定クラスを置く")
      ],
      checks: [
        { q: "もし Controller から直接外部 API を呼んだら、第 10 章のどの約束に反する？",
          a: "Controller は HTTP の通訳に徹し、外への窓口（Repository と同じ層）は Service を通して使う、という層の約束。業務の判断（失敗したらどうするか）が Controller に漏れる。" }
      ]
    },
    {
      id: "s4",
      title: "失敗に備える：タイムアウト・リトライ・遮断",
      body: `
${Fig.cards([
  { ic: "⏱️", t: "タイムアウト（必須）", d: "つながるまで・返事までの上限を必ず決める。無いと、相手が固まったときこちらのスレッドも固まり続け、アプリ全体が止まる", tone: "err" },
  { ic: "🔁", t: "リトライ（慎重に）", d: "一時的な失敗なら数回だけ、間隔を空けて。冪等な要求（GET など）に限る（第 5 章）", tone: "warn" },
  { ic: "🔌", t: "遮断（サーキットブレーカー）", d: "失敗が続いたら、しばらく呼ぶのをやめてすぐ失敗を返す。相手の回復を邪魔しない", tone: "lec" },
  { ic: "🗂️", t: "代わりの値（フォールバック）", d: "少し古いレートを使う、など。使ってよいかは業務の判断", tone: "accent" }
])}
${Fig.flow([
  { ic: "☕", t: "この API", s: "スレッド 1 本で待つ" },
  { ic: "🏦", t: "相手が固まる", s: "返事が来ない", tone: "err" },
  { ic: "🧊", t: "タイムアウトが無いと", s: "待つスレッドが増え続け<br>全部の API が応答しなくなる", tone: "err" }
], ["呼ぶ", ""], { caption: "1 つの外部 API の障害が、関係ない機能まで巻き込む。タイムアウトは最初の防波堤" })}`,
      refs: [],
      checks: []
    },
    {
      id: "s5",
      title: "失敗をどう返すか：502 / 503 / 504",
      body: `
${Fig.matrix("起きたこと", ["返すステータス", "意味"], [
  { h: "相手がエラーや壊れた応答を返した", c: [{ v: "502 Bad Gateway", tone: "err" }, "中継先が正しく答えなかった"] },
  { h: "遮断中・相手が止まっている", c: [{ v: "503 Service Unavailable", tone: "err" }, "今は使えない（あとで再試行してよい）"] },
  { h: "相手がタイムアウトした", c: [{ v: "504 Gateway Timeout", tone: "err" }, "中継先が時間内に答えなかった"] },
  { h: "こちらのバグ", c: [{ v: "500", tone: "err" }, "自分の問題"] }
], "5xx の中でも「誰の問題か」を分ける。外部の障害を 500（自分のバグ）と区別すると、調査の出発点が変わる")}
${Fig.flow([
  { ic: "🏦", t: "外部 API の失敗", s: "タイムアウト・5xx", tone: "warn" },
  { ic: "💥", t: "ExternalServiceException", s: "common/exception に足す", tone: "accent" },
  { ic: "🛎️", t: "GlobalExceptionHandler", s: "502 / 503 / 504 の ProblemDetail<br>相手のエラー文は出さない", tone: "ok" }
], ["窓口が例外に変換", "@ExceptionHandler"], { caption: "第 6 章と同じ形：投げる場所と、番号を決める場所を分ける" })}`,
      refs: [
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "@ExceptionHandler(ResourceNotFoundException.class)", "入れるならここ：同じ形で外部 API の失敗用のハンドラを足す")
      ],
      checks: []
    },
    {
      id: "s6",
      title: "テスト：本物の外部 API を呼ばない",
      body: `
${Fig.compare(
  { t: "🧪 単体テスト", tone: "ok", html: "ExchangeRateClient（interface）を偽物にして Service をテスト。レート 150 を返す偽物、タイムアウトを投げる偽物…" },
  { t: "🎭 結合テスト", tone: "lec", html: "偽の HTTP サーバー（WireMock・MockRestServiceServer など）を立て、決めた応答を返させる。遅延やエラーも再現できる" },
  "本物の外部 API をテストで呼ぶと、相手の都合でテストが落ち、課金や制限にも当たる"
)}`,
      refs: [
        code("src/test/java/com/example/calc/calculation/CalculationServiceTest.java", "mock(CalculationRepository.class)", "同じやり方：外への窓口を偽物にして Service をテストする")
      ],
      checks: []
    }
  ],
  ai: `
${Fig.cards([
  { ic: "⏱️", t: "タイムアウトの有無を必ず見る", d: "AI が書く外部呼び出しは、タイムアウトが既定のまま（無制限に近い）のことが多い", tone: "err" },
  { ic: "📄", t: "相手の OpenAPI を渡す", d: "外部 API の契約書（第 8 章）を AI に渡すと、呼び出しコードが正確になる", tone: "accent" },
  { ic: "🧱", t: "相手の形を内側に広げさせない", d: "外部の DTO が Service や自分の API の応答にまで出ていないか", tone: "warn" }
])}`,
  questions: [
    { q: "外部 API を呼ぶ処理が DB の処理と大きく違う点は？",
      choices: ["相手に届いた要求はトランザクションで取り消せない", "SQL を書く必要がある", "必ず速い", "テストが不要"],
      explain: "外部 API は自分の管理外。遅い・止まる・形が変わる、も前提にする。", see: "s1" },
    { q: "外部 API について前提にすべきでないものは？",
      choices: ["いつも速く、止まらず、形も変わらない", "遅くなることがある", "止まることがある", "形が変わることがある"],
      explain: "管理外のものは、失敗する前提で設計する。", see: "s1" },
    { q: "Spring で同期的に外部 API を呼ぶ、今の標準的な道具は？",
      choices: ["RestClient（または HTTP Interface）", "RestTemplate", "JDBC", "Jackson"],
      explain: "RestTemplate は昔からの書き方で、新規では RestClient や HTTP Interface を使う。", see: "s2" },
    { q: "HTTP Interface（@HttpExchange）の特徴は？",
      choices: ["interface に宣言するだけで、呼び出しの実装は Spring が作る", "非同期専用", "DB に接続する", "テスト専用"],
      explain: "Repository と同じ「宣言すれば実装は Spring」の発想。", see: "s2" },
    { q: "外部 API のクライアントを置く層として適切なのは？",
      choices: ["Repository と同じ「外への窓口」の層（Service から使う）", "Controller", "DTO", "GlobalExceptionHandler"],
      explain: "Controller から直接呼ぶと、失敗時の判断などの業務ロジックが web 層に漏れる。", see: "s3" },
    { q: "外部 API の応答の JSON の形を、そのまま自分の API の応答に使うと何が困る？",
      choices: ["相手の都合で形が変わると、自分の API の契約まで変わってしまう", "速度が落ちる", "型が足りなくなる", "テストが通らない"],
      explain: "窓口で自分たちの型に変換し、外の形を内側に入れない。", see: "s3" },
    { q: "外部 API のクライアントを interface にして Service のコンストラクタで受け取る利点は？",
      choices: ["テストで偽物に差し替えられ、相手の形が変わっても直すのは窓口だけで済む", "速くなる", "タイムアウトが不要になる", "HTTP が不要になる"],
      explain: "第 2 章の DI と同じ。", see: "s3" },
    { q: "外部 API 呼び出しで、タイムアウトを必ず設定すべき理由は？",
      choices: ["相手が固まると待つスレッドが増え続け、関係ない機能まで応答しなくなるから", "通信を暗号化するため", "リトライのため", "ログを減らすため"],
      explain: "1 つの外部障害がアプリ全体を止めうる。", see: "s4" },
    { q: "リトライしてよい要求として最も安全なのは？",
      choices: ["冪等な要求（GET など）", "送金などの POST", "すべての要求", "タイムアウトした POST"],
      explain: "冪等でない要求を送り直すと、二重に処理されうる（第 5 章）。", see: "s4" },
    { q: "サーキットブレーカー（遮断）の目的は？",
      choices: ["失敗が続く相手をしばらく呼ばず、すぐ失敗を返して自分と相手を守る", "通信を速くする", "エラーを隠す", "データを保存する"],
      explain: "相手の回復を邪魔せず、こちらの待ち時間も減らす。", see: "s4" },
    { q: "外部 API がタイムアウトしたとき、この API が返すステータスとして最も適切なのは？",
      choices: ["504 Gateway Timeout", "400", "404", "200"],
      explain: "中継先が時間内に答えなかった。自分のバグ（500）とは区別する。", see: "s5" },
    { q: "外部 API が壊れた応答を返したときのステータスとして適切なのは？",
      choices: ["502 Bad Gateway", "422", "401", "201"],
      explain: "中継先が正しく答えなかった。", see: "s5" },
    { q: "外部 API の失敗を 500 と区別して返す利点は？",
      choices: ["自分のバグか外部の障害かが分かり、調査の出発点が変わる", "速くなる", "利用者が喜ぶ", "ログが減る"],
      explain: "5xx の中でも「誰の問題か」を分ける。", see: "s5" },
    { q: "外部 API の失敗を ProblemDetail で返すとき、相手のエラーメッセージをそのまま detail に入れるべきでない理由は？",
      choices: ["相手の内部情報や、こちらの構成が漏れうるから", "長すぎるから", "英語だから", "ステータスが変わるから"],
      explain: "500 と同じく、原因はログに残して利用者には整えた文言を返す（第 6 章）。", see: "s5" },
    { q: "外部 API を使う機能のテストで避けるべきことは？",
      choices: ["毎回、本物の外部 API を呼ぶ", "interface を偽物に差し替える", "偽の HTTP サーバーで応答を再現する", "タイムアウトを再現する"],
      explain: "相手の都合でテストが落ち、課金や制限にも当たる。", see: "s6" },
    { q: "AI が書いた外部 API の呼び出しコードをレビューするとき、最優先で確かめることは？",
      choices: ["タイムアウトが設定されているか", "変数名の長さ", "コメントの量", "インデント"],
      explain: "既定のままだと、相手の障害でアプリ全体が止まりうる。", see: "s4" }
  ]
});
