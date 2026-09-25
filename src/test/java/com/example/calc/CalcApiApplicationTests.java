package com.example.calc;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * アプリケーションコンテキストが起動できることの確認。
 *
 * <p>LEARN: {@code @SpringBootTest} は全 Bean を組み立てた完全なコンテキストを立ち上げる。Bean の配線ミス、
 * エンティティのマッピング不正（{@code @Id} 忘れ、型とカラムの不一致など）はここで落ちる。
 *
 * <p>LEARN: {@code @ActiveProfiles("test")} で {@code src/test/resources/application-test.yml} を
 * 読ませ、DB を H2（インメモリ）に差し替えている。これが無いと local プロファイルが有効になり、 PostgreSQL への接続を試みて（＝ Docker が動いていないと）失敗する。
 * <strong>テストは外部環境に依存させない</strong>、が原則。
 */
@SpringBootTest
@ActiveProfiles("test")
class CalcApiApplicationTests {

  @Test
  void contextLoads() {}
}
