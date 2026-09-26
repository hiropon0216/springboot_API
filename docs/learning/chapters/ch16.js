// 第 16 章 スキーマ管理：ddl-auto と Flyway（書き方は AUTHORING.md）
Calc.register({
  no: 16,
  goal: [
    "スキーマ（テーブルの定義）が、データを残したまま変わり続けるものだと説明できる",
    "ddl-auto の選択肢と、このリポジトリでの使い分けが分かる",
    "ddl-auto: update でできないこと（列の削除・名前変更・型変更）を言える",
    "マイグレーション（Flyway）の仕組みと、移るべきタイミングが分かる"
  ],
  sections: [
    {
      id: "s1",
      title: "スキーマは、データを残したまま変わり続ける",
      body: `
${Fig.flow([
  { ic: "📐", t: "スキーマ", s: "テーブル・列・型・制約の定義<br>（calculations の設計図）", tone: "accent" },
  { ic: "📦", t: "データ", s: "その設計図に沿って<br>入っている行", tone: "ok" }
], ["に沿って"])}
${Fig.timeline([
  { t: "Sprint 6", d: "calculations テーブルを作る（id, left_operand, …, created_at）", tone: "accent" },
  { t: "ある日", d: "「タグを付けたい」→ 列やテーブルを足す", tone: "lec" },
  { t: "別の日", d: "「memo を note に名前変更したい」「使っていない列を消したい」", tone: "warn" },
  { t: "その間ずっと", d: "本番のデータは消さずに残す必要がある", tone: "err" }
], "コードは入れ替えれば済むが、データは入れ替えられない。だからスキーマの変更には手順が要る")}`,
      refs: [
        code("docs/spec.md", "## 2. データモデル", "今のスキーマ（テーブル定義）")
      ],
      checks: [
        { q: "spec.md §2 のデータモデルで、NULL を許している列はどれ？",
          a: "memo だけ（VARCHAR(200)、NULL 可）。ほかはすべて NOT NULL。" }
      ]
    },
    {
      id: "s2",
      title: "ddl-auto：エンティティからテーブルを作る設定",
      body: `
${Fig.matrix("ddl-auto の値", ["起動時にすること", "このリポジトリ"], [
  { h: "create-drop", c: ["毎回作り直し、終了時に消す", { v: "テスト（H2）", tone: "ok" }] },
  { h: "create", c: ["毎回作り直す（データは消える）", "—"] },
  { h: "update", c: ["足りない列・テーブルを足す（消さない）", { v: "local・prod", tone: "warn" }] },
  { h: "validate", c: ["エンティティと DB が合っているか確かめるだけ", { v: "実務の本番の定番", tone: "lec" }] },
  { h: "none", c: ["何もしない", "—"] }
], "update は「エンティティを見て、足りない分を足す」。便利だが、足すことしかできない")}`,
      refs: [
        code("src/main/resources/application.yml", "ddl-auto: update", "手元・本番は update"),
        code("src/test/resources/application-test.yml", "ddl-auto: create-drop", "テストは毎回作り直す"),
        code("src/main/resources/application.yml", "実務では ddl-auto: validate にして", "実務のやり方（コメント）")
      ],
      checks: [
        { q: "テストで create-drop を使っている理由を application-test.yml のコメントから読み取ろう。",
          a: "毎回スキーマを作り直すので、前のテストの残骸に影響されない。" }
      ]
    },
    {
      id: "s3",
      title: "update でできること・できないこと",
      body: `
${Fig.matrix("やりたい変更", ["update で", "何が起きる"], [
  { h: "列を足す", c: [{ v: "できる", tone: "ok" }, "ALTER TABLE … ADD COLUMN"] },
  { h: "テーブルを足す", c: [{ v: "できる", tone: "ok" }, "CREATE TABLE"] },
  { h: "列を消す", c: [{ v: "できない", tone: "err" }, "エンティティから消しても、DB の列は残り続ける"] },
  { h: "列の名前を変える", c: [{ v: "できない", tone: "err" }, "新しい名前の空の列が足されるだけ。古い列とデータは置き去り"] },
  { h: "型を変える", c: [{ v: "できない", tone: "err" }, "変わらない。合わないまま動いて壊れることも"] },
  { h: "既存の行のデータを直す", c: [{ v: "できない", tone: "err" }, "update はデータを扱わない"] }
], "「エンティティを直せば DB も付いてくる」と思っていると、名前変更でデータを失う")}
${Fig.compare(
  { t: "memo → note に名前変更（update の場合）", tone: "err", html: "<pre>calculations\n  memo  ← 今までのメモが入ったまま（使われない）\n  note  ← 新しく足された空の列</pre>アプリからは全部のメモが消えたように見える" },
  { t: "このリポジトリの約束", tone: "ok", html: "スキーマの変更は update が追従できる範囲（列の追加）に留める。削除・名前変更・型変更が必要になったら、<b>先に Flyway を入れる</b>" }
)}`,
      refs: [
        code("CLAUDE.md", "が追従できる範囲（列の追加）に留める", "スキーマ変更の約束")
      ],
      checks: [
        { q: "ADR 0007 で、Flyway を同時に入れなかった理由は何と書かれている？",
          a: "スキーマ版管理は独立した大きな題材なので、ddl-auto の限界を体験してから移る方が理解が残る（不採用案の表）。" }
      ]
    },
    {
      id: "s4",
      title: "マイグレーション（Flyway）：変更を手順として残す",
      body: `
<p><b>マイグレーション</b>は、スキーマの変更を<b>番号付きの SQL ファイル</b>として残し、順番に適用する方式。<b>Flyway</b> はその定番の道具（このリポジトリにはまだ無い）。</p>
${Fig.code([
  { c: "src/main/resources/db/migration/", tag: "置き場所（例）", tone: "dim" },
  { c: "  V1__create_calculations.sql", tag: "最初のテーブル", tone: "accent" },
  { c: "  V2__add_tag_table.sql", tag: "タグを足す", tone: "accent" },
  { c: "  V3__rename_memo_to_note.sql", tag: "名前変更（データ移行つき）", tone: "warn" }
], "ファイル名の V と番号で順番が決まる。一度適用したファイルは書き換えない")}
${Fig.flow([
  { ic: "🚀", t: "アプリ起動", s: "Flyway が先に動く", tone: "accent" },
  { ic: "📋", t: "履歴テーブルを見る", s: "flyway_schema_history<br>「V2 まで適用済み」", tone: "lec" },
  { ic: "🛠️", t: "未適用の V3 だけ実行", s: "全環境で同じ順番に", tone: "ok" },
  { ic: "✅", t: "ddl-auto: validate", s: "エンティティと合っているか確認", tone: "ok" }
], ["", "", ""], { dir: "v", caption: "手元・テスト・本番のどれでも、同じ SQL が同じ順番で流れる。変更の履歴がコードと一緒にレビューされる" })}`,
      refs: [
        code("docs/spec.md", "**Flyway によるスキーマ版管理**", "今後の候補として整理している")
      ],
      checks: []
    },
    {
      id: "s5",
      title: "止めずに名前を変える：拡張と縮小（座学）",
      body: `
<p>本番を止めずに列の名前を変えるときは、<b>一度に変えず、段階に分ける</b>（拡張 → 縮小）。</p>
${Fig.timeline([
  { t: "拡張：新しい列を足す", d: "V3: note 列を追加し、memo の値をコピー", tone: "accent" },
  { t: "両方に書く", d: "アプリは memo と note の両方に書き、note から読む", tone: "lec" },
  { t: "切り替える", d: "note だけを使う版のアプリをリリース", tone: "ok" },
  { t: "縮小：古い列を消す", d: "V4: memo 列を削除（もう誰も使っていない）", tone: "warn" }
], "古い版と新しい版のアプリが同時に動く瞬間があっても壊れない。データも失わない")}
${Fig.cards([
  { ic: "⏰", t: "移るタイミング", d: "本番に守るべきデータが入る前。遅くとも、列の削除・名前変更・型変更が必要になったとき", tone: "warn" },
  { ic: "🧭", t: "この教材の立場", d: "学習の足場を小さくするため、まだ update のまま（意図的な保留）", tone: "dim" }
])}`,
      refs: [
        code("docs/adr/0007-reintroduce-model-and-database.md", "| スキーマ生成 |", "ddl-auto: update を選んだ理由")
      ],
      checks: []
    }
  ],
  observe: {
    intro: "<p>update の限界を、手元の PostgreSQL で体験する（Docker が必要。<b>試したら必ず元に戻す</b>）。</p>",
    steps: [
      { do: "Calculation の memo フィールドの <code>@Column(length = 200)</code> を <code>@Column(name = \"note\", length = 200)</code> に変えて起動する。",
        expect: "起動ログに alter table calculations add column note … が出る（新しい列が足される）" },
      { do: "<code>docker compose exec postgres psql -U calc -d calc -c '\\d calculations'</code>", expect: "memo 列と note 列の両方がある。memo は消えていない" },
      { do: "元に戻し、<code>docker compose exec postgres psql -U calc -d calc -c 'alter table calculations drop column note;'</code> で後片付けする。",
        expect: "手でしか消せない ── これが update の限界" }
    ]
  },
  ai: `
${Fig.cards([
  { ic: "⚠️", t: "エンティティの名前変更は危険信号", d: "AI がフィールドや @Column の name を変えたら、ddl-auto: update では DB がついてこない。必ず人間が止める", tone: "err" },
  { ic: "📜", t: "マイグレーションは書き換えさせない", d: "Flyway を入れた後、適用済みの V ファイルを AI に書き換えさせない。直すなら新しい番号を足す", tone: "warn" },
  { ic: "🧭", t: "拡張 → 縮小で頼む", d: "名前変更や型変更は「一度に変える」のではなく段階に分けるよう指示する", tone: "accent" }
])}`,
  questions: [
    { q: "スキーマの説明として正しいものは？",
      choices: ["テーブル・列・型・制約といった DB の設計図", "DB に入っているデータそのもの", "SQL の実行結果", "アプリの設定ファイル"],
      explain: "データはその設計図に沿って入っているもの。", see: "s1" },
    { q: "スキーマの変更に手順が必要な一番の理由は？",
      choices: ["コードは入れ替えられるが、本番のデータは入れ替えられず残す必要があるから", "SQL が難しいから", "DB が遅いから", "テストが通らないから"],
      explain: "データを失わずに設計図を変える必要がある。", see: "s1" },
    { q: "テストで ddl-auto: create-drop を使う理由は？",
      choices: ["毎回作り直すので、前のテストの残骸に影響されない", "本番と同じにするため", "速いから", "データを残すため"],
      explain: "テストの DB は使い捨て。", see: "s2" },
    { q: "ddl-auto: update がすることは？",
      choices: ["エンティティを見て、足りない列やテーブルを足す（消さない）", "毎回テーブルを作り直す", "何もしない", "エンティティと DB が合っているか確かめるだけ"],
      explain: "足すことしかできない。", see: "s2" },
    { q: "実務の本番で定番の ddl-auto の値は？",
      choices: ["validate（スキーマの変更はマイグレーションに任せる）", "create", "create-drop", "update"],
      explain: "Hibernate にスキーマを変えさせず、合っているかの確認だけにする。", see: "s2" },
    { q: "ddl-auto: update で「できる」変更は？",
      choices: ["列を足す", "列を消す", "列の名前を変える", "列の型を変える"],
      explain: "消す・名前変更・型変更はできない。", see: "s3" },
    { q: "ddl-auto: update のまま、エンティティで memo 列の名前を note に変えると？",
      choices: ["空の note 列が足され、memo 列とデータは置き去りになる（アプリからはメモが消えたように見える）", "memo が note に名前変更される", "起動しない", "データが自動でコピーされる"],
      explain: "名前変更でデータを失う典型例。", see: "s3" },
    { q: "このリポジトリの約束で、列の削除や名前変更が必要になったらどうする？",
      choices: ["先に Flyway を入れる", "ddl-auto を create にする", "エンティティだけ直す", "DB を作り直す"],
      explain: "CLAUDE.md の約束。update が追従できるのは列の追加まで。", see: "s3" },
    { q: "マイグレーション（Flyway）の説明として正しいものは？",
      choices: ["スキーマの変更を番号付きの SQL ファイルとして残し、順番に適用する", "データのバックアップを取る", "エンティティから SQL を自動生成する", "テストデータを入れる"],
      explain: "変更の履歴がコードと一緒にレビューされ、全環境で同じ順に流れる。", see: "s4" },
    { q: "Flyway が「どこまで適用したか」を覚えている場所は？",
      choices: ["DB の中の履歴テーブル（flyway_schema_history）", "application.yml", "pom.xml", "ブラウザ"],
      explain: "起動時に履歴を見て、未適用のファイルだけを流す。", see: "s4" },
    { q: "一度適用したマイグレーションの SQL ファイルに誤りを見つけた。正しい直し方は？",
      choices: ["新しい番号のファイルを足して直す", "そのファイルを書き換える", "ファイルを消す", "ddl-auto を update に戻す"],
      explain: "適用済みのファイルを書き換えると、環境ごとに DB の状態がずれる。", see: "s4" },
    { q: "本番を止めずに列の名前を変える「拡張と縮小」の正しい順番は？",
      choices: ["新しい列を足す → 両方に書く → 新しい列に切り替える → 古い列を消す", "古い列を消す → 新しい列を足す", "列の名前を一度に変える", "アプリを止めて作り直す"],
      explain: "古い版と新しい版のアプリが同時に動いても壊れない。", see: "s5" },
    { q: "Flyway に移るべきタイミングとして最も適切なのは？",
      choices: ["本番に守るべきデータが入る前、遅くとも削除・名前変更・型変更が必要になったとき", "アプリが遅くなったとき", "テストが増えたとき", "移る必要は無い"],
      explain: "データが入ってからの後付けは難しくなる。", see: "s5" },
    { q: "このリポジトリがまだ ddl-auto: update のままなのはなぜ？",
      choices: ["学習の足場を小さくするための意図的な保留（ADR 0007）", "Flyway が Spring Boot 4 で使えないから", "PostgreSQL が Flyway に対応していないから", "忘れているから"],
      explain: "限界を体験してから移る方が理解が残る、という判断。", see: "s3" },
    { q: "AI がエンティティの @Column(name = …) を変える差分を出してきた（ddl-auto: update のまま）。どう対応する？",
      choices: ["DB がついてこずデータを失うので止め、マイグレーションの計画を立てる", "テストが通ればそのまま", "ddl-auto を create にする", "列を手で消す"],
      explain: "エンティティの名前変更は危険信号。", see: "s3" },
    { q: "Flyway 導入後、AI が既存の V2 ファイルを書き換えようとした。適切な指示は？",
      choices: ["V2 は書き換えず、V3 を足して直すよう指示する", "そのまま書き換えさせる", "V2 を削除させる", "Flyway を外す"],
      explain: "適用済みの手順は歴史。直すなら新しい番号。", see: "s4" }
  ]
});
