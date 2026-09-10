package com.example.calc.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI / OpenAPI ドキュメントのメタ情報。
 *
 * <p>LEARN: springdoc-openapi が Controller のアノテーション({@code @Operation} など)を読んで OpenAPI の JSON
 * ({@code /v3/api-docs})と Swagger UI ({@code /swagger-ui.html})を自動生成する。 この Bean
 * はタイトルや説明といった「文書全体の見出し」だけを差し込む。
 */
@Configuration
public class OpenApiConfig {

  @Bean
  OpenAPI calcApiOpenAPI() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Calc API")
                .description("四則演算をするだけの、Spring Boot 基礎学習用 API")
                .version("v1"));
  }
}
