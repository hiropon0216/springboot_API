package com.example.taskapi.category;

import com.example.taskapi.category.dto.CategoryCreateRequest;
import com.example.taskapi.category.dto.CategoryResponse;
import com.example.taskapi.category.dto.CategoryUpdateRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * カテゴリの REST エンドポイント。
 *
 * <p>LEARN: Controller の仕事は「HTTP ↔ DTO の変換」と「ステータスコードの決定」だけ。業務判断は Service に置く。{@code @Valid}
 * を付けると、本文のバリデーション違反は Service に届く前に 400 になる。
 */
@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

  private final CategoryService service;

  CategoryController(CategoryService service) {
    this.service = service;
  }

  @GetMapping
  public List<CategoryResponse> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public CategoryResponse get(@PathVariable Long id) {
    return service.get(id);
  }

  @PostMapping
  public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryCreateRequest req) {
    CategoryResponse created = service.create(req);
    // LEARN: 作成は 201 Created + Location ヘッダに新リソースの URI を返すのが REST の作法。
    return ResponseEntity.created(URI.create("/api/v1/categories/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  public CategoryResponse update(
      @PathVariable Long id, @Valid @RequestBody CategoryUpdateRequest req) {
    return service.update(id, req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
