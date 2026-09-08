# 用語集

スプリントを通じて登場した用語を1行で。詳細は各 `docs/learning/sprint-N.md`。

## Sprint 0

- **Spring Initializr** — Spring Boot プロジェクトの雛形生成サービス（start.spring.io）。
- **Maven Wrapper (`mvnw`)** — Maven 未インストールでも指定バージョンで実行できる同梱スクリプト。
- **`spring-boot-starter-parent` / BOM** — 依存バージョンを一元管理する親 pom。
- **プロファイル** — `local`/`test`/`prod` で設定を切り替える仕組み。
- **`spring-boot-docker-compose`** — 開発時に compose.yaml を自動起動し datasource を自動結線するモジュール。
- **Flyway** — `V<番号>__<説明>.sql` を順に適用する DB スキーマのバージョン管理ツール。
- **`ddl-auto`** — Hibernate によるスキーマ操作モード。本プロジェクトは `validate`（検証のみ）。
- **Testcontainers** — テスト実行時に本物のミドルウェアを Docker で立ち上げるライブラリ。
- **`@ServiceConnection`** — Testcontainers のコンテナ接続情報を Spring に自動結線するアノテーション。
- **Actuator** — `/actuator/health` などの運用エンドポイント群。
- **springdoc-openapi** — コントローラから OpenAPI 3.1 ドキュメント / Swagger UI を自動生成。
- **ArchUnit** — アーキテクチャ規約（層の依存方向など）をテストとして書くライブラリ。
- **Spotless** — フォーマットの自動整形（google-java-format）。
- **Checkstyle** — フォーマット以外のコード規約チェック。
- **multi-stage Dockerfile** — ビルド用と実行用のステージを分けて実行イメージを小さくする手法。
- **layered jar** — Boot の fat jar を変化頻度別の層に分解し Docker レイヤキャッシュを効かせる仕組み。
- **`open-in-view`** — リクエスト処理全体で EntityManager を開いたままにするか（本プロジェクトは false）。
- **RFC 7807 / `ProblemDetail`** — HTTP エラー応答の標準形式（`type`/`title`/`status`/`detail` ＋ 拡張）。

## Sprint 1

- **`@Entity` / `@Table` / `@Column`** — クラス/フィールドを DB テーブル/列に対応づける JPA アノテーション。
- **`@MappedSuperclass`** — テーブルにならず継承先に列定義だけを配る親クラス。
- **JPA Auditing** — `@CreatedDate`/`@LastModifiedDate` で保存・更新時刻を自動セット。
- **`@ManyToOne(fetch = LAZY)`** — 多対一関連。必要になるまで読み込まない。
- **`@Enumerated(EnumType.STRING)`** — enum を名前で永続化（序数でなく）。
- **`@OnDelete(SET_NULL)`** — Hibernate 生成 FK に `on delete set null` を付ける。
- **DTO（record）** — API 入出力の器。エンティティを直接公開しない。Create/Update/Response で分ける。
- **マッパー** — DTO ↔ エンティティ変換を集約するクラス（Sprint 1 は手書き）。
- **Bean Validation** — `@NotBlank`/`@Size`/`@Pattern`/`@NotNull`。Controller の `@Valid` で発火。
- **`@RestControllerAdvice`** — 例外を横断的に捕捉して応答へ変換。
- **`ResponseEntityExceptionHandler`** — 標準例外の ProblemDetail 化を再利用できる基底クラス。
- **`@Transactional(readOnly = true)`** — 読み取り専用トランザクション。書き込みメソッドで上書き。
- **Spring Data クエリメソッド** — メソッド名からクエリを自動生成（`findByOwnerIdOrderByNameAsc` 等）。
- **`@DataJpaTest`** — Repository/JPA だけの軽いスライステスト。
- **`@WebMvcTest` / `@MockitoBean`** — web 層だけをロードし依存をモック。
- **`@Testcontainers(disabledWithoutDocker = true)`** — Docker が無ければスキップ（失敗にしない）。
- **L1 キャッシュ（永続化コンテキスト）** — 同一トランザクション内で同じ ID は同一インスタンス。`em.clear()` で追い出す。
- **`CurrentUserProvider`** — 「現在のリクエストユーザー」を返す抽象。Sprint 1 は固定実装、Sprint 2 で認証ベースに差し替え。
