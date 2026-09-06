# ADR 0001: このプロジェクトでの Claude の使い方

- ステータス: 承認済み
- 日付: 2026-09-06

## 背景

`~/git/CLAUDE.md` に planner/designer/generator/evaluator エージェントと `/harness-*` コマンドから成る
ハーネス設計が書かれているが、開発機の `~/.claude/` にその実体が存在しない（確認済み）。
一方このプロジェクトの目的の1つは「大人数 × Claude 前提の開発設計を学ぶ」こと。

## 決定

1. **ハーネスのコマンドは使わない。** Claude が planner / generator / evaluator の役割を会話の中で
   手動で果たす。designer 役は不要（純粋な REST API で UI 設計なし）。
2. **成果物の置き場はハーネス規約に合わせる**（`docs/spec.md` / `docs/progress.md` /
   `docs/feedback/sprint-N.md` / `docs/adr/` / `docs/learning/`）。所有者は各プロジェクト `CLAUDE.md` の表。
3. **共有の単一情報源は git**。CLAUDE.md・docs/・`.claude/settings.json`・ArchUnit テストを git 管理し、
   チャット履歴と個人メモリに知識を溜めない。新セッションは `README.md` の「現在地」→ `docs/brainstorm.md`
   → `docs/spec.md` の順で状況を把握できる状態を保つ。
4. **境界は機械で強制する。** 層の依存方向は ArchUnit、フォーマットは Spotless、規約は Checkstyle。
   `./mvnw verify` がグリーンでないコードはマージしない。
5. **ゴールデンパス**: `category/` を正典の実装例とし、新リソースはその構成を鏡写しにする。
6. **プロジェクト固有 skills**（`.claude/skills/`、git 配布）を将来整備する:
   `add-feature` / `add-migration` / `review-checklist` / `contract-check`。

## 不採用

- 失われたハーネスを `~/.claude/` に再建する / このリポ内に軽量版を作る
  → まず API 実装を進め、Claude 運用の知見が溜まってから skills 化する方が学びの順序として良い。
- 学習ノート専任の mentor エージェント新設 → スプリント末の対話レビューで代替（[[docs/learning]]）。

## 影響

- 責務の分離は「人間（Claude）の自己規律 + `CLAUDE.md` の絶対ルール」で担保する。強制力は弱いので
  逸脱に気づいたら記録する。
