# ADR 0003: DB は PostgreSQL、開発は Docker Compose 連携

- ステータス: 承認済み
- 日付: 2026-09-07

## 決定

- 本番も開発もテストも **PostgreSQL 16**。H2 は使わない。
- 開発機では **`spring-boot-docker-compose`** モジュールを使い、`./mvnw spring-boot:run` 実行時に
  `compose.yaml` の PostgreSQL を自動起動し datasource を自動結線する。
- テストでは **Testcontainers**（`@ServiceConnection`）が PostgreSQL を提供する。docker-compose 連携は
  `test` プロファイルで無効化。
- スキーマ変更は必ず **Flyway** マイグレーション。`spring.jpa.hibernate.ddl-auto=validate`。

## 根拠

- H2 の方言差で「テストは通るが本番で落ちる」を避ける。環境構築の学習価値も高い。
- docker-compose 連携により、開発者は `docker compose up` を手で打たなくてよい（起動忘れが起きない）。

## 詰まった点（学習ログ）

- ホストの 5432 が他プロジェクトの PostgreSQL コンテナに使われていて衝突。
  → `compose.yaml` のホスト側ポートを **5433** にずらした。`spring-boot-docker-compose` は
  コンテナのポートマッピングを自動で読むのでアプリ側の変更は不要。
- Docker Desktop が起動していないと Testcontainers テストが `Could not find a valid Docker environment`
  で落ちる。CI（GitHub Actions ubuntu runner）には Docker があるので問題なし。

## 不採用

- H2 インメモリのみ → 上記の通り実感が薄い
- H2(dev) + PostgreSQL(prod) のプロファイル切り替え → 方言差のリスクが残る
