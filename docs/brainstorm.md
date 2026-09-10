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

## タスク管理 API 時点の合意（アーカイブ済み）

スコープ / アーキテクチャ合意 / スプリント骨子 / 学習の蓄積設計 / チーム × Claude 前提の設計 /
不採用案 / 未決事項の詳細は、git タグ **`archive/task-api`**（コミット `cfa1efd`）の
`docs/brainstorm.md` に残っている。計算 API でも有効な部分は ADR 0002（言語・FW）・
ADR 0004（package-by-feature とガードレール）・[CLAUDE.md](../CLAUDE.md) に引き継いだ。
