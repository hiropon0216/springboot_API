package com.example.taskapi.category;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * LEARN: すべてのメソッドが owner_id で絞られている。「自分のカテゴリしか触れない」を Repository の入口で強制することで、Service で owner
 * チェックを書き忘れても他人のデータに届かない。
 */
public interface CategoryRepository extends JpaRepository<Category, Long> {

  List<Category> findByOwnerIdOrderByNameAsc(Long ownerId);

  Optional<Category> findByIdAndOwnerId(Long id, Long ownerId);

  boolean existsByOwnerIdAndName(Long ownerId, String name);

  boolean existsByOwnerIdAndNameAndIdNot(Long ownerId, String name, Long id);
}
