package com.example.taskapi;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * アプリケーションコンテキストが起動することの確認(スモーク)。
 *
 * <p>LEARN: test プロファイルで docker-compose 連携を切り、DB は Testcontainers から取る。
 */
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class TaskapiApplicationTests {

  @Test
  void contextLoads() {}
}
