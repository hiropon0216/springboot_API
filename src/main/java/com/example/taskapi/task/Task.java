package com.example.taskapi.task;

import com.example.taskapi.category.Category;
import com.example.taskapi.common.audit.AuditableEntity;
import com.example.taskapi.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * タスク。所有者(必須)と分類カテゴリ(任意)を持つ。
 *
 * <p>LEARN: 状態遷移に伴う {@code completedAt} の管理はドメインのルールなので、setter を直に叩かせず {@link
 * #applyStatus(TaskStatus)} に閉じ込める。こうすると「DONE にしたら完了時刻が入る」を 1箇所でテストできる。
 */
@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
public class Task extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 2000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TaskStatus status = TaskStatus.TODO;

  @Enumerated(EnumType.STRING)
  @Column(length = 10)
  private TaskPriority priority;

  @Column(name = "due_date")
  private LocalDate dueDate;

  // LEARN: カテゴリ削除時はタスクを消さず FK を NULL 化する。@OnDelete で Hibernate 生成の
  // スキーマ(H2 スモーク)にも "on delete set null" が入り、Flyway 側の DDL と挙動が揃う。
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "category_id")
  @OnDelete(action = OnDeleteAction.SET_NULL)
  private Category category;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", nullable = false)
  private User owner;

  @Column(name = "completed_at")
  private Instant completedAt;

  /**
   * ステータスを変更し、完了時刻を整合させる。
   *
   * <ul>
   *   <li>DONE に変わったら completedAt を現在時刻に
   *   <li>DONE から他へ戻ったら completedAt を null に
   * </ul>
   */
  public void applyStatus(TaskStatus newStatus) {
    if (newStatus == TaskStatus.DONE && this.status != TaskStatus.DONE) {
      this.completedAt = Instant.now();
    } else if (newStatus != TaskStatus.DONE && this.status == TaskStatus.DONE) {
      this.completedAt = null;
    }
    this.status = newStatus;
  }
}
