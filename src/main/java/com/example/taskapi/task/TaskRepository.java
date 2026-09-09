package com.example.taskapi.task;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * タスクのリポジトリ。
 *
 * <p>LEARN: {@link JpaSpecificationExecutor} を extends に追加することで、 {@code findAll(Specification,
 * Pageable)} が使えるようになる。 Specification は「絞り込み条件を Predicate として組み立てる」パターン。
 *
 * <p>LEARN: クエリメソッド vs Specification の比較:
 *
 * <ul>
 *   <li>クエリメソッド(findByOwnerIdAndStatus 等): 条件の組み合わせが少ない場合は読みやすい。 条件が増えると {@code
 *       findByOwnerIdAndStatusAndCategoryIdAndDueDateBefore} のような 長い名前になり、null 可の組み合わせを扱いにくい。
 *   <li>Specification: 条件を動的に組み立てられる(条件が null なら無視、など)。 コードが分散するが、複雑なクエリを柔軟に表現できる。
 * </ul>
 */
public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

  Optional<Task> findByIdAndOwnerId(Long id, Long ownerId);
}
