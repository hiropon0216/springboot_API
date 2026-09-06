# 学習ノート — Sprint 0: 環境構築

## この工程で登場した概念

| 用語 | 1〜2行の説明 |
|---|---|
| **Spring Initializr** | `start.spring.io`。依存とメタ情報を指定して Spring Boot プロジェクトの雛形（pom / wrapper / src）を生成するサービス。REST API があり `curl` でも叩ける |
| **Maven Wrapper (`mvnw`)** | プロジェクトに同梱するスクリプト。ローカルに Maven を入れなくても、指定バージョンの Maven を自動取得して実行する。CI と開発者で同じビルド環境を保証 |
| **BOM / `spring-boot-starter-parent`** | 依存のバージョンを一元管理する仕組み。子 pom はバージョンを書かずに済む。Boot が管理しないものだけ `<properties>` で固定 |
| **プロファイル** | `local` / `test` / `prod` で設定を切り替える。`application.yml` 内の `spring.config.activate.on-profile` か `application-<profile>.yml` |
| **`spring-boot-docker-compose`** | 開発時に `compose.yaml` を自動起動し、コンテナの接続情報を datasource に自動結線するモジュール。`test`/`prod` では無効化 |
| **Flyway** | DB スキーマのバージョン管理。`V<番号>__<説明>.sql` を順に適用し `flyway_schema_history` に記録。`ddl-auto=validate` と組み合わせ、スキーマの正はマイグレーション、Hibernate は検証のみ |
| **Testcontainers + `@ServiceConnection`** | テスト実行時に本物の PostgreSQL を Docker で立ち上げ、接続情報を Spring に自動結線。H2 の方言差を回避 |
| **Actuator** | 運用エンドポイント（`/actuator/health` など）。公開範囲は `management.endpoints.web.exposure.include` で明示 |
| **springdoc-openapi** | コントローラを走査して OpenAPI 3.1 ドキュメントと Swagger UI を自動生成 |
| **ArchUnit** | アーキテクチャ規約（層の依存方向、循環依存の禁止）をテストとして書くライブラリ |
| **Spotless / Checkstyle** | 前者はフォーマットの自動整形（google-java-format）、後者はそれ以外の規約チェック |
| **multi-stage Dockerfile** | ビルド用（JDK + Maven）と実行用（JRE のみ）のステージを分け、実行イメージを小さく保つ |
| **layered jar（`jarmode=tools extract --layers`）** | Spring Boot の fat jar を「依存 / ローダ / スナップショット依存 / アプリ」に分解。変化の少ない層を下に置いて Docker レイヤキャッシュを効かせる |
| **`open-in-view`** | false にするとリクエスト処理中ずっと EntityManager を開いたままにしない。遅延ロードは Service 層（トランザクション内）で完結させる設計を強制できる |

## なぜこの選択をしたか（要点）

- **Maven**: 依存が XML で明示的。学習リソースとの対応が取りやすい。
- **PostgreSQL + Docker Compose**（H2 でなく）: 「テストは通るが本番で落ちる」を避ける。環境構築自体が学習対象。
- **Spring Boot 4.0.8**（3.5 でなく）: 壁打ちでは 3.5 を選んだが、着手時点で 3.5 はサポート切れ・Initializr が生成不可だった。詳細は [ADR 0002](../adr/0002-language-build-framework.md)。
- **package-by-feature ＋ ArchUnit**: 変更範囲が読みやすく、層の逸脱を CI で自動検出。詳細は [ADR 0004](../adr/0004-package-by-feature-and-guardrails.md)。

## 詰まった点と解決

1. `spring-boot-starter-parent:4.0.8.RELEASE` が解決できない → Maven 座標は `4.0.8`（`.RELEASE` を付けない）。Initializr の内部 id と混同していた。
2. `PostgreSQLContainer<?>` がコンパイルエラー → Boot 4 の `org.testcontainers.postgresql.PostgreSQLContainer` は非ジェネリック（旧クラスと別物）。
3. Testcontainers テストが `Could not find a valid Docker environment` → Docker Desktop 未起動。起動して解決。
4. `docker compose up` が `port 5432 already allocated` → 他プロジェクトの PG コンテナと衝突。ホスト側を 5433 に変更。
5. Checkstyle `ConstantName` が ArchUnit の lower_snake フィールド名を拒否 → `format` を両許可に調整。
6. `docker build` で Checkstyle 設定ファイルが見つからず失敗 → イメージビルドでは品質ゲートをスキップ（CI の責務）。
7. コンテナ実行時 `Unable to access jarfile application.jar` → Boot 4 の `extract` はアプリ jar 名を元のまま保つ。`--application-filename application.jar` を指定。

## 復習用の問い（スプリント末レビューで回答する）

1. `ddl-auto` を `validate` にする狙いは何か。`update` や `create` ではだめな理由は？
2. `spring-boot-docker-compose` はローカル開発で何をやってくれるか。なぜ `test` プロファイルでは切るのか？
3. Testcontainers の `@ServiceConnection` は具体的に何を自動でやっているか？
4. multi-stage Dockerfile で「依存の取得」と「ソースのコピー」を別ステップに分けると何が嬉しいか？
5. layered jar に分解してコピー順を工夫すると、どういう変更のときにビルドが速くなるか？
6. `open-in-view: false` にすると、どんなコードが書けなくなる（書きにくくなる）か？
7. ArchUnit のルールは今「素通り」しているのに、なぜ Sprint 0 で入れておく価値があるのか？
8. Spotless と Checkstyle は役割がどう違うか。両方いる理由は？
9. `application-prod.yml` で DB 接続情報を環境変数参照にしているのはなぜか？
10. Flyway と Hibernate の `ddl-auto` はスキーマに対してそれぞれどんな責務を持つか？

（回答は `docs/learning/review-deck.md` に追記していく）
