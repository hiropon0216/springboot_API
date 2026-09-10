package com.example.calc.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS(Cross-Origin Resource Sharing)の許可ルール。
 *
 * <p>LEARN: CORS とは、ブラウザが「今表示しているページのオリジンと、別オリジンへの fetch/XHR」を 既定でブロックする安全機構。サーバーが {@code
 * Access-Control-Allow-*} レスポンスヘッダで明示的に 許可を返すと通る。副作用のある(POST 等)リクエストの前に、ブラウザは {@code OPTIONS}
 * プリフライトを 送って「このメソッド・ヘッダで送っていいか」を先に確認する。
 *
 * <p>LEARN: このアプリは Spring Security を使わない素の Spring MVC なので、CORS 設定は {@code WebMvcConfigurer}
 * に書くのが素直。(Security を入れると MVC 層より手前のフィルタでプリフライトが弾かれるので、 その場合は {@code CorsConfigurationSource} Bean
 * + {@code http.cors()} が必要になる。)
 *
 * <p>LEARN: {@code Authorization} も Cookie も送らないので {@code allowCredentials} は false のまま。 その場合だけ
 * {@code allowedOriginPatterns} にワイルドカードを使える。
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
        .addMapping("/api/**")
        // LEARN: 開発用に広め。localhost の任意ポート(VS Code Live Server 等)と、
        // ブラウザ上の API コンソールが動くサンドボックスドメインを許可。
        // 本番で別オリジンのフロントを載せるときは、その URL だけに絞ること。
        .allowedOriginPatterns(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://*.claudeusercontent.com",
            "https://*.claude.site")
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(false)
        // LEARN: プリフライト結果をブラウザがキャッシュする秒数。毎回 OPTIONS が飛ぶのを抑える。
        .maxAge(3600);
  }
}
