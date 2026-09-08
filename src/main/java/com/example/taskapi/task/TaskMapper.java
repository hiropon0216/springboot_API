package com.example.taskapi.task;

import com.example.taskapi.category.Category;
import com.example.taskapi.task.dto.TaskCreateRequest;
import com.example.taskapi.task.dto.TaskResponse;
import com.example.taskapi.task.dto.TaskResponse.CategorySummary;
import com.example.taskapi.task.dto.TaskUpdateRequest;
import com.example.taskapi.user.User;
import org.springframework.stereotype.Component;

/**
 * DTO ↔ Task の変換。
 *
 * <p>LEARN: {@code category} は解決済みの {@link Category}(または null)を受け取るだけ。「その categoryId が
 * 自分のものか」という判断は Service の責務なので、ここには持ち込まない。
 */
@Component
public class TaskMapper {

  Task toEntity(TaskCreateRequest req, User owner, Category category) {
    Task t = new Task();
    t.setTitle(req.title());
    t.setDescription(req.description());
    t.setPriority(req.priority());
    t.setDueDate(req.dueDate());
    t.setCategory(category);
    t.setOwner(owner);
    // status は entity 側の初期値(TODO)のまま
    return t;
  }

  void applyUpdate(Task task, TaskUpdateRequest req, Category category) {
    task.setTitle(req.title());
    task.setDescription(req.description());
    task.setPriority(req.priority());
    task.setDueDate(req.dueDate());
    task.setCategory(category);
  }

  TaskResponse toResponse(Task t) {
    Category c = t.getCategory();
    CategorySummary summary = (c == null) ? null : new CategorySummary(c.getId(), c.getName());
    return new TaskResponse(
        t.getId(),
        t.getTitle(),
        t.getDescription(),
        t.getStatus(),
        t.getPriority(),
        t.getDueDate(),
        summary,
        t.getCreatedAt(),
        t.getUpdatedAt(),
        t.getCompletedAt());
  }
}
