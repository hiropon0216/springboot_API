package com.example.taskapi.task;

import com.example.taskapi.category.Category;
import com.example.taskapi.category.CategoryRepository;
import com.example.taskapi.common.PageResponse;
import com.example.taskapi.common.exception.BusinessRuleException;
import com.example.taskapi.common.exception.ResourceNotFoundException;
import com.example.taskapi.task.dto.TaskCreateRequest;
import com.example.taskapi.task.dto.TaskResponse;
import com.example.taskapi.task.dto.TaskStatusUpdateRequest;
import com.example.taskapi.task.dto.TaskUpdateRequest;
import com.example.taskapi.user.CurrentUserProvider;
import com.example.taskapi.user.User;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** タスクのユースケース。 */
@Service
@Transactional(readOnly = true)
public class TaskService {

  private final TaskRepository tasks;
  private final CategoryRepository categories;
  private final TaskMapper mapper;
  private final CurrentUserProvider currentUser;

  TaskService(
      TaskRepository tasks,
      CategoryRepository categories,
      TaskMapper mapper,
      CurrentUserProvider currentUser) {
    this.tasks = tasks;
    this.categories = categories;
    this.mapper = mapper;
    this.currentUser = currentUser;
  }

  /**
   * タスク一覧をページング・絞り込みして返す。
   *
   * <p>LEARN: {@link Pageable} は {@code page} / {@code size} / {@code sort} をカプセル化する。 コントローラの
   * {@code @PageableDefault} で既定値を決め、クエリパラメータ {@code ?page=0&size=20&sort=createdAt,desc}
   * で上書きできる。Spring MVC が自動で Pageable に変換する。
   *
   * <p>LEARN: Specification は {@code and()} でチェーンする。各条件が null のとき {@code conjunction()}
   * (TRUE)を返すので、指定なし=全件という自然な振る舞いになる。
   */
  public PageResponse<TaskResponse> list(
      TaskStatus status, Long categoryId, LocalDate dueBefore, Pageable pageable) {
    Long ownerId = currentUser.currentUserId();

    // LEARN: Specification を and() で組み合わせる。条件が null なら TaskSpecifications 内で
    // cb.conjunction() を返すため、その条件は SQL に現れない(WHERE 句が動的になる)。
    Specification<Task> spec =
        TaskSpecifications.ownedBy(ownerId)
            .and(TaskSpecifications.hasStatus(status))
            .and(TaskSpecifications.inCategory(categoryId))
            .and(TaskSpecifications.dueBefore(dueBefore));

    // LEARN: findAll(Specification, Pageable) は JpaSpecificationExecutor のメソッド。
    // 戻り値の Page<Task> を Page<TaskResponse> に変換してから PageResponse でラップする。
    Page<TaskResponse> page = tasks.findAll(spec, pageable).map(mapper::toResponse);
    return PageResponse.from(page);
  }

  public TaskResponse get(Long id) {
    return mapper.toResponse(findOwned(id));
  }

  @Transactional
  public TaskResponse create(TaskCreateRequest req) {
    User owner = currentUser.currentUser();
    Category category = resolveCategory(req.categoryId());
    Task saved = tasks.save(mapper.toEntity(req, owner, category));
    return mapper.toResponse(saved);
  }

  @Transactional
  public TaskResponse update(Long id, TaskUpdateRequest req) {
    Task task = findOwned(id);
    Category category = resolveCategory(req.categoryId());
    mapper.applyUpdate(task, req, category);
    return mapper.toResponse(task);
  }

  @Transactional
  public TaskResponse changeStatus(Long id, TaskStatusUpdateRequest req) {
    Task task = findOwned(id);
    // LEARN: 完了時刻の副作用は entity の applyStatus に閉じ込めてある。
    task.applyStatus(req.status());
    return mapper.toResponse(task);
  }

  @Transactional
  public void delete(Long id) {
    tasks.delete(findOwned(id));
  }

  private Task findOwned(Long id) {
    return tasks
        .findByIdAndOwnerId(id, currentUser.currentUserId())
        .orElseThrow(() -> new ResourceNotFoundException("Task", id));
  }

  /**
   * categoryId(任意)を、現在ユーザーが所有する {@link Category} に解決する。
   *
   * <p>LEARN: 他人のカテゴリや存在しないカテゴリを指定したら 422(業務ルール違反)。形式は正しいが 業務上できない操作、という位置づけ。
   */
  private Category resolveCategory(Long categoryId) {
    if (categoryId == null) {
      return null;
    }
    return categories
        .findByIdAndOwnerId(categoryId, currentUser.currentUserId())
        .orElseThrow(
            () ->
                new BusinessRuleException("カテゴリ(id=%s)が存在しないか、自分のものではありません".formatted(categoryId)));
  }
}
