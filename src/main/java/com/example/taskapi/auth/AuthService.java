package com.example.taskapi.auth;

import com.example.taskapi.auth.dto.LoginRequest;
import com.example.taskapi.auth.dto.LoginResponse;
import com.example.taskapi.auth.dto.RegisterRequest;
import com.example.taskapi.auth.dto.UserResponse;
import com.example.taskapi.common.exception.DuplicateResourceException;
import com.example.taskapi.user.Role;
import com.example.taskapi.user.User;
import com.example.taskapi.user.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 認証・登録ロジックを担う Service。
 *
 * <p>LEARN: Controller → Service → Repository の依存方向を守る。Service が他の Service や Repository
 * を呼ぶことはあるが、Controller を呼ぶことは絶対にない。
 *
 * <p>LEARN: クラスレベルの {@code @Transactional(readOnly = true)} を基底として置き、 書き込みメソッドに
 * {@code @Transactional} を上書きするパターン。Sprint 3 の ArchUnit ルールで強制される。
 */
@Service
@Transactional(readOnly = true)
public class AuthService {

  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  /**
   * 新規ユーザーを登録する。
   *
   * <p>LEARN: email 重複チェックは DB の unique 制約でも弾かれるが、ユーザーに分かりやすいエラーを返すため 先にアプリ側で確認する。DB
   * 例外より先にビジネスエラーを返せる。
   *
   * @throws DuplicateResourceException email が既に登録済みの場合
   */
  @Transactional
  public UserResponse register(RegisterRequest req) {
    if (users.existsByEmail(req.email())) {
      throw new DuplicateResourceException("メールアドレス『" + req.email() + "』は既に登録されています");
    }

    User user = new User();
    user.setEmail(req.email());
    // LEARN: BCrypt はソルト込みでハッシュ化するため、同じパスワードでも毎回異なる文字列になる。
    // 平文をそのまま DB に保存してはいけない。
    user.setPassword(passwordEncoder.encode(req.password()));
    user.setDisplayName(req.displayName());
    user.setRole(Role.USER);

    User saved = users.save(user);
    return toUserResponse(saved);
  }

  /**
   * ログインしてアクセストークンを返す。
   *
   * <p>LEARN: 存在しない email でも「メールアドレスが間違っている」と返さず BadCredentialsException を投げる。 これは存在秘匿(user
   * enumeration 防止)のため。攻撃者に「このメールは登録済み」という情報を与えない。
   *
   * @throws BadCredentialsException email またはパスワードが一致しない場合
   */
  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest req) {
    User user =
        users
            .findByEmail(req.email())
            // LEARN: orElseThrow で Optional を展開。見つからない場合も BadCredentialsException。
            .orElseThrow(() -> new BadCredentialsException("メールアドレスまたはパスワードが正しくありません"));

    // LEARN: matches(rawPassword, encodedPassword) で BCrypt 照合。
    // 入力パスワードを DB のハッシュと比較する。逆方向(ハッシュ→平文)は不可能。
    if (!passwordEncoder.matches(req.password(), user.getPassword())) {
      throw new BadCredentialsException("メールアドレスまたはパスワードが正しくありません");
    }

    String token = jwtService.generateToken(user);
    return new LoginResponse(token, "Bearer", jwtService.getExpiresInSeconds());
  }

  private UserResponse toUserResponse(User user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getRole().name(),
        user.getCreatedAt());
  }
}
