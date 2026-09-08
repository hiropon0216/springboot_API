package com.example.taskapi.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.taskapi.support.AbstractPostgresDataJpaTest;
import com.example.taskapi.user.Role;
import com.example.taskapi.user.User;
import com.example.taskapi.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * CategoryRepository の実 DB(Testcontainers PostgreSQL)に対する挙動確認。
 *
 * <p>LEARN: {@code @DataJpaTest} は Repository と JPA 周りだけをロードする軽いスライス。 {@code
 * FixedCurrentUserProvider} などの {@code @Component} はスキャンされないので、依存の準備は要らない。
 */
class CategoryRepositoryTest extends AbstractPostgresDataJpaTest {

  @Autowired UserRepository users;
  @Autowired CategoryRepository categories;

  private User newUser(String email) {
    User u = new User();
    u.setEmail(email);
    u.setPassword("x");
    u.setDisplayName("u");
    u.setRole(Role.USER);
    return users.save(u);
  }

  @Test
  void 所有者のカテゴリだけを名前順で返す() {
    User me = newUser("me@example.com");
    User other = newUser("other@example.com");
    categories.save(category("仕事", me));
    categories.save(category("あそび", me));
    categories.save(category("他人のもの", other));

    var result = categories.findByOwnerIdOrderByNameAsc(me.getId());

    assertThat(result).extracting(Category::getName).containsExactly("あそび", "仕事");
  }

  @Test
  void findByIdAndOwnerIdは他人のものを返さない() {
    User me = newUser("me@example.com");
    User other = newUser("other@example.com");
    Category mine = categories.save(category("mine", me));

    assertThat(categories.findByIdAndOwnerId(mine.getId(), me.getId())).isPresent();
    assertThat(categories.findByIdAndOwnerId(mine.getId(), other.getId())).isEmpty();
  }

  @Test
  void 同一ユーザーで同名カテゴリは複合ユニーク制約で弾かれる() {
    User me = newUser("me@example.com");
    categories.saveAndFlush(category("重複", me));

    assertThatThrownBy(() -> categories.saveAndFlush(category("重複", me)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void 監査カラムが自動で入る() {
    User me = newUser("me@example.com");
    Category saved = categories.saveAndFlush(category("監査", me));

    assertThat(saved.getCreatedAt()).isNotNull();
    assertThat(saved.getUpdatedAt()).isNotNull();
  }

  private static Category category(String name, User owner) {
    Category c = new Category();
    c.setName(name);
    c.setOwner(owner);
    return c;
  }
}
