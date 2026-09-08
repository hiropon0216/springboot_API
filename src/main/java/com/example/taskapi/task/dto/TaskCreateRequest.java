package com.example.taskapi.task.dto;

import com.example.taskapi.task.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * タスク作成の入力。
 *
 * <p>LEARN: {@code status} は受け取らない。新規タスクは必ず TODO 始まりというルールを DTO の形で表す。 {@code categoryId}
 * は任意で、指定時に「それが自分のカテゴリか」を Service が検証する。
 */
public record TaskCreateRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 2000) String description,
    TaskPriority priority,
    LocalDate dueDate,
    Long categoryId) {}
