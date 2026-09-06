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
- **RFC 7807 / `ProblemDetail`** — HTTP エラー応答の標準形式（Sprint 1 で導入予定）。
