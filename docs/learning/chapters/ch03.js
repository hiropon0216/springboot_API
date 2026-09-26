// 第 3 章 最低限のアノテーション地図（書き方は AUTHORING.md）
Calc.register({
  no: 3,
  goal: [
    "アノテーションとは何か、「誰が読んでいるのか」を説明できる",
    "このリポジトリに出てくるアノテーションを 8 つの分類に振り分けられる",
    "アノテーションを 1 つ消す・足すだけで振る舞いが大きく変わる理由が分かり、レビューで注目できる"
  ],
  sections: [
    {
      id: "s1",
      title: "アノテーションとは：コードに貼る付箋",
      body: `
<p><code>@</code> で始まる印を<b>アノテーション</b>と呼ぶ。クラスやメソッド、引数に貼る<b>付箋</b>。
<b>付箋そのものは何もしない</b>。付箋を<b>読んで動く誰か</b>がいる。</p>
${Fig.flow([
  { ic: "🏷️", t: "付箋を貼る", s: "@RestController<br>@Valid / @Entity …", tone: "accent" },
  { ic: "👀", t: "誰かが読む", s: "Spring・Bean Validation<br>Hibernate・springdoc・JUnit", tone: "lec" },
  { ic: "⚙️", t: "振る舞いが変わる", s: "部品になる・検証される<br>DB と対応する…", tone: "ok" }
], ["起動時・実行時に", "読んだ結果"])}
${Fig.cards([
  { ic: "🌱", t: "Spring", d: "起動時。部品を集め、URL の振り分け表を作る", tone: "accent" },
  { ic: "✅", t: "Bean Validation", d: "リクエストが来たとき。入力をチェック", tone: "warn" },
  { ic: "🗄️", t: "Hibernate", d: "DB に読み書きするとき。型とテーブルを対応させる", tone: "ok" },
  { ic: "📘", t: "springdoc", d: "説明書を作るとき。Swagger UI に載せる", tone: "lec" },
  { ic: "🧪", t: "JUnit / Spring Test", d: "テストのとき。必要な部品だけ起動", tone: "dim" }
], "付箋を読む 5 人。細かい書き方は覚えなくてよい。「どの分類の、何の役の付箋か」が言えれば十分")}
<p>このリポジトリの付箋は、下の <b>8 つの分類</b>に振り分けられる。2〜7 節で 1 つずつ実物を見る。</p>
${Fig.matrix("分類", ["代表的な付箋", "読む人"], [
  { h: "① 起動・部品登録", c: [{ v: "@SpringBootApplication @Service …", tone: "accent" }, "Spring"] },
  { h: "② HTTP の受け口", c: [{ v: "@GetMapping @RequestBody …", tone: "ok" }, "Spring"] },
  { h: "③ 入力の検証", c: [{ v: "@Valid @NotNull @Size …", tone: "warn" }, "Bean Validation"] },
  { h: "④ エラー処理", c: [{ v: "@RestControllerAdvice …", tone: "err" }, "Spring"] },
  { h: "⑤ DB（JPA）", c: [{ v: "@Entity @Column @Id …", tone: "lec" }, "Hibernate"] },
  { h: "⑥ トランザクション", c: [{ v: "@Transactional", tone: "lec" }, "Spring"] },
  { h: "⑦ API の説明書", c: [{ v: "@Operation @ApiResponse …", tone: "dim" }, "springdoc"] },
  { h: "⑧ テスト", c: [{ v: "@Test @WebMvcTest …", tone: "dim" }, "JUnit / Spring Test"] }
])}`,
      refs: [
        code("src/main/java/com/example/calc/CalcApiApplication.java", "@SpringBootApplication", "いちばん最初に読まれる付箋。付箋 1 つとメソッド 1 行でアプリが起動する")
      ],
      checks: [
        { q: "第 2 章で見た @SpringBootApplication は、上の表の「誰」が「いつ」読む付箋か？",
          a: "Spring が起動時に読む。「このクラスのパッケージから下を見て回り、部品を集めよ」という起点の印。" }
      ]
    },
    {
      id: "s2",
      title: "分類 ①：起動と部品の登録（DI）",
      body: `
${Fig.stack([
  { t: "@RestController", d: "HTTP の窓口の部品 → CalculationController", tone: "ok" },
  { t: "@Service", d: "業務ロジックの部品 → CalculationService", tone: "accent" },
  { t: "@Repository", d: "DB の窓口の部品 → CalculationRepository", tone: "lec" }
], "3 つとも「Spring に部品として登録して」という意味では同じ。名前を分けているのは、どの層の部品かを人間と AI に伝えるため（層は第 10 章）")}
${Fig.code([
  { c: "@Configuration", tag: "設定用のクラス", tone: "warn" },
  { c: "public class OpenApiConfig {" },
  { c: "  @Bean", tag: "戻り値を部品として登録", tone: "warn" },
  { c: "  OpenAPI calcApiOpenAPI() { return new OpenAPI()...; }" },
  { c: "}" }
], "自分で作った部品を登録したいときは @Configuration ＋ @Bean")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "@RestController", "HTTP の窓口"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "@Service", "業務ロジック"),
        code("src/main/java/com/example/calc/calculation/CalculationRepository.java", "@Repository", "DB の窓口"),
        code("src/main/java/com/example/calc/config/OpenApiConfig.java", "@Bean", "@Configuration のクラスの中で、部品を自分で作って登録している")
      ],
      checks: [
        { q: "CalculationRepository の javadoc を読むと、@Repository について何と書いてある？",
          a: "「無くても動く（JpaRepository の継承だけで検出される）が、『これは永続化層』と明示するために付けている」。動作のためではなく、役割を伝えるための付箋もある。" }
      ]
    },
    {
      id: "s3",
      title: "分類 ②：HTTP の受け口",
      body: `
<p>第 1 章の「リクエストの欄」と、それを受け取る付箋は 1 対 1 に対応している。</p>
${Fig.pairs("HTTP の欄（第 1 章）", "受け取る付箋", [
  { l: "URL の入口<br><code>/api/v1/calculations</code>", r: "@RequestMapping", rnote: "クラスに付ける", tone: "ok" },
  { l: "メソッド<br><code>GET / POST / PUT …</code>", r: "@GetMapping @PostMapping …", rnote: "メソッドに付ける", tone: "accent" },
  { l: "パスの一部<br><code>/calculations/<b>5</b></code>", r: "@PathVariable", rnote: "引数に付ける", tone: "warn" },
  { l: "クエリ<br><code>?operator=ADD</code>", r: "@RequestParam", rnote: "引数に付ける", tone: "lec" },
  { l: "ボディ<br><code>{\"left\":2, …}</code>", r: "@RequestBody", rnote: "引数に付ける", tone: "err" }
], "HTTP のどの部分を、どの引数で受け取るかを宣言するだけ。取り出す作業は Spring がやる", "→")}
${Fig.code([
  { c: '@PutMapping("/{id}")', tag: "PUT で 1 件", tone: "accent" },
  { c: "public CalculationResponse replace(" },
  { c: "    @PathVariable Long id,", tag: "どれを（URL）", tone: "warn" },
  { c: "    @Valid @RequestBody CalculationRequest request)", tag: "何に（ボディ）", tone: "err" }
], "全置換（PUT）の宣言。対象は URL、中身はボディ、という分担")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "public CalculationResponse get(@PathVariable Long id)", "URL の {id} を受け取る"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "@RequestParam(required = false) Operator operator", "クエリの ?operator= を受け取る（省略可）"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "@Valid @RequestBody CalculationRequest request, UriComponentsBuilder uriBuilder", "ボディの JSON を受け取る")
      ],
      checks: [
        { q: "全置換（PUT）のメソッドの引数を見よう。@PathVariable と @RequestBody の両方がある。それぞれ何を受け取っている？",
          a: "@PathVariable は「どの記録か」（URL の id）、@RequestBody は「何に置き換えるか」（ボディの計算式）。対象は URL、内容はボディ、という分担。" }
      ]
    },
    {
      id: "s4",
      title: "分類 ③：入力の検証",
      body: `
${Fig.compare(
  { t: "📜 ルール → 入力の型（DTO）に", tone: "warn", html: Fig.code([
    { c: "record CalculationRequest(" },
    { c: "  @NotNull @Digits(...) BigDecimal left,", tag: "必須・桁数", tone: "warn" },
    { c: "  @NotNull Operator operator,", tag: "必須", tone: "warn" },
    { c: "  @NotNull @Digits(...) BigDecimal right)", tag: "必須・桁数", tone: "warn" }
  ]) },
  { t: "🔘 スイッチ → 受け取る側（Controller）に", tone: "accent", html: Fig.code([
    { c: "create(" },
    { c: "  @Valid @RequestBody CalculationRequest request", tag: "検証して", tone: "accent" },
    { c: ")" }
  ]) + "<p>@Valid が無いと、ルールがあっても誰もチェックしない</p>" }
)}
${Fig.flow([
  { ic: "📨", t: "JSON が届く" },
  { ic: "🔎", t: "@Valid でルールを確認", tone: "warn" },
  { ic: "✅", t: "OK → Controller へ", s: "違反なら Controller は呼ばれず 400", tone: "ok" }
], ["型にする", "判定"])}
<div class="note"><b>要注意</b>　<code>@Valid</code> を消しても、コンパイルは通り、正しい入力なら普通に動く。でもルールが一切チェックされなくなる。
<b>「付いていないこと」は目に見えにくい</b>。</div>
${Fig.cards([
  { t: "@NotNull", d: "必須（null 不可）", tone: "warn" },
  { t: "@Size(max = 200)", d: "文字数の上限", tone: "warn" },
  { t: "@Digits", d: "数値の桁数の上限", tone: "warn" },
  { t: "@Min / @Max / @PositiveOrZero", d: "数値の範囲（page / size）", tone: "warn" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/dto/CalculationRequest.java", "@NotNull @Digits(integer = 28, fraction = 10) BigDecimal left", "ルールは入力の型の側に"),
        code("src/main/java/com/example/calc/calculation/CalculationController.java", "@Min(1)", "クエリの size にも範囲のルール")
      ],
      checks: [
        { q: "CalculationRequest の 3 つの項目のうち、@Digits が付いていないのはどれ？ なぜ要らない？",
          a: "operator。数値ではなく enum（ADD / SUBTRACT / MULTIPLY / DIVIDE のどれか）なので、桁数の概念が無い。決まった値以外は JSON を型にする段階で 400 になる。" }
      ]
    },
    {
      id: "s5",
      title: "分類 ④：エラー処理",
      body: `
${Fig.flow([
  { ic: "🧮", t: "Service", s: "「0 で割れない」<br>例外を投げるだけ", tone: "accent" },
  { ic: "🛎️", t: "@RestControllerAdvice", s: "GlobalExceptionHandler<br>困ったときの受付", tone: "err" },
  { ic: "📮", t: "422 ＋ エラーの JSON", s: "ステータスと形を<br>ここだけで決める", tone: "warn" }
], ["💥 例外", "@ExceptionHandler が作る"], { caption: "Service は何番で返すかを知らない。エラーの返し方を 1 か所に集める（第 6 章の中心）" })}
${Fig.matrix("@ExceptionHandler(…)", ["返すステータス"], [
  { h: "BusinessRuleException", c: [{ v: "422 計算できない", tone: "warn" }] },
  { h: "ResourceNotFoundException", c: [{ v: "404 見つからない", tone: "warn" }] },
  { h: "Exception（想定外）", c: [{ v: "500 サーバーのバグ", tone: "err" }] }
])}`,
      refs: [
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "@RestControllerAdvice", "エラーの受付を 1 か所に"),
        code("src/main/java/com/example/calc/common/exception/GlobalExceptionHandler.java", "@ExceptionHandler(BusinessRuleException.class)", "「計算できない」例外 → 422")
      ],
      checks: [
        { q: "GlobalExceptionHandler の中で @ExceptionHandler は何回使われている？ それぞれ何の例外？",
          a: "3 回。BusinessRuleException（422）、ResourceNotFoundException（404）、Exception（想定外 → 500）。ほかに、親クラスから受け継いだ Spring 標準の例外処理（壊れた JSON など）もある。" }
      ]
    },
    {
      id: "s6",
      title: "分類 ⑤・⑥：DB（JPA）とトランザクション",
      body: `
<p>DB の付箋は Hibernate が読み、<b>Java のクラスと DB のテーブルの対応表</b>として使う。</p>
${Fig.pairs("Java（Calculation クラス）", "DB（calculations テーブル）", [
  { l: "@Entity @Table class Calculation", r: "テーブル calculations", tone: "lec" },
  { l: "@Id @GeneratedValue Long id", r: "id（DB が番号を振る）", tone: "accent" },
  { l: "@Column BigDecimal leftOperand", r: "left_operand", rnote: "left は SQL の予約語なので改名", tone: "warn" },
  { l: "@Enumerated(STRING) Operator operator", r: "operator = 'ADD'", rnote: "文字列で保存", tone: "ok" },
  { l: "@Column BigDecimal result", r: "result", tone: "ok" },
  { l: "Instant createdAt（@PrePersist で入る）", r: "created_at", tone: "dim" }
], "SQL を 1 行も書かずに保存・取得できるのは、この対応表があるから（第 15 章）")}
${Fig.cards([
  { ic: "🔒", t: "@Transactional", d: "このメソッドの DB 操作を「全部成功か、全部取り消し」にまとめる。途中で例外が出たら変更を巻き戻す（第 12 章）。読むのは Spring", tone: "lec" }
])}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/Calculation.java", "@Entity", "DB の 1 行を表すクラス"),
        code("src/main/java/com/example/calc/calculation/Calculation.java", '@Column(name = "left_operand"', "Java の leftOperand ↔ DB の left_operand 列"),
        code("src/main/java/com/example/calc/calculation/CalculationService.java", "@Transactional(readOnly = true)", "クラス全体は読み取り専用、書き込むメソッドにだけ @Transactional")
      ],
      checks: [
        { q: "Calculation の @Column を見て、Java のフィールド名と DB の列名が違うものを探そう。なぜ変えている？",
          a: "leftOperand → left_operand、rightOperand → right_operand など。left / right は SQL の予約語（LEFT JOIN の LEFT）なので、そのまま列名にすると DB によってはエラーになるから。" }
      ]
    },
    {
      id: "s7",
      title: "分類 ⑦・⑧：API の説明書とテスト",
      body: `
${Fig.flow([
  { ic: "🏷️", t: "@Tag @Operation @ApiResponse", s: "Controller に付ける", tone: "dim" },
  { ic: "📘", t: "springdoc が読む", s: "起動時に説明書を生成", tone: "lec" },
  { ic: "🌐", t: "Swagger UI", s: "/swagger-ui.html に表示", tone: "accent" }
], ["", ""], { caption: "説明書の付箋は動作に一切影響しない。だからコードを変えて直し忘れると、説明書だけが嘘をつく（第 8 章）" })}
<p>テストの付箋は<b>「どこまで起動するか」を選ぶスイッチ</b>。狭く起動するほど速い（第 20 章）。</p>
${Fig.matrix("テストの付箋", ["Controller", "Service", "Repository・DB"], [
  { h: "@WebMvcTest", c: [{ v: "本物", tone: "ok" }, { v: "偽物", tone: "warn" }, { v: "起動しない", tone: "dim" }] },
  { h: "@DataJpaTest", c: [{ v: "起動しない", tone: "dim" }, { v: "起動しない", tone: "dim" }, { v: "本物（H2）", tone: "ok" }] },
  { h: "@SpringBootTest", c: [{ v: "本物", tone: "ok" }, { v: "本物", tone: "ok" }, { v: "本物（H2）", tone: "ok" }] },
  { h: "付箋なし（Service の単体テスト）", c: [{ v: "起動しない", tone: "dim" }, { v: "本物（new）", tone: "ok" }, { v: "偽物", tone: "warn" }] }
], "偽物への差し替えは @MockitoBean（Spring のテスト）か mock(...)（単体テスト）。@Test は「これはテストのメソッド」の印")}`,
      refs: [
        code("src/main/java/com/example/calc/calculation/CalculationController.java", '@ApiResponse(responseCode = "201"', "作成のとき返すステータスの説明"),
        code("src/test/java/com/example/calc/calculation/CalculationControllerTest.java", "@WebMvcTest(CalculationController.class)", "HTTP の層だけ起動"),
        code("src/test/java/com/example/calc/calculation/CalculationRepositoryTest.java", "@DataJpaTest", "DB の層だけ起動")
      ],
      checks: [
        { q: "作成（POST）のメソッドに付いている @ApiResponse の responseCode をすべて挙げよう。第 1 章で見たステータスと合っている？",
          a: "201・400・422。成功は 201、書き方の間違いは 400、0 除算や桁あふれは 422。説明書とコードの振る舞いが一致している。" }
      ]
    }
  ],
  observe: {
    intro: "<p>付箋を 1 つ外すと何が変わるかを体験する。<b>試したら必ず元に戻す</b>（<code>git checkout -- ファイル名</code>）。</p>",
    steps: [
      { do: "CalculationController の create メソッドの引数から <code>@Valid</code> だけを消し、<code>./mvnw verify</code> を実行する。",
        expect: "コンパイルは通るが、「operator 欠落は 400」などのテストが落ちる。付箋 1 つでチェックが丸ごと無くなったことが、テストで検出される（LearningLinksTest も落ちるが、それは教材がリンクしている行を書き換えたため）" },
      { do: "元に戻して、今度は CalculationService のクラス名の上の <code>@Service</code> を消し、<code>./mvnw verify</code> を実行する。",
        expect: "アプリ全体を起動するテスト（@SpringBootTest）が NoSuchBeanDefinitionException（CalculationService の部品が見つからない）で落ちる。部品として登録されなくなったため" },
      { do: "元に戻して <code>./mvnw verify</code> が BUILD SUCCESS に戻ることを確認する。",
        expect: "BUILD SUCCESS" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🔍", t: "増減を探す", d: "付箋は短いので見落とされやすい。特に @Valid・@Transactional・@Entity 周りの「付いた・外れた」を探す", tone: "warn" },
  { ic: "✂️", t: "付けすぎを疑う", d: "使わない @Component、不要な @Transactional…。「なぜそこに要るのか」を AI に説明させる", tone: "lec" },
  { ic: "🧪", t: "テストで固定する", d: "外れて困る付箋は、外したらテストが落ちる状態にしておく（上の観察のように）", tone: "ok" }
], "付箋 1 つで振る舞いが大きく変わる。だからレビューの重点になる")}`,
  questions: [
    { q: "アノテーションについて正しい説明は？",
      choices: ["それ自体は何もせず、読む側（Spring など）がそれを見て動く付箋", "書いた瞬間にその場で処理を実行する命令", "コメントと同じで、プログラムの動作には関係しない", "Java のコンパイルを速くするための印"],
      explain: "付箋そのものは何もしない。Spring・Bean Validation・Hibernate などが読んで動く。コメントとの違いは「読む人がいて、動作が変わる」こと。", see: "s1" },
    { q: "@RestController・@Service・@Repository に共通する意味は？",
      choices: ["Spring に部品として登録してもらう", "DB のテーブルを作る", "HTTP の URL を決める", "入力を検証する"],
      explain: "3 つとも部品登録の付箋。名前を分けているのは、どの層の部品かを人間と AI に伝えるため。", see: "s2" },
    { q: "@Repository について、このリポジトリの javadoc に書かれている事実は？",
      choices: ["無くても動くが、永続化層だと明示するために付けている", "付けないと DB に接続できない", "付けると SQL が速くなる", "テストの時だけ必要"],
      explain: "JpaRepository の継承だけで検出される。役割を伝えるための付箋もある。", see: "s2" },
    { q: "設定用のクラスの中で、部品を自分で作って Spring に登録するときに使う組み合わせは？",
      choices: ["@Configuration と @Bean", "@Entity と @Id", "@Test と @MockitoBean", "@GetMapping と @PathVariable"],
      explain: "OpenApiConfig がその例。@Configuration のクラスで @Bean のメソッドが返したものが部品になる。", see: "s2" },
    { q: "GET /api/v1/calculations/5 の「5」を受け取るのに使うアノテーションは？",
      choices: ["@PathVariable", "@RequestParam", "@RequestBody", "@RequestMapping"],
      explain: "URL のパスの一部（/{id}）は @PathVariable。クエリなら @RequestParam、ボディなら @RequestBody。", see: "s3" },
    { q: "GET /api/v1/calculations?operator=ADD の「operator=ADD」を受け取るのは？",
      choices: ["@RequestParam", "@PathVariable", "@RequestBody", "@Column"],
      explain: "? より後ろのクエリは @RequestParam。", see: "s3" },
    { q: "POST のボディの JSON を Java の型にして受け取るのは？",
      choices: ["@RequestBody", "@RequestParam", "@PathVariable", "@Entity"],
      explain: "ボディ → @RequestBody。JSON から Java の型への変換は Spring（Jackson）がやる。", see: "s3" },
    { q: "入力のルール（@NotNull など）と、検証のスイッチ（@Valid）はそれぞれどこに付く？",
      choices: ["ルールは入力の型（DTO）に、@Valid は受け取る側（Controller の引数）に", "両方とも Controller のクラス名の上に", "両方とも application.yml に", "ルールは DB に、@Valid は Service に"],
      explain: "ルールは CalculationRequest の項目に、スイッチは Controller の引数に付いている。", see: "s4" },
    { q: "AI の変更で、Controller の引数から @Valid だけが消えていた。何が起きる？",
      choices: ["コンパイルも正しい入力の動作も普通に通るが、入力チェックが一切行われなくなる", "コンパイルエラーになる", "アプリが起動しなくなる", "すべてのリクエストが 400 になる"],
      explain: "「付いていないこと」は目に見えにくい。だからテストで固定しておく（このリポジトリではテストが落ちて気づける）。", see: "s4" },
    { q: "@RestControllerAdvice の役割は？",
      choices: ["全 Controller に共通する「例外を受け止めて返事を作る」場所", "Controller にアドバイスのコメントを表示する", "Controller のテストを自動生成する", "Controller の URL を短くする"],
      explain: "エラーの返し方を 1 か所に集める。Service は例外を投げるだけで、ステータスはここが決める。", see: "s5" },
    { q: "@ExceptionHandler(BusinessRuleException.class) が付いたメソッドは、いつ呼ばれる？",
      choices: ["BusinessRuleException が投げられて、Controller から外に出てきたとき", "アプリの起動時", "毎回のリクエストの最初", "DB に保存する直前"],
      explain: "指定した種類の例外が起きたときに、返事（ステータスとエラーの JSON）を作る。", see: "s5" },
    { q: "Calculation クラスに @Entity が付いている意味は？",
      choices: ["このクラスは DB の 1 行を表す（Hibernate がテーブルと対応させる）", "このクラスは HTTP の窓口である", "このクラスはテスト専用である", "このクラスは JSON のレスポンスになる"],
      explain: "@Entity は「DB の 1 行」。JSON のレスポンスは別の型（CalculationResponse）。第 11 章で分ける理由を扱う。", see: "s6" },
    { q: "Java のフィールド leftOperand を DB の列 left_operand に対応させているのは？",
      choices: ["@Column(name = \"left_operand\")", "@Table", "@Id", "@RequestParam"],
      explain: "@Column で列名を指定できる。left は SQL の予約語なので避けている。", see: "s6" },
    { q: "@Transactional の意味として正しいものは？",
      choices: ["そのメソッドの DB 操作を「全部成功か、全部取り消し」にまとめる", "そのメソッドを速く実行する", "そのメソッドをテストから除外する", "そのメソッドの結果を JSON にする"],
      explain: "途中で例外が起きたら DB への変更をまとめて取り消す。第 12 章で詳しく扱う。", see: "s6" },
    { q: "@Operation や @ApiResponse を消すと、API の動作はどうなる？",
      choices: ["動作は変わらない。Swagger UI の説明が減るだけ", "該当する API が動かなくなる", "ステータスコードが変わる", "入力チェックが無効になる"],
      explain: "説明書の付箋は動作に影響しない。逆に言うと、コードを変えて説明を直し忘れると説明書だけが嘘をつく。", see: "s7" },
    { q: "Controller の HTTP の振る舞いだけを、DB を起動せずに速くテストしたい。使うのは？",
      choices: ["@WebMvcTest", "@SpringBootTest", "@DataJpaTest", "@Entity"],
      explain: "@WebMvcTest は HTTP の層だけ起動する。@SpringBootTest は全部、@DataJpaTest は DB の層だけ。", see: "s7" },
    { q: "テストの中で、ある部品を偽物に差し替えるのに使うのは？",
      choices: ["@MockitoBean", "@Bean", "@Service", "@Transactional"],
      explain: "@MockitoBean で差し替える。第 2 章の DI（渡してもらう形）だからこそできる。", see: "s7" },
    { q: "次のうち、分類の組み合わせが誤っているものは？",
      choices: ["@PathVariable — DB（JPA）", "@NotNull — 入力の検証", "@DataJpaTest — テスト", "@RestControllerAdvice — エラー処理"],
      explain: "@PathVariable は HTTP の受け口（URL の一部を受け取る）。", see: "s3" },
    { q: "AI の出したコードに、使っていないクラスへの @Service や、読むだけのメソッドへの @Transactional が大量に付いていた。適切な対応は？",
      choices: ["なぜそこに要るのかを説明させ、不要なら外させる", "多い方が安全なのでそのままにする", "すべてのクラスに付けるよう指示する", "テストが通っていれば気にしない"],
      explain: "付箋は振る舞いを変える。不要な付箋は誤解や思わぬ動作のもと。理由を説明できないものは外す。", see: "s1" }
  ]
});
