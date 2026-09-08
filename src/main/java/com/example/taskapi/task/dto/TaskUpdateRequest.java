package com.example.taskapi.task.dto;

import com.example.taskapi.task.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * タスク更新の入力(内容の置き換え)。
 *
 * <p>LEARN: ステータス変更はここに含めず {@code PATCH /tasks/{id}/status} に分ける。更新の関心
 * (タイトルや期限)と、状態遷移(完了時刻の副作用がある)を混ぜない。
 */
public record TaskUpdateRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 2000) String description,
    TaskPriority priority,
    LocalDate dueDate,
    Long categoryId) {}
