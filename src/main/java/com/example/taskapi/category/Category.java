package com.example.taskapi.category;

import com.example.taskapi.common.audit.AuditableEntity;
import com.example.taskapi.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * タスクの分類。ユーザーごとに持ち、同一ユーザー内で名前は一意。
 *
 * <p>LEARN: {@code @ManyToOne(fetch = LAZY)} にすると owner は必要になるまで読み込まれない。 {@code open-in-view=false}
 * なので、owner にアクセスするコードは必ずトランザクション内(Service 層)で動かす。
 */
@Entity
@Table(
    name = "categories",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_categories_owner_name",
            columnNames = {"owner_id", "name"}))
@Getter
@Setter
@NoArgsConstructor
public class Category extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 50)
  private String name;

  /** {@code #RRGGBB} 形式。任意。 */
  @Column(length = 7)
  private String color;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", nullable = false)
  private User owner;
}
