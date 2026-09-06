package com.example.taskapi.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI / OpenAPI ドキュメントのメタ情報。
 *
 * <p>LEARN: springdoc はコントローラを走査して自動でスキーマを作る。ここで補うのは タイトル・説明・バージョンといった全体メタだけ。認証(Bearer)の
 * securityScheme は Sprint 2 で JWT を入れるときに追記する。
 */
@Configuration
public class OpenApiConfig {

  @Bean
  OpenAPI taskApiOpenAPI() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Task Management API")
                .description("Spring Boot の基本を復習するためのタスク管理 API")
                .version("v1"));
  }
}
