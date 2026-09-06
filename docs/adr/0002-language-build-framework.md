# ADR 0002: 言語・ビルドツール・フレームワークのバージョン

- ステータス: 承認済み
- 日付: 2026-09-07

## 決定

| 項目 | 採用 | 備考 |
|---|---|---|
| 言語 | Java 21 (Temurin) | LTS。Spring Boot 4 は Java 17〜26 対応 |
| ビルド | Maven（Maven Wrapper `./mvnw`）| 依存が明示的でチュートリアルとの対応が取りやすい。ローカルに mvn 不要 |
| フレームワーク | Spring Boot **4.0.8** | Spring Framework 7.0.x / Tomcat 11 / Servlet 6.1 |

## 経緯（重要）

壁打ちでは「実績重視」で Spring Boot 3.5.x を選んだが、Sprint 0 着手時（2026-09）に判明:

- **start.spring.io が 3.x を生成しなくなっていた。** 3.5.x は OSS サポート終了済み、無償セキュリティ更新なし。
- 周辺ライブラリ（springdoc-openapi 3.1.0、Testcontainers、Flyway 11）は Boot 4 に追随済み。
- 3→4 は 2→3（`javax`→`jakarta`）ほどの破壊的変更はなく、REST / JPA / Security の基礎知識はほぼそのまま通用する。

→ 「今から始めるなら Boot 4」が素直と判断。4.x の中では保守的な **4.0.x ライン**を採用（4.1 ではなく）。

## Boot 4 で遭遇した差分（学習ログ）

- スターター名: `spring-boot-starter-web` → **`spring-boot-starter-webmvc`**
- Flyway: 生スターターではなく **`spring-boot-starter-flyway`** ＋ `flyway-database-postgresql`
- テストスターターが機能別に分割: `spring-boot-starter-webmvc-test`, `-data-jpa-test`, `-security-test` など
- Testcontainers: `org.testcontainers:postgresql` → **`org.testcontainers:testcontainers-postgresql`**、
  クラスも `org.testcontainers.postgresql.PostgreSQLContainer`（**非ジェネリック**）に変更
- Initializr の内部 id `4.0.8.RELEASE` は Maven 座標では `4.0.8`（`.RELEASE` 接尾辞は付けない）

## 不採用

- Gradle → Maven の明示性を学習で優先
- Spring Boot 3.5.x → 上記の通りサポート切れ
- Spring Boot 4.1.x → 最新すぎる。保守的な 4.0.x を選択
