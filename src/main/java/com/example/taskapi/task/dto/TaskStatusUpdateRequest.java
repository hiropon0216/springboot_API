package com.example.taskapi.task.dto;

import com.example.taskapi.task.TaskStatus;
import jakarta.validation.constraints.NotNull;

/** {@code PATCH /tasks/{id}/status} の入力。 */
public record TaskStatusUpdateRequest(@NotNull TaskStatus status) {}
