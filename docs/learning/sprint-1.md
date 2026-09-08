# 学習ノート — Sprint 1: ドメインと CRUD

## この工程で登場した概念

| 用語 | 説明 |
|---|---|
| **エンティティ / `@Entity`** | DB テーブルに対応する Java クラス。`@Table` で表名、`@Column` で列を指定 |
| **`@MappedSuperclass`** | テーブルにならず、継承先に列定義を配る親クラス。監査カラムの共通化に使用 |
| **JPA Auditing** | `@CreatedDate` / `@LastModifiedDate` ＋ `AuditingEntityListener` ＋ `@EnableJpaAuditing` で、保存・更新時刻を自動セット |
| **`@ManyToOne(fetch = LAZY)`** | 多対一の関連。LAZY は「必要になるまで読まない」。`open-in-view=false` なので参照は Service 内（トランザクション内）で |
| **`@JoinColumn`** | 関連の FK 列名を指定 |
| **`@Enumerated(EnumType.STRING)`** | enum を序数でなく名前で保存（列の並び替え・値追加に強い）|
| **`@OnDelete(SET_NULL)`** | Hibernate 生成スキーマの FK に `on delete set null` を付ける（Flyway 側 DDL と挙動を揃える）|
| **DTO（record）** | API の入出力用の器。エンティティを直接公開しない。リクエスト用（`XxxCreateRequest`）とレスポンス用（`XxxResponse`）を分離 |
| **手書きマッパー** | DTO ↔ エンティティの変換を1クラスに集約。Sprint 3 で MapStruct と比較 |
| **Bean Validation** | `@NotBlank` / `@Size` / `@Pattern` / `@NotNull`。Controller の `@Valid` で発火し、違反は Service に届く前に 400 |
| **RFC 7807 `ProblemDetail`** | エラー応答の標準形式（`type` / `title` / `status` / `detail` ＋ 拡張プロパティ）|
| **`@RestControllerAdvice` / `ResponseEntityExceptionHandler`** | 例外を横断的に捕捉して応答へ変換。後者を継承すると標準例外（バリデーション・JSON パース失敗）の ProblemDetail 化を再利用できる |
| **`@Transactional(readOnly = true)` をクラスに、書き込みメソッドで上書き** | 読み取りは readOnly で最適化、書き込みだけ通常トランザクション。境界は Service メソッド = 1ユースケース |
| **Spring Data クエリメソッド** | `findByOwnerIdOrderByNameAsc` のようにメソッド名からクエリを自動生成 |
| **所有者ベースの絞り込み** | Repository のメソッドを全部 `...AndOwnerId` にして、Service で書き忘れても他人のデータに届かないようにする |
| **`@DataJpaTest`** | Repository と JPA だけをロードする軽いスライステスト。既定は組み込み DB → `replace = NONE` で実 DB（Testcontainers）に |
| **`@WebMvcTest` + `@MockitoBean`** | web 層（Controller + Advice + Jackson + Validation）だけをロード。Service はモック |
| **`@Testcontainers(disabledWithoutDocker = true)`** | Docker が無い環境では失敗でなくスキップ |
| **`L1 キャッシュ（永続化コンテキスト）`** | 同一トランザクション内で同じ ID のエンティティは同一インスタンスが返る。DB を直接変えた後の検証では `em.clear()` が要る |

## なぜこうしたか（要点）

- **認証を Sprint 1 に入れず「固定ユーザー」で進める**: CRUD・バリデーション・例外設計・テストに集中するため。
  `CurrentUserProvider` インターフェース越しにしておけば、Sprint 2 で実装 Bean を1つ差し替えるだけで本物の認証に移行できる。
- **`category/` をお手本にする**: 同じ構成を `task/` が鏡写しにしている。新しいリソースを足すときの型になる。
- **状態遷移ルールを entity の `applyStatus` に閉じ込める**: 「DONE にしたら completedAt が入る」を1箇所で、Spring 無しでテストできる。
- **カテゴリ削除時にタスクを触らない**: `CategoryService` が `TaskRepository` に依存すると feature 間の循環依存になり
  ArchUnit が落ちる。DB の `on delete set null` ＋ `@OnDelete` に任せる。

## 詰まった点と解決

1. `common.security` に `CurrentUserProvider` を置いたら `common → user` と `user → common`（`User extends AuditableEntity`）で
   **ArchUnit の循環依存**に。→ `CurrentUserProvider` を `user` パッケージへ移動。`common` は「特定 feature に依存しない葉」に保つ。
2. Boot 4 で test アノテーションのパッケージが移動: `@DataJpaTest` → `org.springframework.boot.data.jpa.test.autoconfigure`、
   `TestEntityManager` → `...boot.jpa.test.autoconfigure`、`@AutoConfigureTestDatabase` → `...boot.jdbc.test.autoconfigure`。
3. `@Import` する `TestcontainersConfiguration` が package-private で別パッケージのテスト基底から見えず → `public` に。
4. Boot 4 の `TestRestTemplate` 自動登録に不具合（`TestRestTemplateTestAutoConfiguration` の `@ConditionalOnMissingBean` が壊れる）。
   → スモークテストの HTTP クライアントを JDK 標準の `java.net.http.HttpClient` に変更（PATCH も扱える、依存ゼロ）。
5. Boot 4 は **Jackson 3**（`tools.jackson.databind`）。`com.fasterxml.jackson...ObjectMapper` の Bean は無い。
   → テストでは `tools.jackson.databind.json.JsonMapper` を直接 new。`JsonNode.asText()` は deprecated → `asString()`。
6. Checkstyle `MethodName` が日本語テストメソッド名を拒否 → `config/checkstyle/suppressions.xml` で `src/test` の `MethodName` を抑制。
7. **Docker Desktop がこの環境で起動できない** → Testcontainers 系テストは `disabledWithoutDocker` でスキップ、
   代わりに H2（PostgreSQL 互換モード）で全レイヤ疎通スモークを用意。CI では Docker があるのでフル実行される。

## 復習用の問い（スプリント末レビューで回答）

1. なぜ API の入出力にエンティティを直接使わず DTO を挟むのか。具体的に何が防げるか？
2. `CategoryCreateRequest` と `CategoryResponse` を分けているのはなぜか。1つにまとめると何が困るか？
3. `@Transactional(readOnly = true)` をクラスに付け、書き込みメソッドで `@Transactional` を上書きする狙いは？
4. `open-in-view = false` の状態で、`TaskMapper.toResponse` の中で `task.getCategory().getName()` が動くのはなぜか？
   これがもし Controller の中だったらどうなるか？
5. `ResponseEntityExceptionHandler` を継承する利点は。継承せず全部 `@ExceptionHandler` で書くと何が増えるか？
6. Repository のメソッドを全部 `findBy...AndOwnerId` にしているのは、どんな事故を防ぐためか？
7. カテゴリ削除で「タスクの `category_id` を NULL にする」処理を、なぜ `CategoryService` の Java コードで書かずに
   DB の FK 制約に任せたのか？（ヒント: ArchUnit）
8. `Task.applyStatus` を setter でなくメソッドにした理由は？
9. `@WebMvcTest` と `@DataJpaTest` はそれぞれ何をロードして何をロードしないか。どういうテストに使い分けるか？
10. 「404 を返すべきか 403 を返すべきか」— 他人のリソースにアクセスされたとき、この API はどちらを返す設計か。なぜか？
11. `FixedCurrentUserProvider` は Sprint 2 で何に置き換わるか。その差し替えで Service / Controller のコードは変わるか？
12. H2 の PostgreSQL 互換モードでスモークテストを回すことの利点と、それでも本番・通常テストを PostgreSQL でやる理由は？

（回答は `docs/learning/review-deck.md` に追記していく）
