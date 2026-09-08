package com.example.taskapi.support;

import com.example.taskapi.TestcontainersConfiguration;
import com.example.taskapi.config.JpaAuditingConfig;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * {@code @DataJpaTest} 系の共通土台。
 *
 * <p>LEARN: {@code @DataJpaTest} は既定で組み込み DB に差し替えようとするが、このプロジェクトに組み込み DB は 無い。{@code replace =
 * NONE} ＋ Testcontainers の PostgreSQL で「本番と同じ DB」でテストする。 監査カラム(created_at 等)を埋めるため {@link
 * JpaAuditingConfig} も取り込む。
 *
 * <p>Spring Boot 4 では test 用アノテーションがモジュール分割され、パッケージが {@code
 * org.springframework.boot.data.jpa.test.autoconfigure} などに移動している。
 *
 * <p>{@code @Testcontainers(disabledWithoutDocker = true)}: Docker が無い環境ではこのクラスのテストは
 * 「失敗」でなく「スキップ」になる。CI(Docker あり)では通常どおり実行される。
 */
@DataJpaTest
@Import({TestcontainersConfiguration.class, JpaAuditingConfig.class})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
public abstract class AbstractPostgresDataJpaTest {}
