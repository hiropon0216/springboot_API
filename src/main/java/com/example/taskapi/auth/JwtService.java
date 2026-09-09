package com.example.taskapi.auth;

import com.example.taskapi.user.User;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * JWT の生成を担う。
 *
 * <p>LEARN: JWT は「ヘッダ.ペイロード.署名」の3パーツ。ここでは HMAC-SHA256(HS256)で署名する。 対称鍵なので秘密鍵の漏洩 =
 * 偽造トークンが作れる状態になるため、本番では十分な長さと管理が必要。 非対称(RS256/ES256)の方が公開鍵だけ配れるので安全だが、キーペア管理が複雑なため今回は HS256 を採用。
 */
@Service
public class JwtService {

  private final JwtEncoder encoder;
  private final long expiresInSeconds;

  // LEARN: コンストラクタインジェクションは DI コンテナに依存しない単体テストが書きやすく、
  // 必須依存を明示できる。フィールドインジェクション(@Autowired フィールド)は使わない。
  public JwtService(JwtEncoder encoder, long expiresInSeconds) {
    this.encoder = encoder;
    this.expiresInSeconds = expiresInSeconds;
  }

  /**
   * ユーザー情報から JWT アクセストークンを生成して返す。
   *
   * <p>LEARN: sub(subject)に userId(Long の文字列)を入れる。SecurityCurrentUserProvider は この値を Long.parseLong
   * して UserRepository から User を引く。email は追加クレームとして含める。
   */
  public String generateToken(User user) {
    Instant now = Instant.now();

    // LEARN: JwsHeader で署名アルゴリズムを指定。HS256 = HMAC with SHA-256。
    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

    // LEARN: JwtClaimsSet は JWT のペイロード部分。
    //   - issuer: トークン発行者(今回は固定文字列)
    //   - issuedAt: 発行時刻
    //   - expiresAt: 失効時刻
    //   - subject: 誰のトークンか(ここでは userId)
    //   - claim("email"): 標準外の追加クレーム(読み取り専用情報として載せる)
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer("taskapi")
            .issuedAt(now)
            .expiresAt(now.plusSeconds(expiresInSeconds))
            .subject(String.valueOf(user.getId()))
            .claim("email", user.getEmail())
            .build();

    return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
  }

  public long getExpiresInSeconds() {
    return expiresInSeconds;
  }
}
