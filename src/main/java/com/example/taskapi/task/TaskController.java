package com.example.taskapi.task;

import com.example.taskapi.task.dto.TaskCreateRequest;
import com.example.taskapi.task.dto.TaskResponse;
import com.example.taskapi.task.dto.TaskStatusUpdateRequest;
import com.example.taskapi.task.dto.TaskUpdateRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * タスクの REST エンドポイント。
 *
 * <p>LEARN: Sprint 1 の一覧はページング無しの単純な配列。{@code ?status=&categoryId=&page=} などの 絞り込み・ページングは Sprint 3
 * で {@code Page<TaskResponse>} に置き換える。
 */
@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

  private final TaskService service;

  TaskController(TaskService service) {
    this.service = service;
  }

  @GetMapping
  public List<TaskResponse> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public TaskResponse get(@PathVariable Long id) {
    return service.get(id);
  }

  @PostMapping
  public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskCreateRequest req) {
    TaskResponse created = service.create(req);
    return ResponseEntity.created(URI.create("/api/v1/tasks/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  public TaskResponse update(@PathVariable Long id, @Valid @RequestBody TaskUpdateRequest req) {
    return service.update(id, req);
  }

  @PatchMapping("/{id}/status")
  public TaskResponse changeStatus(
      @PathVariable Long id, @Valid @RequestBody TaskStatusUpdateRequest req) {
    return service.changeStatus(id, req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
