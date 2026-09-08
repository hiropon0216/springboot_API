package com.example.taskapi.task;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.taskapi.category.Category;
import com.example.taskapi.category.CategoryRepository;
import com.example.taskapi.support.AbstractPostgresDataJpaTest;
import com.example.taskapi.user.Role;
import com.example.taskapi.user.User;
import com.example.taskapi.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

/**
 * 「カテゴリを削除してもタスクは消えず、tasks.category_id が NULL になる」を実 PostgreSQL で確認する。
 *
 * <p>LEARN: これは DB の外部キー制約 {@code on delete set null} の挙動。アプリ側で tasks を触らない (= CategoryService が
 * TaskRepository に依存しない = feature 間の循環が生まれない)ための設計判断。
 *
 * <p>ポイント: 削除の前に {@code em.clear()} で永続化コンテキストを空にする。そうしないと Hibernate が 「削除済みカテゴリを参照するタスク」を検知して
 * flush を拒否する ({@code TransientPropertyValueException})。DB に任せたい処理は、まず Hibernate に忘れさせる。
 */
class TaskCategoryLinkTest extends AbstractPostgresDataJpaTest {

  @Autowired UserRepository users;
  @Autowired CategoryRepository categories;
  @Autowired TaskRepository tasks;
  @Autowired TestEntityManager em;

  @Test
  void カテゴリ削除でタスクのカテゴリはnullになりタスクは残る() {
    User owner = new User();
    owner.setEmail("o@example.com");
    owner.setPassword("x");
    owner.setDisplayName("o");
    owner.setRole(Role.USER);
    owner = users.save(owner);

    Category cat = new Category();
    cat.setName("消す予定");
    cat.setOwner(owner);
    cat = categories.saveAndFlush(cat);
    Long catId = cat.getId();

    Task task = new Task();
    task.setTitle("残るタスク");
    task.setOwner(owner);
    task.setCategory(cat);
    task = tasks.saveAndFlush(task);
    Long taskId = task.getId();

    // Hibernate に task→cat の関連を忘れさせてから削除する。
    em.flush();
    em.clear();

    categories.deleteById(catId);
    em.flush();
    em.clear();

    Task reloaded = tasks.findById(taskId).orElseThrow(() -> new AssertionError("タスクが消えてしまった"));
    assertThat(reloaded.getCategory()).isNull();
  }
}
