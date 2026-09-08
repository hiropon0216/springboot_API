package com.example.taskapi.category;

import com.example.taskapi.category.dto.CategoryCreateRequest;
import com.example.taskapi.category.dto.CategoryResponse;
import com.example.taskapi.category.dto.CategoryUpdateRequest;
import com.example.taskapi.user.User;
import org.springframework.stereotype.Component;

/**
 * DTO ↔ エンティティの変換。
 *
 * <p>LEARN: Sprint 1 は手書きで変換の存在意義を体で理解する。項目が増えたら退屈になるので、 Sprint 3 で
 * MapStruct(コード生成)と比較する。変換をここに閉じ込めておけば差し替えも簡単。
 */
@Component
public class CategoryMapper {

  Category toEntity(CategoryCreateRequest req, User owner) {
    Category c = new Category();
    c.setName(req.name());
    c.setColor(req.color());
    c.setOwner(owner);
    return c;
  }

  void applyUpdate(Category entity, CategoryUpdateRequest req) {
    entity.setName(req.name());
    entity.setColor(req.color());
  }

  CategoryResponse toResponse(Category c) {
    return new CategoryResponse(
        c.getId(), c.getName(), c.getColor(), c.getCreatedAt(), c.getUpdatedAt());
  }
}
