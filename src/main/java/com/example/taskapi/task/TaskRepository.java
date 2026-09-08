package com.example.taskapi.task;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** LEARN: Category と同じく owner_id で必ず絞る。Sprint 3 でここに Specification / ページングを足す。 */
public interface TaskRepository extends JpaRepository<Task, Long> {

  List<Task> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

  Optional<Task> findByIdAndOwnerId(Long id, Long ownerId);
}
