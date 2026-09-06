package com.example.taskapi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Sprint 0 の暫定セキュリティ設定。
 *
 * <p>LEARN: spring-boot-starter-security をクラスパスに置いた時点で、既定では全エンドポイントが
 * 認証必須になり、起動ログにランダムパスワードが出る。Sprint 0 ではまだ認証を実装しないので、 ここで一旦すべて許可し、ヘルスチェックと Swagger UI を通す。
 *
 * <p>この設定は Sprint 2 で JWT ベースの本設定に置き換える。それまでの「土台が動く」ことの確認用。
 */
@Configuration
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        // LEARN: トークン認証の REST API はセッションを持たないので CSRF 対策は不要。
        .csrf(csrf -> csrf.disable())
        // Sprint 0: まだ認証を入れないので全許可。Sprint 2 でここを絞る。
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
    return http.build();
  }
}
