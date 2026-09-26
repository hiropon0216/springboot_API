// 第 26 章 総まとめ：全体の地図と、次に学ぶこと（書き方は AUTHORING.md）
Calc.register({
  no: 26,
  goal: [
    "このリポジトリの全体像を、1 枚の地図で説明できる",
    "どの概念がどのファイルにあるかを引ける",
    "このリポジトリに無いもの（実務の REST API との差）を言える",
    "次に何を、どの順で学ぶかを決められる"
  ],
  sections: [
    {
      id: "s1",
      title: "全体の地図",
      body: `
${Fig.stack([
  { t: "🧑‍💻 クライアント", d: "curl・api-console・Swagger UI・画面（第 1 章）", tone: "dim" },
  { t: "🌐 ブラウザの守り・入口", d: "CORS（第 9 章）／ 認証・認可は未実装（第 18 章）", tone: "warn" },
  { t: "🚪 Controller ＝ 契約", d: "URL・メソッド・ステータス（5）、ProblemDetail（6）、ページング・Merge Patch（7）、OpenAPI（8）", tone: "ok" },
  { t: "🧮 Service ＝ 業務", d: "計算・業務ルール・トランザクション（12）、DTO への変換（11）", tone: "accent" },
  { t: "🗄️ Repository ／ 外部 API の窓口", d: "JPA・派生クエリ・ページング（15）、外部 API は座学（13）", tone: "lec" },
  { t: "🐘 DB", d: "つなぎ方（14）、スキーマ管理（16）、N+1・インデックス（17）", tone: "dim" }
], "縦の流れがリクエストの旅（第 4 章）。層の向きは上から下だけ（第 10 章）")}
${Fig.cards([
  { ic: "🧪", t: "品質", d: "テスト 4 層（20）・ガードレール（21）", tone: "ok" },
  { ic: "📦", t: "配達", d: "Docker（22）・CI/CD（23）", tone: "accent" },
  { ic: "📈", t: "運用", d: "設定・Actuator・ログ・可観測性（24）", tone: "lec" },
  { ic: "🤖", t: "進め方", d: "文書・スプリント・頼み方・レビュー（25）", tone: "warn" }
], "縦の流れを、横から支える 4 つ")}`,
      refs: [
        code("README.md", "## これで学べること", "README の概念 → 場所の対応表")
      ],
      checks: [
        { q: "地図の中で、今のこのリポジトリに「無い」ものを 2 つ挙げよう。",
          a: "認証・認可（第 18 章）と、外部 API の呼び出し（第 13 章）。どちらも座学として扱った。" }
      ]
    },
    {
      id: "s2",
      title: "概念 → ファイルの索引",
      body: `
${Fig.matrix("概念", ["主なファイル", "章"], [
  { h: "HTTP の受け口・契約", c: ["CalculationController", "1・5・7"] },
  { h: "業務ルール・トランザクション", c: ["CalculationService", "4・12"] },
  { h: "DB の 1 行", c: ["Calculation（エンティティ）", "11・15"] },
  { h: "DB の窓口", c: ["CalculationRepository", "15"] },
  { h: "API の形", c: ["dto/（Request・Response・MemoUpdateRequest）", "11・7"] },
  { h: "形の変換", c: ["CalculationMapper", "11"] },
  { h: "エラーの形", c: ["common/exception/GlobalExceptionHandler", "6"] },
  { h: "CORS・説明書", c: ["config/CorsConfig・OpenApiConfig", "8・9"] },
  { h: "設定・プロファイル", c: ["application.yml・application-test.yml", "2・14・24"] },
  { h: "層のルール", c: ["LayeredArchitectureTest", "10・21"] },
  { h: "箱と配達", c: ["Dockerfile・compose.yaml・ci.yml・render.yaml", "22・23"] },
  { h: "進め方・約束", c: ["CLAUDE.md・docs/", "25"] }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "@RestController", "入口"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "@Service", "業務"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "@RestControllerAdvice", "エラーの形")
      ],
      checks: [
        { q: "「DB に列を足して API にも出す」とき、索引のどの行のファイルを触る？",
          a: "Calculation（エンティティ）・dto の CalculationResponse・CalculationMapper。必要なら Service と spec のデータモデルも。" }
      ]
    },
    {
      id: "s3",
      title: "このリポジトリに無いもの：実務の地図",
      body: `
${Fig.matrix("実務の REST API でよく出てくるもの", ["このリポジトリ", "章"], [
  { h: "認証・認可（Spring Security・OAuth2・JWT）", c: [{ v: "無い（最大の差）", tone: "err" }, "18・19"] },
  { h: "スキーマのバージョン管理（Flyway）", c: [{ v: "無い（ddl-auto: update）", tone: "err" }, "16"] },
  { h: "複数のリソースとリレーション・N+1 対策", c: [{ v: "無い（1 テーブル）", tone: "err" }, "17"] },
  { h: "同時更新の制御（楽観ロック・ETag / If-Match）", c: [{ v: "無い（ADR 0008 で見送り）", tone: "warn" }, "—"] },
  { h: "本物の DB でのテスト（Testcontainers）", c: [{ v: "無い（H2）", tone: "warn" }, "20"] },
  { h: "メトリクス・トレース・構造化ログ", c: [{ v: "無い（Actuator の health だけ）", tone: "warn" }, "24"] },
  { h: "外部 API の呼び出し", c: [{ v: "無い", tone: "warn" }, "13"] },
  { h: "回数制限（レート制限）", c: [{ v: "無い", tone: "warn" }, "19"] },
  { h: "本番へのデプロイの実績", c: [{ v: "構成だけ（Render は未設定）", tone: "warn" }, "23"] }
], "このリポジトリで学べるのは「1 リソースの REST API の設計の型」。実務では上の表が加わる")}`,
      refs: [
        code("docs/spec.md", "### 今後の候補（未着手・任意）", "次の候補の一覧")
      ],
      checks: [
        { q: "楽観ロック（ETag / If-Match）を入れなかった理由を ADR 0008 から言おう。",
          a: "同時更新の上書き防止の定番だが、@Version だけでは REST 越しに効かず、ETag まで入れて初めて意味がある。「必要最低限」を超えるので見送った。" }
      ]
    },
    {
      id: "s4",
      title: "次に学ぶ順番",
      body: `
${Fig.timeline([
  { t: "認証・認可", d: "Spring Security ＋ OAuth2 Resource Server。データの持ち主の確認まで（第 18・19 章の実践）", tone: "err" },
  { t: "Flyway", d: "今のテーブルを V1 にし、ddl-auto: validate に切り替える（第 16 章）", tone: "warn" },
  { t: "2 つ目のリソースとリレーション", d: "ゴールデンパスで新しい機能フォルダを足し、N+1 を観察して直す（第 10・17 章）", tone: "accent" },
  { t: "Testcontainers", d: "@DataJpaTest を本物の PostgreSQL で回す（第 20 章）", tone: "lec" },
  { t: "可観測性", d: "メトリクスと構造化ログを入れ、ダッシュボードで見る（第 24 章）", tone: "lec" },
  { t: "本番へのデプロイ", d: "Render に Blueprint で出し、CI/CD を最後までつなぐ（第 23 章）", tone: "ok" }
], "どれも「今の 1 リソースに 1 つだけ足す」形で学べる。1 つ足すごとに brainstorm → ADR → spec の順で")}`,
      refs: [
        code("CLAUDE.md", "## ゴールデンパス（お手本 feature）", "新しいリソースを足す手順")
      ],
      checks: []
    },
    {
      id: "s5",
      title: "自分で広げる：AI と一緒に 1 つ足してみる",
      body: `
${Fig.flow([
  { ic: "💬", t: "壁打ち", s: "「学習記録を API に保存したい」<br>を AI と詰める", tone: "lec" },
  { ic: "📄", t: "brainstorm ・ ADR ・ spec", s: "2 つ目のリソース<br>/api/v1/quiz-results の契約", tone: "accent" },
  { ic: "🛠️", t: "ゴールデンパスで実装", s: "AI に層の順で書かせ<br>verify を緑に", tone: "ok" },
  { ic: "▶️", t: "動かして記録", s: "叩いて確かめ<br>progress に書く", tone: "warn" }
], ["", "", ""], { dir: "v", caption: "spec の「今後の候補」にある演習。この教材で学んだ全部を 1 周使う" })}`,
      refs: [
        code("docs/spec.md", "学習記録を API（DB）に保存する演習", "演習の候補")
      ],
      checks: []
    }
  ],
  ai: `
${Fig.cards([
  { ic: "🗺️", t: "地図を渡す", d: "AI に頼むとき、この章の地図のどこを触るのかを言う。範囲が決まると出力がぶれない", tone: "accent" },
  { ic: "⚖️", t: "判断は人間に残す", d: "何を足し、何を見送るか（ADR の不採用案）を決めるのは人間の仕事", tone: "lec" },
  { ic: "🔁", t: "教材も一緒に直す", d: "実装を変えたら、関係する章の本文も読み直す（リンク切れは機械が教えてくれる）", tone: "ok" }
])}`,
  questions: [
    { q: "（総合）リクエストが通る順番として正しいものは？",
      choices: ["Controller → Service → Repository → DB", "Repository → Service → Controller", "Service → Controller → DB", "DB → Controller → Service"],
      explain: "第 4 章の地図。層の向きは上から下だけ（第 10 章）。", see: "s1" },
    { q: "（総合）0 で割ったとき 422 を返す仕組みとして正しいものは？",
      choices: ["Service が BusinessRuleException を投げ、GlobalExceptionHandler が 422 の ProblemDetail にする", "Controller が if 文で 422 を返す", "DB が 422 を返す", "Jackson が 422 を返す"],
      explain: "投げる場所と番号を決める場所を分ける（第 6 章）。", see: "s2" },
    { q: "（総合）エンティティをそのまま API で返さない理由は？",
      choices: ["DB の変更が API の契約の変更になり、内部の情報まで漏れるから", "遅いから", "JSON にできないから", "Spring の決まり"],
      explain: "内部表現を公開しない（第 11・19 章）。", see: "s2" },
    { q: "（総合）一覧に ?page=&size= を入れ、size の上限を 100 にしている理由は？",
      choices: ["件数が増えても応答を軽く保ち、全件を読ませる攻撃も防ぐため", "HTTP の決まり", "DB が 100 件しか扱えないから", "画面の都合"],
      explain: "性能とセキュリティの両方（第 7・19 章）。", see: "s2" },
    { q: "（総合）@Transactional を置く場所は？",
      choices: ["Service", "Controller", "Repository", "DTO"],
      explain: "1 つの業務を 1 つのまとまりとして成功・取り消し（第 12 章）。", see: "s1" },
    { q: "（総合）手元・テスト・本番で DB の接続先が変わる仕組みは？",
      choices: ["プロファイルと環境変数で、設定だけを切り替えている", "環境ごとにコードを書き換えている", "DB が自動で判断する", "Docker が切り替える"],
      explain: "同じコードのまま（第 2・14・24 章）。", see: "s2" },
    { q: "（総合）ddl-auto: update のまま列の名前を変えると？",
      choices: ["新しい空の列が足され、古い列とデータは置き去りになる", "列の名前が変わる", "起動しない", "自動で Flyway が動く"],
      explain: "名前変更・削除が必要になったら先に Flyway（第 16 章）。", see: "s3" },
    { q: "（総合）N+1 問題に気づく第一歩は？",
      choices: ["1 リクエストで何本の SQL が出たかをログで数える", "コードを読む", "テストを増やす", "インデックスを足す"],
      explain: "show-sql（第 15・17 章）。", see: "s3" },
    { q: "（総合）CORS について正しいものは？",
      choices: ["ブラウザの利用者を守る仕組みで、認証の代わりにはならない", "サーバーを攻撃から守る仕組み", "curl にも効く", "設定すれば認証は不要"],
      explain: "第 9・18 章。", see: "s1" },
    { q: "（総合）Controller が Repository を直接使うコードを止めるのは？",
      choices: ["ArchUnit のテスト", "Spotless", "Checkstyle", "Docker"],
      explain: "ガードレール（第 10・21 章）。", see: "s2" },
    { q: "（総合）テストで守れていないものは？",
      choices: ["本物の PostgreSQL での動き", "計算の正しさ", "HTTP の形", "層のルール"],
      explain: "テストは H2。Testcontainers で埋める（第 20 章）。", see: "s3" },
    { q: "（総合）Dockerfile を 2 段にし、一般ユーザーで動かす理由は？",
      choices: ["本番の箱を小さく、攻撃されにくく、乗っ取られても被害を狭くするため", "速く起動するため", "テストのため", "Docker の決まり"],
      explain: "第 19・22 章。", see: "s1" },
    { q: "（総合）CI の deploy ジョブが needs: build を持つ理由は？",
      choices: ["検査が通った版だけを本番に届けるため", "build を速くするため", "並べて動かすため", "Secrets を使うため"],
      explain: "第 23 章。", see: "s1" },
    { q: "このリポジトリと実務の REST API の一番大きな差は？",
      choices: ["認証・認可が無いこと", "Java を使っていること", "JSON を使っていること", "テストがあること"],
      explain: "公開するなら最初に必要になる（第 18 章）。", see: "s3" },
    { q: "次に学ぶ順番として、このリポジトリで提案しているものの最初は？",
      choices: ["認証・認可", "本番へのデプロイ", "可観測性", "Testcontainers"],
      explain: "最大の差から埋める。どれも 1 つずつ足す形で学べる。", see: "s4" },
    { q: "（総合）AI に新しい機能を頼む前に、人間が文書にしておくべきものは？",
      choices: ["合意（brainstorm）・決定の理由（ADR）・契約と受け入れ基準（spec）", "コードの行数", "エディタの設定", "何も要らない"],
      explain: "AI は文書を入力にする。判断は人間が残す（第 25 章）。", see: "s5" },
    { q: "（総合）AI が「完了しました」と報告した。この教材で学んだ確かめ方として最も適切なのは？",
      choices: ["verify が緑か・実際に叩いた証拠があるか・確かめていないことが「検証不能」と書かれているかを見る", "報告を信じる", "コードの長さを見る", "コメントを数える"],
      explain: "読むだけで合格を出さない（第 21・25 章）。", see: "s5" }
  ]
});
