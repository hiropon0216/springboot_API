# Sprint 6 学習ノート — Model クラスと DB 連携

対象コミット時点: 2026-09-25 / 仕様は [spec.md](../spec.md)、決定は [ADR 0007](../adr/0007-reintroduce-model-and-database.md)

---

## 1. この Sprint で増えた登場人物

```
HTTP ─▶ Controller ─▶ Service ─▶ Repository ─▶ (JDBC) ─▶ PostgreSQL
         DTO 変換      業務ロジック   SQL 自動生成
         @Valid        @Transactional
         ステータス決定                     ▲
                                            │
                        Calculation（@Entity）＝ 1 行 = 1 オブジェクト
```

| 用語 | 一言で | このリポジトリでは |
|---|---|---|
| Model / エンティティ | DB の 1 行を表す Java オブジェクト | `Calculation` |
| JPA | Java 標準の O/R マッピング仕様（`@Entity` などの API）| Hibernate が実装 |
| Hibernate | JPA の実装。SQL を生成し、変更を検知する | Boot が自動設定 |
| Spring Data JPA | Repository インタフェースから実装を自動生成する層 | `CalculationRepository` |
| Repository | 永続化の窓口。CRUD の入口 | `JpaRepository<Calculation, Long>` |
| トランザクション | 「全部成功か、全部取り消し」の単位 | `@Transactional`（Service） |
| ダーティチェック | 取得したエンティティの変更を Hibernate が自動検知して UPDATE する仕組み | `replace` / `updateMemo` |
| DTO | 層の境界を越える入れ物。API の契約 | `CalculationRequest` / `CalculationResponse` |

## 2. 概念の核心

### 2.1 エンティティと DTO は「似ていても」分ける

項目がほぼ同じでも別の型にする。理由は 2 つ。

1. **エンティティは DB のスキーマに縛られ、可変**。フィールドを書き換えると UPDATE 文になる。
2. **DTO は API の契約**。DB の列を増やしただけで API のレスポンスが変わってしまうと、
   外部に約束していない情報が漏れ、契約が「うっかり」変わる。

このリポジトリでは `CalculationMapper` が唯一の変換点で、ArchUnit のルール
`entities_are_not_exposed_by_controllers` が「Controller がエンティティに触らない」ことを機械的に守る。

### 2.2 REST のメソッドとステータスコードは「リソースに何が起きたか」で決まる

| 操作 | メソッド | 成功 | 冪等 | 覚えどころ |
|---|---|---|---|---|
| 一覧 | GET | 200（0 件でも `[]`）| ○ | コレクションは存在するので 404 にしない |
| 取得 | GET | 200 | ○ | 無ければ 404 |
| 作成 | POST | **201 + `Location`** | ✕ | 叩くたび増える。作った場所を返すのが作法 |
| 全置換 | PUT | 200 | ○ | 本文に無い項目は消える（＝置き換え）|
| 部分更新 | PATCH | 200 | ✕ でもよい | 差分だけ送る |
| 削除 | DELETE | **204**（body なし）| ○ | 2 回目は 404（この API の決め） |

Sprint 5 の POST は 200 だった。**計算するだけで何も残らなかったから 200 が正しく、
リソースを作るようになったから 201 が正しい。**実装の都合ではなく、意味で決まる。

### 2.3 エラーの 3 分類

**送り方が間違っている = 400 / 宛先が無い = 404 / 送り方は正しいが実行できない = 422**

- 400: 項目欠落、`operator: "PLUS"`、桁数超過、`/calculations/abc`
- 404: `/calculations/999999`（`ResourceNotFoundException`）
- 422: `DIVIDE` で `right: 0`（`BusinessRuleException`）

Service は例外を投げるだけで、番号は `GlobalExceptionHandler` が決める。Controller に
`if (見つからない) return 404;` が 1 行も無いのがその効果。

### 2.4 トランザクション境界は Service に置く

```java
@Service
@Transactional(readOnly = true)   // 既定は読み取り専用
public class CalculationService {
  @Transactional                  // 書くメソッドだけ上書き
  public CalculationResponse create(...) { ... }
}
```

- Controller に置くと HTTP の都合が混ざる
- Repository に置くと 1 SQL ごとにコミットされ、「まとめて成功/失敗」が表現できない
- `readOnly = true` は Hibernate に「変更検知は不要」と伝える最適化にもなる

### 2.5 テストは 4 層に分ける（テストピラミッド）

| テスト | 起動するもの | 速さ | 何を守るか |
|---|---|---|---|
| `CalculationServiceTest` | 何も（`new` + モック）| 最速 | 計算ロジック・404 を投げる判断 |
| `CalculationRepositoryTest`（`@DataJpaTest`）| 永続化層 + H2 | 速い | エンティティと DB の対応、派生クエリ |
| `CalculationControllerTest`（`@WebMvcTest`）| web 層（Service はモック）| 速い | ステータス・ヘッダ・JSON・エラー応答 |
| `CalcApiApplicationTests`（`@SpringBootTest`）| 全部 | 遅い | Bean 配線・マッピングが破綻していないか |

## 3. つまずいたところ（実際に起きたこと）

### 3.1 同じリソースなのにレスポンスの見た目が違った

作成直後は `"left": 7`、あとから GET すると `"left": 7.0000000000`。
DB のカラムが `NUMERIC(38,10)` で**スケールが固定**なので、読み戻すと末尾ゼロが付く。

→ `CalculationMapper` で `stripTrailingZeros()` して DTO 境界で統一した。
**「DB の都合」を境界で吸収する**のも、内部表現を公開しないということの一部。

### 3.2 PATCH / PUT のレスポンスの `updatedAt` が古かった

`@PreUpdate` は**フラッシュ時**（既定ではトランザクションのコミット時）に走る。
DTO を組み立てた時点ではまだ更新前の値だったので、返した JSON と DB の中身がずれていた。

→ `repository.saveAndFlush(entity)` で明示的に UPDATE を発行してから変換するようにした。
**「いつ SQL が飛ぶか」を意識しないとデータがずれる**、が JPA 最大の落とし穴。

### 3.3 `left` / `right` はそのままカラム名にできない

`LEFT` / `RIGHT` は SQL の予約語（`LEFT JOIN`）。`@Column(name = "left_operand")` で逃がした。
**Java のフィールド名 = DB のカラム名が常に成り立つわけではない。**

### 3.4 バリデーションはスキーマと対で考える

`NUMERIC(38,10)` に入らない値（小数 11 桁）を検証せずに通すと、INSERT で落ちて **500** になる。
`@Digits(integer = 28, fraction = 10)` を付けて、入口で **400** として弾くのが正しい。
「DB が受け取れない値は、アプリの入口で断る」。

### 3.5 テストで PostgreSQL に繋ごうとして落ちた

`@SpringBootTest` は既定プロファイル（`local` = PostgreSQL）で起動しようとする。
`@ActiveProfiles("test")` を付けて H2 に差し替えた。**テストは外部環境に依存させない。**

## 4. 復習問（答えは下）

1. エンティティをそのまま API のレスポンスとして返すと、具体的にどんな困り方をする？
2. POST が 201 で、PUT が 200 なのはなぜ？ DELETE が 204 なのはなぜ？
3. 一覧が 0 件のとき 404 にしないのはなぜ？
4. 400 と 422 と 404 を、それぞれ一言で言い分けると？
5. `@Transactional` を Controller や Repository に置くと何が困る？
6. `repository.save()` を呼んでいないのに UPDATE が飛ぶのはなぜ？ その利点と危険は？
7. `@Enumerated(EnumType.ORDINAL)` を使ってはいけないのはなぜ？
8. `@DataJpaTest` と `@WebMvcTest` は、それぞれ何を守るためのテスト？
9. `ddl-auto: update` の限界は？ いつ Flyway に移るべき？
10. 開発は PostgreSQL・テストは H2 という構成の割り切りは、いつ破綻する？

### 答え

1. DB の列を増やしただけで API の契約が変わり、内部だけで使いたい列まで外に漏れる。
   また可変オブジェクトなので、レスポンス組み立て中の変更が UPDATE になる危険もある。
2. POST は新しいリソースを作るので「作った」を意味する 201 と、その場所を示す `Location` が要る。
   PUT は既存リソースの置き換えで、新規作成ではないので 200。DELETE は返す中身が無いので 204。
3. コレクション（`/calculations`）というリソース自体は存在していて、中身が 0 件なだけ。
   「宛先が無い」わけではないので 200 + `[]` が正しい。
4. 400 = 送り方が間違っている / 404 = 宛先が無い / 422 = 送り方は正しいが実行できない。
5. Controller に置くと HTTP の都合とトランザクションが混ざる。Repository に置くと 1 SQL ごとに
   コミットされ、「複数の操作をまとめて成功/失敗させる」ことが表現できない。
6. トランザクション内で取得したエンティティは Hibernate が監視していて、フラッシュ時に変更を
   検知して UPDATE を組み立てる（ダーティチェック）。利点は `save()` の呼び忘れで困らないこと。
   危険は「更新したつもりが無いのに UPDATE される」「いつ SQL が飛ぶか読みにくい」こと。
7. `ORDINAL` は enum の定義順（0,1,2…）を保存するので、定義順を入れ替えた瞬間に既存データの
   意味が変わる。`STRING` なら `'ADD'` という文字列で残るので安全。
8. `@DataJpaTest` はエンティティと DB の対応（マッピング・派生クエリ）を守る。
   `@WebMvcTest` は HTTP としての振る舞い（ステータス・ヘッダ・JSON・エラー応答）を守る。
9. 列の追加はできるが、削除・リネーム・型変更を安全に行えない。既存データの移行も書けない。
   本番にデータが入る前、あるいは列を変更したくなった時点で Flyway に移る。
10. 方言に依存するもの（ネイティブクエリ、`jsonb`、ウィンドウ関数、シーケンスの挙動、
    ロック構文など）を使い始めた瞬間。そのときは Testcontainers で本物の PostgreSQL に対して回す。

## 5. 次にやるなら（[spec.md](../spec.md) §6）

ページング（`Pageable`）→ Flyway → 1 対多リレーションと N+1 → Testcontainers → 楽観ロック。
どれも「今の 1 リソースに 1 つだけ足す」形で学べる。
