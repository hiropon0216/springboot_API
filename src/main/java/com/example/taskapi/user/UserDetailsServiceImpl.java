package com.example.taskapi.user;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spring Security の認証フローが email でユーザーを検索するための実装。
 *
 * <p>LEARN: Spring Security は DaoAuthenticationProvider を通じて UserDetailsService を呼ぶ。
 * loadUserByUsername の引数は「ユーザー名」だが、今回は email を識別子として使う。
 *
 * <p>LEARN: User エンティティに UserDetails を直接実装させることもできるが、 Spring
 * のクラスに依存させるとドメイン層が汚染される。ここでは変換専用クラスを作る分離を選択した。
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

  private final UserRepository users;

  public UserDetailsServiceImpl(UserRepository users) {
    this.users = users;
  }

  @Override
  @Transactional(readOnly = true)
  public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
    User user =
        users
            .findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません: " + email));

    // LEARN: Spring Security の User ビルダーで UserDetails を組み立てる。
    // ROLE_ プレフィックスは hasRole("USER") で自動付与される慣習。
    return org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
        .password(user.getPassword())
        .authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        .build();
  }
}
