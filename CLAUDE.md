# CLAUDE.md — springboot_API（計算 API）

Spring Boot による API の基本を、**最小構成で一通り復習する**プロジェクト。
題材は四則演算 API と**その履歴を DB に残す 1 リソース**（`/api/v1/calculations` の CRUD。認証なし）。

> 以前はタスク管理 API だった。2026-09-11 に計算 API へ作り替え（[ADR 0006](docs/adr/0006-pivot-to-calc-api.md)）、
> 2026-09-25 に Model クラスと DB 連携を組み込んだ（[ADR 0007](docs/adr/0007-reintroduce-model-and-database.md)）。
> 2026-09-26 に REST API として仕上げ（[ADR 0008](docs/adr/0008-rest-api-finishing.md)）、
> この API を題材にした学習アプリ `docs/learning/` を作った（[ADR 0009](docs/adr/0009-learning-app.md)）。
> 旧実装は git タグ `archive/task-api`（コミット `cfa1efd`）。

## このプロジェクトでの進め方（重要）

`~/git/CLAUDE.md` にハーネス設計（planner/designer/generator/evaluator と `/harness-*` コマンド）が
書かれているが、**このマシンにハーネスの実体は入っていない**。したがって:

- `/harness-*` コマンドは**使えない**。Claude が planner / generator / evaluator を会話の中で果たす。
- 成果物の書き込み先はハーネスの規約に合わせる:

| パス | 内容 | 誰が書くか |
|---|---|---|
| `docs/brainstorm.md` | 設計合意・不採用案・未決事項 | 承認済み（変更は承認後）|
| `docs/spec.md` | 機能一覧・受け入れ基準・スプリント | Claude（planner 役）|
| `docs/adr/NNNN-*.md` | 軽量 ADR（1 ファイル 1 決定）| 決定発生時 |
| `docs/progress.md` | 実装進捗・自己評価・引き渡し事項 | Claude（generator 役）|
| `docs/feedback/sprint-N.md` | スプリントの合否とバグ一覧 | Claude（evaluator 役）|
| `docs/learning/sprint-N.md` | 概念・用語・つまずき・復習問 | スプリント末 |

作業を始める前に必ず `docs/brainstorm.md` と `docs/spec.md` を読むこと。現在地は `README.md` の「現在地」節。

## プロジェクト種別と検証手段

- 種別: **service**（Spring Boot REST API + PostgreSQL）
- **Docker が必要**（`compose.yaml` の PostgreSQL 17）。ただし `./mvnw verify` はテストが H2 なので Docker 不要。
- 検証（モード B: CLI・API 実行 が主）:
  - `./mvnw spring-boot:run` でアプリ起動（`docker compose up` は自動で走る）
  - `./mvnw verify` でテスト（単体・`@DataJpaTest`・`@WebMvcTest`・context 起動）+ Spotless + Checkstyle + ArchUnit
    + 学習アプリのリンク検査（`LearningLinksTest`。コードを変えて教材のリンクが切れたり行がずれたりすると赤くなる）
  - `curl` / Swagger UI（`/swagger-ui.html`）でエンドポイント確認
  - `GET /actuator/health` が `UP`（DB 接続も見ている）
  - DB の中身は `docker compose exec postgres psql -U calc -d calc -c 'select * from calculations;'`
- **コードを読むだけで合格を出さない。** 実際に動かす。実施できなかった検証は「検証不能」と正直に記録する。

## アーキテクチャ不変条件

CI（ArchUnit / Checkstyle / Spotless）でも強制する。破る変更は入れない。

1. **層の依存方向は一方向**: Controller → Service → Repository。逆向きの参照（Service が Controller を
   見る）も、飛び越し（Controller が Repository を直接触る）も禁止。
2. **package-by-feature**: フィーチャー（現状 `calculation`）＋ 横断の `common` / `config`。
   機能をまたぐ共通処理だけ `common` に置く。entity / repository もフィーチャーの中に置く。
3. **内部表現をそのまま公開しない**: API の入出力は必ず Java `record` の DTO。
   リクエスト用（`XxxRequest`）とレスポンス用（`XxxResponse`）を分ける。
   **エンティティを Controller に登場させない**（変換は `XxxMapper` に閉じる）。
4. **エラー応答は RFC 9457（旧 RFC 7807）`ProblemDetail` に統一**: `common/exception` のカスタム例外を投げ、
   `@RestControllerAdvice`（`GlobalExceptionHandler`）で変換。Controller / Service は
   ステータスコードや JSON を組み立てない。
5. **トランザクション境界は Service**: クラスに `@Transactional(readOnly = true)`、書き込みメソッドに
   `@Transactional`。Controller にも Repository にも置かない。

## ゴールデンパス（お手本 feature）

`calculation/` が唯一の実装例。**新しいリソースを足すときはこの構成を鏡写しにする**。
ファイルを触る順序:

1. `docs/spec.md` に受け入れ基準とデータモデル（テーブル定義）を追記（planner 役）
2. entity（`@Entity`）→ repository（`JpaRepository` の interface）
3. enum / dto（request / response）→ mapper（entity → response）→ service → controller
4. テスト: 単体（service を `new` し repository をモック）→ `@DataJpaTest`（repository）→
   `@WebMvcTest`（controller、service は `@MockitoBean`）
5. OpenAPI アノテーション確認、実 HTTP で叩く、`docs/progress.md` 更新

DB を持たない機能なら 2 を飛ばす（「すべての機能に DB が要る」わけではない）。
スキーマを変える変更は `ddl-auto: update` が追従できる範囲（列の追加）に留める。
列の削除・リネーム・型変更が必要になったら、先に Flyway を入れる（[spec.md](docs/spec.md) §6）。

## コーディング規約

- **学習用コメントを積極的に入れる**（写経しやすさ優先）。非自明な箇所には `// LEARN: なぜこうするか` を付ける。
  → 本プロジェクトの明示規約であり、`~/git/CLAUDE.md` の「周囲と同じコメント密度」より**優先**する。
- DTO は `record`（不変）。エンティティは通常のクラス（JPA が要求するデフォルトコンストラクタ付き）。
- **Lombok は使わない**。getter / setter は手で書く（生成されるコードを読めない状態を作らない）。
- エンティティに setter を並べず、`replaceExpression` のように「操作の名前」でメソッドを作る。
- フォーマットは Spotless（google-java-format）。コミット前に `./mvnw spotless:apply`。
- 命名: Controller は `XxxController`、Service は `XxxService`、
  DTO は `XxxRequest` / `XxxResponse`。API パスは `/api/v1/...`、複数形リソース名。

## Definition of Done（各スプリント共通）

- [ ] 受け入れ基準（`docs/spec.md` の該当スプリント）を全て満たす
- [ ] `./mvnw verify` がグリーン（テスト＋Checkstyle＋Spotless＋ArchUnit）
- [ ] 新規/変更エンドポイントを実際に叩いて確認した（`curl` か Swagger UI か `api-console.html`）
- [ ] `docs/progress.md` を更新した
- [ ] `docs/learning/sprint-N.md` を書き、復習問に答えた
- [ ] 破壊的変更や未解決の課題を「引き渡し事項」に明記した
- [ ] `git tag sprint-N` を打った

## 主要な設計判断（詳細は docs/brainstorm.md、理由は docs/adr/）

- Java 21 / Spring Boot 4.0.8 / Maven（[ADR 0002](docs/adr/0002-language-build-framework.md)）
- 題材は計算 API、認証なし（[ADR 0006](docs/adr/0006-pivot-to-calc-api.md)）
- 計算履歴を DB に永続化し REST の 6 操作を持つ（[ADR 0007](docs/adr/0007-reintroduce-model-and-database.md)）
- 一覧はページング（`?page=&size=`・`PagedModel`・並びはサーバー固定）、PATCH は JSON Merge Patch、
  500 も ProblemDetail（[ADR 0008](docs/adr/0008-rest-api-finishing.md)）
- 学習アプリ（`docs/learning/index.html`）は REST API 編とアジャイル・スクラム編の 2 コース
  （[ADR 0009](docs/adr/0009-learning-app.md) / [ADR 0010](docs/adr/0010-agile-course.md)。書き方は `docs/learning/chapters/AUTHORING.md`）
- DB: 開発・本番は PostgreSQL 17（Docker Compose / Render）、**テストは H2 インメモリ**
- スキーマは `ddl-auto: update`。Flyway は未導入（意図的な保留。[spec.md](docs/spec.md) §6）
- 依存: webmvc / validation / actuator / data-jpa / postgresql / docker-compose / springdoc-openapi
  ＋ テスト（webmvc-test / validation-test / data-jpa-test / h2 / archunit）
- CI: GitHub Actions（`./mvnw verify`。テストは H2 なので DB サービス不要）
  / CD: Render へ Docker デプロイ（Web Service + PostgreSQL）
- CORS は `WebMvcConfigurer`（Security が無いので MVC 層で完結）
- 学習アプリ（教科書 ＆ 問題集）は `docs/learning/index.html` ＋ `chapters/chNN.js`（[ADR 0009](docs/adr/0009-learning-app.md)）。
  書き方は `docs/learning/chapters/AUTHORING.md`。実装を変えたら、関係する章の本文も読み直す
