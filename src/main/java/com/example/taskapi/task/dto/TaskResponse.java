package com.example.taskapi.task.dto;

import com.example.taskapi.task.TaskPriority;
import com.example.taskapi.task.TaskStatus;
import java.time.Instant;
import java.time.LocalDate;

/**
 * タスクのレスポンス。カテゴリは id と name だけの要約を埋め込む(未分類なら null)。
 *
 * <p>LEARN: ネストした {@link CategorySummary} を task 側の DTO に置くことで、レスポンスの形を task feature
 * が完全に決められる。category feature の内部表現に引きずられない。
 */
public record TaskResponse(
    Long id,
    String title,
    String description,
    TaskStatus status,
    TaskPriority priority,
    LocalDate dueDate,
    CategorySummary category,
    Instant createdAt,
    Instant updatedAt,
    Instant completedAt) {

  public record CategorySummary(Long id, String name) {}
}
