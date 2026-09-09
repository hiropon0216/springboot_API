package com.example.taskapi.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Sprint 2: JWT ベースのセキュリティ設定。
 *
 * <p>LEARN: Spring Security 6+ はラムダ DSL が主流。{@code .and()} チェーンは廃止された。
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  /**
   * パスワードハッシュに BCrypt を使う。
   *
   * <p>LEARN: BCrypt はソルト込みのハッシュで、コスト因子(デフォルト10)で計算コストを調整できる。 ブルートフォース対策として意図的に遅い設計になっている。MD5/SHA-1
   * でパスワードを保存してはいけない。
   */
  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  /**
   * JWT の検証(デコード)。受け取ったトークンの署名を HMAC-SHA256 で検証する。
   *
   * <p>LEARN: JwtDecoder は oauth2ResourceServer が自動で使う。リクエストごとに Authorization ヘッダの Bearer
   * トークンを取り出し、ここで検証して Authentication をセットする。
   */
  @Bean
  public JwtDecoder jwtDecoder(@Value("${app.jwt.secret}") String secret) {
    // LEARN: 秘密鍵は文字列をバイト列に変換して SecretKeySpec で包む。
    // アルゴリズム名 "HmacSHA256" は JCA(Java Cryptography Architecture)の標準名。
    SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
  }

  /**
   * JWT の生成(エンコード)。JwtService が使う。
   *
   * <p>LEARN: JwtEncoder と JwtDecoder は同じ秘密鍵を共有する(対称鍵暗号)。 Nimbus JOSE+JWT
   * ライブラリ(oauth2-resource-server が依存として持つ)を利用。
   */
  @Bean
  public JwtEncoder jwtEncoder(@Value("${app.jwt.secret}") String secret) {
    SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    // LEARN: ImmutableSecret は単一の対称鍵を JWKSource として包むラッパー。
    JWKSource<SecurityContext> jwks = new ImmutableSecret<>(key);
    return new NimbusJwtEncoder(jwks);
  }

  /**
   * JWT の有効秒数を Bean として公開する。JwtService のコンストラクタに注入する。
   *
   * <p>LEARN: プリミティブ long はそのままでは @Bean 定義できないが、Long のオートボクシングか、 このように long を返すファクトリメソッドを @Bean
   * にすることで DI 可能になる。
   */
  @Bean
  public long jwtExpiresInSeconds(@Value("${app.jwt.expires-in-seconds}") long expiresInSeconds) {
    return expiresInSeconds;
  }

  /**
   * HTTP セキュリティルールの定義。
   *
   * <p>LEARN: requestMatchers の順序は重要。最初にマッチしたルールが適用される。 認証不要なパス(/auth/**, swagger,
   * actuator)を先に許可し、残りをすべて認証必須にする。
   *
   * <p>LEARN: oauth2ResourceServer(jwt) を有効にすると、Authorization: Bearer ヘッダを自動的に 解析し、JwtDecoder
   * で検証した結果を SecurityContext にセットする Spring Security Filter が有効になる。
   */
  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        // LEARN: REST API はセッションを使わないので CSRF トークンは不要。
        // CSRF 攻撃はブラウザのセッション Cookie を悪用するが、Bearer トークンを手動付与する API には当たらない。
        .csrf(csrf -> csrf.disable())
        // LEARN: STATELESS にすることで、リクエストごとに認証を JWT で行い、
        // サーバーサイドにセッション状態を持たない。スケールアウトしやすい設計。
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth
                    // 認証エンドポイントは認証不要
                    .requestMatchers("/api/v1/auth/**")
                    .permitAll()
                    // API ドキュメントは認証不要
                    .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**")
                    .permitAll()
                    // ヘルスチェックは認証不要(監視ツールが叩く)
                    .requestMatchers("/actuator/health")
                    .permitAll()
                    // それ以外はすべて JWT 認証必須
                    .anyRequest()
                    .authenticated())
        // LEARN: oauth2ResourceServer の jwt() を有効にすると、JwtDecoder Bean を使って
        // Authorization: Bearer トークンを自動検証するフィルターが追加される。
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
    return http.build();
  }
}
