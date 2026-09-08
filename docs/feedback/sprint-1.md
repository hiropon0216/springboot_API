# Sprint 1 検証結果

- 検証日: 2026-09-08
- 判定: **合格**
- 検証者: Claude（evaluator 役）

## 実施した検証

### 1. 自動テスト（`./mvnw verify`）

**BUILD SUCCESS — 34 tests / 0 failures / 0 errors / 0 skipped**（Docker あり）

| テスト | 件数 | 種別 | 内容 |
|---|---|---|---|
| `TaskStatusTransitionTest` | 4 | 単体 | `applyStatus` の completedAt ルール |
| `CategoryServiceTest` | 4 | 単体(Mockito) | 重複 409 / not found / 更新の自己除外 / delete |
| `TaskServiceTest` | 5 | 単体(Mockito) | カテゴリ解決 422 / null カテゴリ / 要約 / DONE 副作用 / 404 |
| `CategoryControllerTest` | 6 | スライス(`@WebMvcTest`) | 201+Location / 400 errors / color 400 / 404 / 409 / 204 |
| `TaskControllerTest` | 5 | スライス(`@WebMvcTest`) | 201 / 400 / 不正 enum 400 / 422 / 404 |
| `CategoryRepositoryTest` | 4 | `@DataJpaTest`+Testcontainers | 所有者絞り / 他人排除 / 複合ユニーク / 監査カラム |
| `TaskCategoryLinkTest` | 1 | `@DataJpaTest`+Testcontainers | カテゴリ削除で task.category が NULL、task は残存（実 PostgreSQL の `on delete set null`）|
| `CrudFlowSmokeTest` | 1 | `@SpringBootTest`(H2) | 全レイヤを実 HTTP で1本通し |
| `TaskapiApplicationTests` | 1 | `@SpringBootTest`+Testcontainers | フルコンテキスト起動 |
| `LayeredArchitectureTest` | 3 | ArchUnit | 層の依存方向 / feature 間の循環なし |

Spotless / Checkstyle も pass。

### 2. 手動検証（`./mvnw spring-boot:run`、local プロファイル、実 PostgreSQL 16）

`curl` で全エンドポイントを実行し、期待どおりを確認:

| 操作 | 結果 |
|---|---|
| `GET /api/v1/categories` | seed の「仕事」「プライベート」を name 昇順で返す |
| `GET /api/v1/tasks` | seed タスクを nested category 付きで返す |
| `POST /api/v1/categories` | 201 + `Location: /api/v1/categories/3` |
| `POST` 同名 | 409 |
| `POST` name 空 | 400、`{"title":"入力値が不正です","errors":{"name":"must not be blank"}}` |
| `POST /api/v1/tasks`（categoryId 指定）| 201、`"category":{"id":4,"name":"Errands"}` |
| `PATCH /api/v1/tasks/{id}/status` DONE | 200、`completedAt` に時刻 |
| 同 TODO に戻す | `completedAt: null` |
| `PUT /api/v1/tasks/{id}` | title 更新、`updatedAt` 変化 |
| `PATCH` 不正 enum | 400 |
| `POST /api/v1/tasks` 不正 categoryId | 422 |
| `GET /api/v1/tasks/999999` | 404 ProblemDetail |
| `DELETE /api/v1/categories/{id}` | 204 |
| 削除後に `GET /api/v1/tasks/{id}` | `"category":null`、タスクは生存 |
| `PUT` 削除済みカテゴリ | 404 |
| `GET /swagger-ui.html` | 200 |
| `GET /v3/api-docs` | OpenAPI 3.1、全パス掲載 |

Flyway ログで `V1__create_user_category_task` が実 PostgreSQL に適用されたことを確認。

## 受け入れ基準の充足

`docs/spec.md` Sprint 1 の受け入れ基準6項目、すべて満たす。

## 補足（不合格ではないが記録）

- Docker Desktop の起動にこのマシンで手間取り、途中まで Testcontainers 系がスキップ実行だった。
  最終的に `wsl --shutdown` → Docker Desktop 再起動でフル実行し全 34 件 green を確認済み。
- `@Testcontainers(disabledWithoutDocker = true)` により、Docker 無し環境でも `verify` は
  green になる（該当テストはスキップ）。CI（Linux runner）ではフル実行される。

## Sprint 2 へ

引き渡し事項は [docs/progress.md](../progress.md) の Sprint 1 セクション参照。次は認証・認可。
