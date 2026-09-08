package com.example.taskapi.category;

import com.example.taskapi.category.dto.CategoryCreateRequest;
import com.example.taskapi.category.dto.CategoryResponse;
import com.example.taskapi.category.dto.CategoryUpdateRequest;
import com.example.taskapi.common.exception.DuplicateResourceException;
import com.example.taskapi.common.exception.ResourceNotFoundException;
import com.example.taskapi.user.CurrentUserProvider;
import com.example.taskapi.user.User;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * カテゴリのユースケース。
 *
 * <p>LEARN: クラスに {@code @Transactional(readOnly = true)} を付け、書き込むメソッドだけ上書きする。 読み取りは readOnly にすると
 * Hibernate がフラッシュを省くなど最適化が効く。トランザクション境界は この Service メソッド = 1ユースケース。
 */
@Service
@Transactional(readOnly = true)
public class CategoryService {

  private final CategoryRepository categories;
  private final CategoryMapper mapper;
  private final CurrentUserProvider currentUser;

  CategoryService(
      CategoryRepository categories, CategoryMapper mapper, CurrentUserProvider currentUser) {
    this.categories = categories;
    this.mapper = mapper;
    this.currentUser = currentUser;
  }

  public List<CategoryResponse> list() {
    return categories.findByOwnerIdOrderByNameAsc(currentUser.currentUserId()).stream()
        .map(mapper::toResponse)
        .toList();
  }

  public CategoryResponse get(Long id) {
    return mapper.toResponse(findOwned(id));
  }

  @Transactional
  public CategoryResponse create(CategoryCreateRequest req) {
    User owner = currentUser.currentUser();
    if (categories.existsByOwnerIdAndName(owner.getId(), req.name())) {
      throw new DuplicateResourceException("カテゴリ名『%s』は既に存在します".formatted(req.name()));
    }
    Category saved = categories.save(mapper.toEntity(req, owner));
    return mapper.toResponse(saved);
  }

  @Transactional
  public CategoryResponse update(Long id, CategoryUpdateRequest req) {
    Category category = findOwned(id);
    // LEARN: 自分自身は除外して重複判定する(名前を変えないままの更新を弾かない)。
    if (categories.existsByOwnerIdAndNameAndIdNot(
        currentUser.currentUserId(), req.name(), category.getId())) {
      throw new DuplicateResourceException("カテゴリ名『%s』は既に存在します".formatted(req.name()));
    }
    mapper.applyUpdate(category, req);
    return mapper.toResponse(category);
  }

  @Transactional
  public void delete(Long id) {
    Category category = findOwned(id);
    // LEARN: 紐づく Task は消さない。tasks.category_id は DB の "on delete set null" で自動的に
    // NULL になる(CategoryService が TaskRepository に依存しないので、feature 間の循環依存も生まれない)。
    categories.delete(category);
  }

  private Category findOwned(Long id) {
    return categories
        .findByIdAndOwnerId(id, currentUser.currentUserId())
        .orElseThrow(() -> new ResourceNotFoundException("Category", id));
  }
}
