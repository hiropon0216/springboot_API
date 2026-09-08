package com.example.taskapi;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * アプリケーションコンテキストが起動することの確認(スモーク)。
 *
 * <p>LEARN: test プロファイルで docker-compose 連携を切り、DB は Testcontainers から取る。Docker が無い
 * 環境ではスキップされる(失敗にはしない)。全レイヤを Docker 無しで通す検証は {@code smoke.CrudFlowSmokeTest}。
 */
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class TaskapiApplicationTests {

  @Test
  void contextLoads() {}
}
