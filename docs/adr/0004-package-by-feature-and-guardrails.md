# ADR 0004: package-by-feature と機械的ガードレール

- ステータス: 承認済み
- 日付: 2026-09-07

## 決定

### パッケージ構成: package-by-feature

```
com.example.taskapi
├── config/     SecurityConfig, OpenApiConfig
├── common/     例外・ProblemDetail・ページング・Auditing（機能をまたぐ共通処理のみ）
├── auth/       AuthController, AuthService, JwtService, dto
├── user/       User, UserRepository, UserService
├── category/   controller / service / repository / entity / dto / mapper  ← お手本
└── task/       同上
```

レイヤーで切る（`controller/` `service/` `repository/` を最上位）方式は不採用。機能単位のほうが
変更範囲が読みやすく、Claude にも「どこに何を書くか」が予測可能。

### ガードレール（すべて `./mvnw verify` で強制）

| ツール | 役割 |
|---|---|
| **ArchUnit** | 層の依存方向。Controller は Repository を直接呼ばない／Service・Repository は Controller に依存しない／feature パッケージ間に循環なし |
| **Spotless**（google-java-format）| フォーマットの唯一の正。`./mvnw spotless:apply` で自動整形 |
| **Checkstyle** | フォーマット以外の規約（star import 禁止、命名、明白なバグの温床）。Sprint 0 は最小、Sprint 3 で強化 |

## 詰まった点（学習ログ）

- Checkstyle `ConstantName` が ArchUnit の `static final ArchRule` フィールド（lower_snake_case が慣習）を
  弾いた。→ `ConstantName` の `format` を UPPER_SNAKE と lower_snake の両方許可に調整。
- Docker イメージビルドでは Checkstyle 設定ファイル（`config/`）をコピーしていないため失敗。
  → イメージビルドの責務は「jar を作る」ことだけと割り切り、`-Dcheckstyle.skip -Dspotless.check.skip`。
  品質ゲートは CI の責務。

## 影響

- 新しい feature を足すたびに ArchUnit のルールが自動で効く。命名規約（`*Controller` / `*Service` /
  `*Repository`）を守ることがルールの前提。
