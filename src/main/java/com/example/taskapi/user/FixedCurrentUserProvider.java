package com.example.taskapi.user;

import org.springframework.stereotype.Component;

/**
 * Sprint 1 用の暫定実装。seed で作られた開発ユーザーを常に「現在のユーザー」として返す。
 *
 * <p>LEARN: 認証を後回しにしても、所有者ベースの絞り込み(自分の Category / Task しか触れない)は 今のうちから Service に書いておける。Sprint 2
 * ではこの Bean を SecurityContext ベースの実装に 置き換えるだけで、Service / Controller は無変更で済む。
 */
@Component
public class FixedCurrentUserProvider implements CurrentUserProvider {

  static final String DEV_USER_EMAIL = "dev@example.com";

  private final UserRepository users;

  FixedCurrentUserProvider(UserRepository users) {
    this.users = users;
  }

  @Override
  public User currentUser() {
    return users
        .findByEmail(DEV_USER_EMAIL)
        .orElseThrow(
            () ->
                new IllegalStateException(
                    "開発ユーザー("
                        + DEV_USER_EMAIL
                        + ")が見つかりません。local プロファイルで起動して seed(R__seed_dev_data.sql)を"
                        + "流してください。"));
  }
}
