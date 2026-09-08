package com.example.taskapi.common.audit;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 監査カラム({@code created_at} / {@code updated_at})を持つエンティティの共通の親。
 *
 * <p>LEARN: {@code @MappedSuperclass} はテーブルにならず、継承先にカラム定義だけを配る。 {@code AuditingEntityListener} と
 * {@code @EnableJpaAuditing}(JpaAuditingConfig)が組み合わさって、 永続化・更新のたびに時刻を自動でセットする。手で now() を書かなくてよい。
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
public abstract class AuditableEntity {

  @CreatedDate
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @LastModifiedDate
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
