package com.example.calc;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * アプリケーションコンテキストが起動できることの確認。
 *
 * <p>LEARN: {@code @SpringBootTest} は全 Bean を組み立てた完全なコンテキストを立ち上げる。 DB も外部依存も無いので一瞬で終わる。Bean
 * の配線ミス(コンストラクタ引数が解決できない等)は ここで落ちる。
 */
@SpringBootTest
class CalcApiApplicationTests {

  @Test
  void contextLoads() {}
}
