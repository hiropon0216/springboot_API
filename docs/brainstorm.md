# 壁打ち合意事項

- 当初承認日: 2026-09-06（タスク管理 API）
- 目的: Spring Boot による API の基本を、最小構成で一通り復習する。
  API 自体の複雑さは重視せず、「基礎を一通り通す」ことと「学んだ知識を蓄積・復習できる状態で残す」ことを重視する。

---

## 2026-09-11 — 題材を計算 API に変更（承認済み）

Sprint 0〜4 でタスク管理 API を完成させたあと、学習の足場としては題材が大きすぎる
（用途が伝わりにくい / コア概念が埋もれる）という結論に至り、題材を
**四則演算をするだけの計算 API** に作り替えた。詳細と理由は [ADR 0006](adr/0006-pivot-to-calc-api.md)。

- 新エンドポイント: `POST /api/v1/calculations` の 1 本のみ
- 維持: スタック（Java 21 / Boot 4.0.8 / Maven）、層の一方向依存、package-by-feature、
  DTO=record、ProblemDetail、Spotless / Checkstyle / ArchUnit / CI / Docker / Render
- 撤去: 認証・認可、JPA / DB / Flyway、`User` / `Category` / `Task`、Testcontainers
- ルートパッケージ `com.example.taskapi` → `com.example.calc`
- 旧実装は git タグ `archive/task-api`（コミット `cfa1efd`）で保全

現行の仕様・受け入れ基準は [spec.md](spec.md)、決定の履歴は [adr/](adr/) を参照。

---

## 2026-09-25 — Model クラスと DB 連携を追加（承認済み）

利用者から「REST API の基本が詰まった仕様にしたい。Model クラスや DB 連携まで含めたい」という
要望が出た。題材（計算 API）は維持したまま、**計算履歴を DB に永続化するリソース**に拡張する。
詳細と理由は [ADR 0007](adr/0007-reintroduce-model-and-database.md)。

- リソース設計: 計算履歴を永続化（`Calculation` エンティティ 1 つ・テーブル 1 つ）
- DB: **PostgreSQL 17 + Docker Compose**（テストは H2 インメモリなので `./mvnw verify` は Docker 不要）
- REST: 一覧 / 取得 / 作成（201 + `Location`）/ 全置換（PUT）/ 部分更新（PATCH）/ 削除（204）＋ 404
- 追加で学ぶもの: `@Entity`・Repository 層・`@Transactional`・Entity ↔ DTO 変換（手書き Mapper）
- 今回のスコープ外: ページング、Flyway、1 対多リレーション、認証（[spec.md](spec.md) §6「今後の候補」）
- ADR 0006 の「永続化なし・Docker 不要」は撤回。「題材は計算 API」「認証なし」の判断は維持

不採用案（H2 だけで完結 / タグを足して 1 対多 / 別リソース追加 / Flyway 同時導入 /
ページング同時導入 / PUT で upsert）は ADR 0007 の表に記載。

---

## タスク管理 API 時点の合意（アーカイブ済み）

スコープ / アーキテクチャ合意 / スプリント骨子 / 学習の蓄積設計 / チーム × Claude 前提の設計 /
不採用案 / 未決事項の詳細は、git タグ **`archive/task-api`**（コミット `cfa1efd`）の
`docs/brainstorm.md` に残っている。計算 API でも有効な部分は ADR 0002（言語・FW）・
ADR 0004（package-by-feature とガードレール）・[CLAUDE.md](../CLAUDE.md) に引き継いだ。
