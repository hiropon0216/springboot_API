package com.example.taskapi.user;

import com.example.taskapi.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 認証用のユーザー。Sprint 1 では seed で1件だけ作られ、登録 API は Sprint 2 で追加する。
 *
 * <p>LEARN: {@code GenerationType.IDENTITY} は PostgreSQL の {@code generated as identity} 列に対応。 DB
 * が採番するので、INSERT するまで id は null。
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String password;

  @Column(name = "display_name", nullable = false, length = 100)
  private String displayName;

  // LEARN: enum は序数(0,1..)でなく名前で保存する。列の並び替えや値の追加で壊れない。
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private Role role = Role.USER;
}
