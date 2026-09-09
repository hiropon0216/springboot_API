package com.example.taskapi.task;

import java.time.LocalDate;
import org.springframework.data.jpa.domain.Specification;

/**
 * タスク一覧の絞り込み条件を組み立てるファクトリクラス。
 *
 * <p>LEARN: Specification パターンとは? JPA Criteria API をラップして「絞り込み条件を Predicate として表す」設計パターン。
 * 各メソッドが「1つの条件」を返し、{@code and()} / {@code or()} で組み合わせる。 動的クエリ(条件が null なら無視)を型安全に書ける。
 *
 * <p>LEARN: {@code (root, query, cb)} の3引数は JPA Criteria API の基本:
 *
 * <ul>
 *   <li>{@code root}: FROM 句のエンティティ。フィールドへのパスを表す。
 *   <li>{@code query}: SELECT 全体の構造を操作できる(通常は使わない)。
 *   <li>{@code cb}: CriteriaBuilder。Predicate を組み立てるファクトリ。
 * </ul>
 *
 * <p>LEARN: ユーティリティクラス(全員 static)はコンストラクタを private にする。 インスタンス化する意味がないことを明示する。
 */
final class TaskSpecifications {

  private TaskSpecifications() {
    // ユーティリティクラス: インスタンス化禁止
  }

  /** owner_id = ownerId の条件。常に付与する(他人のタスクを返さないため)。 */
  static Specification<Task> ownedBy(Long ownerId) {
    return (root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId);
  }

  /**
   * status でフィルタ。null を渡すと条件なし(全ステータス)。
   *
   * <p>LEARN: {@code status == null} のとき {@code cb.conjunction()} は SQL の {@code TRUE} に相当し、
   * フィルタとして機能しない。これで「条件を動的に省略する」実装が1行で書ける。
   */
  static Specification<Task> hasStatus(TaskStatus status) {
    return (root, query, cb) ->
        status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
  }

  /** category_id でフィルタ。null なら条件なし。 */
  static Specification<Task> inCategory(Long categoryId) {
    return (root, query, cb) ->
        categoryId == null
            ? cb.conjunction()
            : cb.equal(root.get("category").get("id"), categoryId);
  }

  /**
   * due_date &lt; dueBefore でフィルタ。null なら条件なし。
   *
   * <p>LEARN: {@code lessThanOrEqualTo} と {@code lessThan} の違いに注意。仕様では {@code dueBefore}
   * なので「その日より前」を意味する {@code lessThan} を使う。
   */
  static Specification<Task> dueBefore(LocalDate dueBefore) {
    return (root, query, cb) ->
        dueBefore == null ? cb.conjunction() : cb.lessThan(root.get("dueDate"), dueBefore);
  }
}
