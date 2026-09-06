package com.example.taskapi;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * テスト用の PostgreSQL を Testcontainers で提供する。
 *
 * <p>LEARN: {@code @ServiceConnection} を付けると、Spring Boot がこのコンテナの接続情報を 自動で datasource
 * に結線する(URL/user/password を書かなくてよい)。本番と同じ PostgreSQL 16 で テストするので、H2 との方言差でハマらない。
 */
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

  @Bean
  @ServiceConnection
  PostgreSQLContainer postgresContainer() {
    // LEARN: 新しい org.testcontainers.postgresql.PostgreSQLContainer は非ジェネリック。
    // 旧 org.testcontainers.containers.PostgreSQLContainer<SELF> とは別クラス。
    return new PostgreSQLContainer(DockerImageName.parse("postgres:16"));
  }
}
