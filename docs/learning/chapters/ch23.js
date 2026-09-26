// 第 23 章 CI/CD（書き方は AUTHORING.md）
Calc.register({
  no: 23,
  goal: [
    "CI（毎回自動で検査する）と CD（自動で届ける）の違いを説明できる",
    "GitHub Actions のワークフロー（いつ・何を・どの順に）を読める",
    "「検査が通ったものだけを届ける」仕組み（needs・if）が分かる",
    "Render の Blueprint と、秘密情報（Secrets）の扱いが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "CI と CD",
      body: `
${Fig.flow([
  { ic: "⬆️", t: "git push", s: "どのブランチでも", tone: "dim" },
  { ic: "🧪", t: "CI：build ジョブ", s: "GitHub のマシンで<br>./mvnw verify", tone: "accent" },
  { ic: "🚀", t: "CD：deploy ジョブ", s: "main のときだけ<br>Render に届ける", tone: "ok" },
  { ic: "☁️", t: "Render", s: "新しい版を起動し<br>health が UP なら切り替え", tone: "lec" }
], ["自動で", "緑なら", "デプロイフック"], { dir: "v" })}
${Fig.compare(
  { t: "🧪 CI（継続的インテグレーション）", tone: "accent", html: "変更のたびに、<b>自分の PC ではなく共通の場所で</b>全部の検査を流す。「私の PC では通った」をなくす" },
  { t: "🚀 CD（継続的デプロイ）", tone: "ok", html: "検査が通った変更を、<b>人の手を介さず</b>本番に届ける。手順の抜け・ミスをなくす" }
)}`,
      refs: [
        code(".github/workflows/ci.yml", "name: CI", "ワークフローの定義")
      ],
      checks: [
        { q: "ci.yml にはジョブがいくつある？ それぞれの名前は？",
          a: "2 つ。build（検査）と deploy（Render へのデプロイ）。" }
      ]
    },
    {
      id: "s2",
      title: "ワークフローを読む",
      body: `
${Fig.code([
  { c: "on:", tag: "いつ動くか", tone: "accent" },
  { c: "  push: { branches: ['**'] }", tag: "どのブランチへの push でも", tone: "accent" },
  { c: "  pull_request: { branches: [main] }", tag: "main への PR でも", tone: "accent" },
  { c: "jobs:" },
  { c: "  build:" },
  { c: "    runs-on: ubuntu-latest", tag: "GitHub が用意するマシン", tone: "dim" },
  { c: "    steps:" },
  { c: "      - uses: actions/checkout@v4", tag: "コードを取ってくる", tone: "dim" },
  { c: "      - uses: actions/setup-java@v4 (temurin 21, cache: maven)", tag: "Java を入れ、部品をキャッシュ", tone: "lec" },
  { c: "      - run: ./mvnw -B verify", tag: "全部の検査（第 21 章）", tone: "ok" },
  { c: "      - uses: actions/upload-artifact@v4 (if: always())", tag: "失敗してもテスト結果を保存", tone: "warn" }
], "ci.yml の build ジョブ（簡略）。手元でやる ./mvnw verify と同じことを、共通のマシンで毎回やる")}
${Fig.cards([
  { ic: "🗄️", t: "DB のサービスは要らない", d: "テストは H2 なので、CI に PostgreSQL を立てなくてよい（速い）", tone: "ok" },
  { ic: "📦", t: "cache: maven", d: "部品（~/.m2）を前回から使い回す。毎回インターネットから全部取らない", tone: "lec" },
  { ic: "📑", t: "if: always()", d: "テストが失敗したときこそ、結果のファイルが欲しい", tone: "warn" }
])}`,
      refs: [
        code(".github/workflows/ci.yml", "run: ./mvnw -B verify", "CI の本体"),
        code(".github/workflows/ci.yml", "cache: maven", "部品のキャッシュ"),
        code(".github/workflows/ci.yml", "if: always()", "失敗時もテスト結果を保存")
      ],
      checks: [
        { q: "ci.yml のコメントで、CI に PostgreSQL のサービスコンテナが要らない理由は？",
          a: "テストは H2（インメモリ）を使うから。DB 固有の SQL を書き始めたら Testcontainers で本物の PostgreSQL で回すべき、とも書いてある。" }
      ]
    },
    {
      id: "s3",
      title: "検査が通ったものだけを届ける",
      body: `
${Fig.code([
  { c: "  deploy:" },
  { c: "    needs: build", tag: "build が成功したときだけ", tone: "ok" },
  { c: "    if: github.ref == 'refs/heads/main' && github.event_name == 'push'", tag: "main への push のときだけ", tone: "accent" },
  { c: "    steps:" },
  { c: '      - run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"', tag: "Render に「デプロイして」", tone: "lec" }
], "deploy ジョブ。2 つの条件が両方そろったときだけ動く")}
${Fig.stepper({
  nodes: [
    { id: "push", t: "⬆️ push / PR" },
    { id: "build", t: "🧪 build（verify）" },
    { id: "deploy", t: "🚀 deploy" },
    { id: "render", t: "☁️ Render" }
  ],
  scenarios: [
    { name: "作業ブランチに push", steps: [
      { node: "push", t: "feature/xxx に push", log: ["on: push: branches: ['**'] に一致"] },
      { node: "build", t: "build が走る", log: ["$ ./mvnw -B verify", "BUILD SUCCESS"] },
      { node: "deploy", t: "deploy は動かない", stop: true, d: "main ではないので if の条件を満たさない（skipped）。作業中の変更は本番に行かない。" }
    ]},
    { name: "main に PR を出す", steps: [
      { node: "push", t: "main への pull request", log: ["on: pull_request: branches: [main] に一致"] },
      { node: "build", t: "build が走る", log: ["$ ./mvnw -B verify"], d: "マージしてよいかの判断材料になる。" },
      { node: "deploy", t: "deploy は動かない", stop: true, d: "event_name が pull_request で push ではないので skipped。" }
    ]},
    { name: "main にマージ（成功）", steps: [
      { node: "push", t: "main への push（マージ）" },
      { node: "build", t: "build が走り、成功", log: ["BUILD SUCCESS"] },
      { node: "deploy", t: "deploy が動く", log: ["$ curl -X POST $RENDER_DEPLOY_HOOK_URL"], d: "needs: build が成功、かつ main への push。" },
      { node: "render", t: "Render が新しい版を作って切り替える", d: "health が UP になってから利用者を新しい版に向ける。" }
    ]},
    { name: "main にマージ（テスト失敗）", steps: [
      { node: "push", t: "main への push" },
      { node: "build", t: "build が失敗", stop: true, log: ["Tests run: 64, Failures: 1", "BUILD FAILURE"] },
      { node: "deploy", t: "deploy は動かない", stop: true, d: "needs: build が失敗したので実行されない。壊れた版は本番に届かない。" }
    ]}
  ]
})}`,
      refs: [
        code(".github/workflows/ci.yml", "needs: build", "build の成功が前提"),
        code(".github/workflows/ci.yml", "if: github.ref == 'refs/heads/main'", "main への push のときだけ")
      ],
      checks: [
        { q: "もし needs: build を消したら、何が起きうる？",
          a: "build と deploy が並んで動き、テストが失敗した版でも本番にデプロイされうる。「検査が通ったものだけを届ける」が崩れる。" }
      ]
    },
    {
      id: "s4",
      title: "Render：インフラもコードで書く",
      body: `
${Fig.pairs("render.yaml に書いたもの", "Render が作るもの", [
  { l: "databases: calc-db（plan: free）", r: "PostgreSQL のデータベース", tone: "lec" },
  { l: "services: type: web, runtime: docker", r: "Dockerfile から作るアプリ", tone: "accent" },
  { l: "envVars: DB_HOST … fromDatabase", r: "DB の接続情報を環境変数として注入", tone: "warn" },
  { l: "healthCheckPath: /actuator/health", r: "UP になってから利用者を向ける", tone: "ok" }
], "Blueprint：リポジトリを指定するだけで、アプリと DB がまとめて作られる（Infrastructure as Code）", "→")}
${Fig.cards([
  { ic: "📜", t: "インフラもレビューできる", d: "画面でポチポチ作ると、何をどう作ったか残らない。ファイルなら差分で見える", tone: "accent" },
  { ic: "🔁", t: "作り直せる", d: "同じ構成を別の環境にもう 1 つ作れる", tone: "ok" }
])}`,
      refs: [
        code("render.yaml", "runtime: docker", "Dockerfile から作る"),
        code("render.yaml", "fromDatabase:", "DB の値を注入")
      ],
      checks: [
        { q: "render.yaml のコメントで、healthCheckPath について何と書いてある？",
          a: "/actuator/health が UP を返すまで Render はトラフィックを向けない。DB を持つと health は DB 接続も見るので、DB が落ちていれば DOWN になる。" }
      ]
    },
    {
      id: "s5",
      title: "秘密情報は Secrets に。そして現状の正直な話",
      body: `
${Fig.flow([
  { ic: "🔐", t: "GitHub Secrets", s: "RENDER_DEPLOY_HOOK_URL を<br>リポジトリの設定に登録", tone: "warn" },
  { ic: "📄", t: "ci.yml", s: "${{ secrets.… }} で参照するだけ<br>値は書かない", tone: "accent" },
  { ic: "🙈", t: "ログ", s: "値は自動で *** に伏せられる", tone: "ok" }
], ["", ""], { caption: "デプロイフックの URL を知っていれば誰でもデプロイを起こせるので、秘密情報として扱う" })}
${Fig.cards([
  { ic: "⚠️", t: "Render は未設定", d: "このリポジトリは構成ファイルまで。実際の Render へのデプロイはしていない（progress.md の「検証不能」）", tone: "warn" },
  { ic: "🔴", t: "Secrets が無いと deploy は失敗する", d: "RENDER_DEPLOY_HOOK_URL を登録していないと、main への push のたびに deploy ジョブが空の URL に curl して失敗しうる。使わないなら条件で止めるのが丁寧", tone: "err" }
], "「構成がある」と「動いている」は別。確かめていないことは、確かめていないと書く")}`,
      refs: [
        code(".github/workflows/ci.yml", "secrets.RENDER_DEPLOY_HOOK_URL", "Secrets を参照している行"),
        code("docs/progress.md", "Render への実デプロイは未実施", "実デプロイをしていないという記録")
      ],
      checks: [
        { q: "ci.yml のコメントに、デプロイフックの URL をどこで取得すると書いてある？",
          a: "Render ダッシュボード → サービス → Settings → Deploy Hook。それを GitHub Secrets に RENDER_DEPLOY_HOOK_URL として登録する。" }
      ]
    }
  ],
  observe: {
    intro: "<p>GitHub の画面で観察する（リポジトリの Actions タブ）。</p>",
    steps: [
      { do: "作業ブランチを作って push し、Actions タブを開く。", expect: "build だけが実行され、deploy は skipped と表示される" },
      { do: "build の実行ログで「Build and verify」のステップを開く。", expect: "手元と同じ ./mvnw verify の出力（Tests run: 64 …）" },
      { do: "実行結果の Artifacts から test-reports をダウンロードする。", expect: "テストごとの結果の XML" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "🟢", t: "CI の緑を合格の最低条件に", d: "AI の変更も、CI が緑になるまではレビューしない。赤のログを AI に渡して直させる", tone: "accent" },
  { ic: "🧯", t: "条件の緩和を疑う", d: "「デプロイできないので needs を外しました」「失敗を無視する設定にしました」は差し戻す", tone: "err" },
  { ic: "🔐", t: "ワークフローに秘密を書かせない", d: "トークンや URL を yml に直書きさせない。Secrets を使わせる", tone: "warn" }
])}`,
  questions: [
    { q: "CI（継続的インテグレーション）の説明として正しいものは？",
      choices: ["変更のたびに、共通の場所で自動的に全部の検査を流すこと", "本番に自動でデプロイすること", "コードを自動で書くこと", "DB を自動で作ること"],
      explain: "「私の PC では通った」をなくす。", see: "s1" },
    { q: "CD（継続的デプロイ）の説明として正しいものは？",
      choices: ["検査が通った変更を、人の手を介さず本番に届けること", "毎回テストを流すこと", "コードをレビューすること", "ブランチを作ること"],
      explain: "手順の抜けやミスをなくす。", see: "s1" },
    { q: "このリポジトリの CI が動くのはいつ？",
      choices: ["どのブランチへの push でも、main への PR でも", "main への push だけ", "毎日決まった時間", "手動で実行したときだけ"],
      explain: "on: push（branches: '**'）と pull_request（main）。", see: "s2" },
    { q: "CI の build ジョブの本体（検査）は？",
      choices: ["./mvnw -B verify", "docker build", "curl でデプロイ", "npm test"],
      explain: "手元でやる verify と同じことを、共通のマシンで毎回やる。", see: "s2" },
    { q: "CI に PostgreSQL のサービスを立てていない理由は？",
      choices: ["テストが H2 を使うから", "PostgreSQL が CI で動かないから", "お金がかかるから", "DB のテストをしていないから"],
      explain: "DB 固有の SQL を書き始めたら Testcontainers を検討する。", see: "s2" },
    { q: "Upload test reports のステップに if: always() が付いている理由は？",
      choices: ["テストが失敗したときこそ結果のファイルが欲しいから", "毎回必ず成功させるため", "速くするため", "決まりは無い"],
      explain: "既定では前のステップが失敗すると後のステップは飛ばされる。", see: "s2" },
    { q: "deploy ジョブの needs: build の意味は？",
      choices: ["build が成功したときだけ deploy を実行する", "build と同時に実行する", "build の前に実行する", "build が失敗したら実行する"],
      explain: "壊れた版が本番に届かない。", see: "s3" },
    { q: "作業ブランチに push したとき、deploy ジョブは？",
      choices: ["main ではないので動かない（skipped）", "動いて本番にデプロイされる", "失敗する", "build より先に動く"],
      explain: "if の条件（main への push）を満たさない。", see: "s3" },
    { q: "main への PR を出したとき、deploy ジョブが動かない理由は？",
      choices: ["event_name が pull_request で、push ではないから", "PR は CI が動かないから", "build が必ず失敗するから", "main 以外だから"],
      explain: "マージされて main への push になったときに動く。", see: "s3" },
    { q: "main にマージしたが、テストが 1 件失敗した。どうなる？",
      choices: ["build が失敗し、deploy は実行されない", "deploy が実行される", "テストが自動で直る", "build が成功扱いになる"],
      explain: "needs: build が守っている。", see: "s3" },
    { q: "render.yaml（Blueprint）の利点は？",
      choices: ["アプリと DB の構成をファイルで管理し、差分でレビューし、作り直せる", "無料になる", "デプロイが不要になる", "テストが不要になる"],
      explain: "Infrastructure as Code。", see: "s4" },
    { q: "Render が新しい版に利用者を向けるのはいつ？",
      choices: ["/actuator/health が UP になってから", "ビルドが終わった瞬間", "デプロイフックを受けた瞬間", "翌日"],
      explain: "起動に失敗した版に利用者を向けないため。", see: "s4" },
    { q: "デプロイフックの URL を ci.yml に直接書かず Secrets に置く理由は？",
      choices: ["知っていれば誰でもデプロイを起こせる秘密情報だから", "URL が長いから", "yml に URL は書けないから", "速くなるから"],
      explain: "Secrets の値はログでも *** に伏せられる。", see: "s5" },
    { q: "このリポジトリの Render へのデプロイの現状として正しいものは？",
      choices: ["構成ファイルはあるが、実際のデプロイはしていない（検証不能として記録）", "毎日自動でデプロイされている", "Render は使っていない", "手動でデプロイしている"],
      explain: "「構成がある」と「動いている」は別。", see: "s5" },
    { q: "RENDER_DEPLOY_HOOK_URL を登録していない状態で main に push すると？",
      choices: ["deploy ジョブが空の URL に curl して失敗しうる", "自動で Render が設定される", "build も失敗する", "何も起きない"],
      explain: "使わないなら条件で deploy を止めるのが丁寧。", see: "s5" },
    { q: "AI が「デプロイできないので needs: build を外しました」と言ってきた。どうする？",
      choices: ["差し戻す。検査が通ったものだけを届ける仕組みが崩れる", "受け入れる", "build ジョブも消す", "テストを減らす"],
      explain: "条件の緩和は、壊れた版を本番に届ける近道になる。", see: "s3" }
  ]
});
