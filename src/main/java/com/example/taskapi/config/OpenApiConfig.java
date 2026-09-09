package com.example.taskapi.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI / OpenAPI ドキュメントのメタ情報。
 *
 * <p>LEARN: Sprint 3 で BearerAuth securityScheme を追加した。これにより Swagger UI に「Authorize」ボタンが現れ、
 * トークンを入力してから保護エンドポイントを試せるようになる。
 *
 * <p>LEARN: securityScheme は「このAPIはBearerトークンを使う」という仕様の宣言。 {@code addSecurityItem}
 * でグローバルに適用すると、全エンドポイントに鍵アイコンが付く。 個別エンドポイントに {@code @SecurityRequirement} を付けることで制御することも可能。
 */
@Configuration
public class OpenApiConfig {

  private static final String BEARER_AUTH = "BearerAuth";

  @Bean
  OpenAPI taskApiOpenAPI() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Task Management API")
                .description("Spring Boot の基本を復習するためのタスク管理 API")
                .version("v1"))
        // LEARN: SecurityScheme の定義。type=HTTP, scheme=bearer, bearerFormat=JWT は
        // OpenAPI 3.0 の標準的な JWT Bearer の記述方法。
        .components(
            new Components()
                .addSecuritySchemes(
                    BEARER_AUTH,
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("JWT アクセストークンを入力してください (POST /api/v1/auth/login で取得)")))
        // LEARN: グローバル securityRequirement。全エンドポイントに適用される。
        // /auth/** は SecurityConfig で permitAll() なので実際には不要だが、
        // Swagger UI の UI 統一のためグローバルで設定しておく。
        .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH));
  }
}
