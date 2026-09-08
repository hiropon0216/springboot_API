package com.example.taskapi.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.taskapi.category.dto.CategoryCreateRequest;
import com.example.taskapi.category.dto.CategoryUpdateRequest;
import com.example.taskapi.common.exception.DuplicateResourceException;
import com.example.taskapi.common.exception.ResourceNotFoundException;
import com.example.taskapi.user.CurrentUserProvider;
import com.example.taskapi.user.User;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * CategoryService の分岐(重複・not found)を、DB を使わず Mockito で確認する。
 *
 * <p>LEARN: Service の単体テストは「依存(Repository / CurrentUserProvider)をモックし、業務ロジックだけ」を見る。 DB の挙動は
 * Repository テスト、HTTP の挙動は Controller テストが担当。役割を分ける。
 */
@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

  @Mock CategoryRepository categories;
  @Mock CurrentUserProvider currentUser;

  // 手書きマッパーは本物を使う(依存が無いので)
  private final CategoryMapper mapper = new CategoryMapper();

  private CategoryService service;

  private final User me = new User();

  @BeforeEach
  void setUp() {
    me.setEmail("me@example.com");
    service = new CategoryService(categories, mapper, currentUser);
  }

  @Test
  void 同名カテゴリが既にあると作成は409相当の例外() {
    when(currentUser.currentUser()).thenReturn(me);
    when(categories.existsByOwnerIdAndName(any(), eq("仕事"))).thenReturn(true);

    assertThatThrownBy(() -> service.create(new CategoryCreateRequest("仕事", null)))
        .isInstanceOf(DuplicateResourceException.class);
  }

  @Test
  void 存在しないIDのgetはResourceNotFoundException() {
    when(currentUser.currentUserId()).thenReturn(1L);
    when(categories.findByIdAndOwnerId(99L, 1L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(99L)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void 更新は自分自身を除外して重複判定する() {
    Category existing = new Category();
    existing.setId(5L);
    existing.setName("旧名");
    existing.setOwner(me);
    when(currentUser.currentUserId()).thenReturn(1L);
    when(categories.findByIdAndOwnerId(5L, 1L)).thenReturn(Optional.of(existing));
    when(categories.existsByOwnerIdAndNameAndIdNot(1L, "新名", 5L)).thenReturn(false);

    var res = service.update(5L, new CategoryUpdateRequest("新名", "#FFFFFF"));

    assertThat(res.name()).isEqualTo("新名");
    assertThat(res.color()).isEqualTo("#FFFFFF");
  }

  @Test
  void deleteは所有チェックの上でrepositoryのdeleteを呼ぶ() {
    Category existing = new Category();
    existing.setId(7L);
    existing.setOwner(me);
    when(currentUser.currentUserId()).thenReturn(1L);
    when(categories.findByIdAndOwnerId(7L, 1L)).thenReturn(Optional.of(existing));

    service.delete(7L);

    verify(categories).delete(existing);
  }
}
