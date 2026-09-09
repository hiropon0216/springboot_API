package com.example.taskapi.task;

import com.example.taskapi.common.PageResponse;
import com.example.taskapi.task.dto.TaskCreateRequest;
import com.example.taskapi.task.dto.TaskResponse;
import com.example.taskapi.task.dto.TaskStatusUpdateRequest;
import com.example.taskapi.task.dto.TaskUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * タスクの REST エンドポイント。
 *
 * <p>LEARN: Sprint 3 から一覧は {@link PageResponse} を返す。{@code @PageableDefault} で既定ページサイズ・
 * ソート順を決め、クエリパラメータ {@code ?page=0&size=20&sort=createdAt,desc} で上書きできる。 Spring MVC の {@code
 * HandlerMethodArgumentResolver} が自動で {@code Pageable} に変換する。
 */
@RestController
@RequestMapping("/api/v1/tasks")
@Tag(name = "Task", description = "タスクの CRUD とステータス管理")
public class TaskController {

  private final TaskService service;

  TaskController(TaskService service) {
    this.service = service;
  }

  /**
   * タスク一覧取得(ページング・絞り込み対応)。
   *
   * <p>LEARN: {@code @RequestParam(required = false)} で任意パラメータを受け取る。 Spring MVC は enum 型を自動変換する。不正な
   * enum 文字列は {@code MethodArgumentTypeMismatchException} → GlobalExceptionHandler で 400 になる。
   *
   * <p>LEARN: {@code @PageableDefault} はパラメータ未指定時の既定値。 クライアントが {@code ?size=5&sort=dueDate,asc}
   * を渡せば上書きされる。
   */
  @GetMapping
  @Operation(summary = "タスク一覧", description = "ページング・ソート・絞り込みに対応")
  @ApiResponse(responseCode = "200", description = "ページ結果を返す")
  public ResponseEntity<PageResponse<TaskResponse>> list(
      @RequestParam(required = false) TaskStatus status,
      @RequestParam(required = false) Long categoryId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate dueBefore,
      @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
          org.springframework.data.domain.Pageable pageable) {
    return ResponseEntity.ok(service.list(status, categoryId, dueBefore, pageable));
  }

  @GetMapping("/{id}")
  @Operation(summary = "タスク単一取得")
  @ApiResponse(responseCode = "200", description = "タスクを返す")
  @ApiResponse(responseCode = "404", description = "タスクが見つからない")
  public TaskResponse get(@PathVariable Long id) {
    return service.get(id);
  }

  @PostMapping
  @Operation(summary = "タスク作成")
  @ApiResponse(responseCode = "201", description = "作成されたタスクを返す")
  @ApiResponse(responseCode = "400", description = "バリデーション違反")
  public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskCreateRequest req) {
    TaskResponse created = service.create(req);
    return ResponseEntity.created(URI.create("/api/v1/tasks/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  @Operation(summary = "タスク更新")
  public TaskResponse update(@PathVariable Long id, @Valid @RequestBody TaskUpdateRequest req) {
    return service.update(id, req);
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "ステータス変更", description = "DONE にすると completedAt が記録される")
  public TaskResponse changeStatus(
      @PathVariable Long id, @Valid @RequestBody TaskStatusUpdateRequest req) {
    return service.changeStatus(id, req);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "タスク削除")
  @ApiResponse(responseCode = "204", description = "削除成功")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
