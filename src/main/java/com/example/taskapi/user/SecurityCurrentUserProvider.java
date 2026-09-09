package com.example.taskapi.user;

import com.example.taskapi.common.exception.ResourceNotFoundException;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * JWT トークンから現在ユーザーを解決する実装。
 *
 * <p>LEARN: {@code @Primary} を付けることで、同じインターフェースの Bean が複数ある場合に この Bean が優先して注入される。{@link
 * FixedCurrentUserProvider} は残しておくが、 通常の起動では本クラスが使われる。
 *
 * <p>LEARN: JWT の subject(sub クレーム)に userId(Long の文字列)を入れているので、 {@code Authentication#getName()}
 * で取れる。Spring Security の oauth2ResourceServer が リクエストごとにトークンを検証し、SecurityContext に Authentication
 * をセットする。
 */
@Component
@Primary
public class SecurityCurrentUserProvider implements CurrentUserProvider {

  private final UserRepository users;

  public SecurityCurrentUserProvider(UserRepository users) {
    this.users = users;
  }

  @Override
  public User currentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();

    if (auth == null || !auth.isAuthenticated()) {
      throw new IllegalStateException("SecurityContext に認証情報がありません。JWT トークンが付与されているか確認してください。");
    }

    // LEARN: JWT の sub クレーム = userId(Long の文字列)。getName() で取得できる。
    String subject = auth.getName();
    Long userId;
    try {
      userId = Long.parseLong(subject);
    } catch (NumberFormatException e) {
      throw new IllegalStateException("JWT の subject がユーザーID の形式ではありません: " + subject, e);
    }

    return users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
  }
}
