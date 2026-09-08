package com.example.taskapi.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

  // LEARN: メソッド名から Spring Data がクエリを生成する(select ... where email = ?)。
  Optional<User> findByEmail(String email);

  boolean existsByEmail(String email);
}
