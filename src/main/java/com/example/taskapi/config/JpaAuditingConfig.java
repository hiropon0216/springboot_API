package com.example.taskapi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing を有効化する。
 *
 * <p>LEARN: {@code @EnableJpaAuditing} を main クラスに直接付けると、{@code @WebMvcTest} など JPA
 * を読み込まないスライステストでも読み込まれて無駄な依存が増える。専用の設定クラスに切り出しておくと、 必要なテストだけがこれを {@code @Import} すればよい。
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {}
