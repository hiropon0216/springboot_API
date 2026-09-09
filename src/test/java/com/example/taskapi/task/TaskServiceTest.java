package com.example.taskapi.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.example.taskapi.category.Category;
import com.example.taskapi.category.CategoryRepository;
import com.example.taskapi.common.exception.BusinessRuleException;
import com.example.taskapi.common.exception.ResourceNotFoundException;
import com.example.taskapi.task.dto.TaskCreateRequest;
import com.example.taskapi.task.dto.TaskResponse;
import com.example.taskapi.task.dto.TaskStatusUpdateRequest;
import com.example.taskapi.user.CurrentUserProvider;
import com.example.taskapi.user.User;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * TaskService の分岐: カテゴリ解決・not found・ステータス変更の副作用。
 *
 * <p>LEARN: Sprint 3 で TaskMapper が MapStruct インターフェースになったため、 {@code new TaskMapper()} でのインスタンス化が
 * できなくなった。代わりに {@code @Mock} を使ってモックを注入する。 MapStruct が生成した {@code TaskMapperImpl} は Spring
 * コンテキスト内でしか 使えないため、スライスなしの単体テストでは Mockito のモックが適切。
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

  @Mock TaskRepository tasks;
  @Mock CategoryRepository categories;
  @Mock CurrentUserProvider currentUser;
  // LEARN: TaskMapper は MapStruct インターフェースになったため @Mock で差し替える。
  // 実際のマッピング動作は @DataJpaTest / @SpringBootTest 系のテストで担保する。
  @Mock TaskMapper mapper;

  private TaskService service;
  private final User me = new User();

  @BeforeEach
  void setUp() {
    service = new TaskService(tasks, categories, mapper, currentUser);
  }

  @Test
  void 他人のカテゴリを指定した作成は422相当() {
    when(currentUser.currentUser()).thenReturn(me);
    when(currentUser.currentUserId()).thenReturn(1L);
    when(categories.findByIdAndOwnerId(50L, 1L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.create(new TaskCreateRequest("t", null, null, null, 50L)))
        .isInstanceOf(BusinessRuleException.class);
  }

  @Test
  void categoryId無しの作成は成功しレスポンスのcategoryはnull() {
    Task savedTask = new Task();
    savedTask.setTitle("買い物");
    savedTask.setStatus(TaskStatus.TODO);

    TaskResponse expectedResponse =
        new TaskResponse(1L, "買い物", "牛乳", TaskStatus.TODO, null, null, null, null, null, null);

    when(currentUser.currentUser()).thenReturn(me);
    when(mapper.toEntity(any(), any(), any())).thenReturn(savedTask);
    when(tasks.save(any(Task.class))).thenReturn(savedTask);
    when(mapper.toResponse(savedTask)).thenReturn(expectedResponse);

    var res = service.create(new TaskCreateRequest("買い物", "牛乳", null, null, null));

    assertThat(res.title()).isEqualTo("買い物");
    assertThat(res.status()).isEqualTo(TaskStatus.TODO);
    assertThat(res.category()).isNull();
  }

  @Test
  void 自分のカテゴリを指定した作成はcategory要約が入る() {
    Category cat = new Category();
    cat.setId(3L);
    cat.setName("仕事");

    Task savedTask = new Task();
    savedTask.setTitle("資料作成");
    savedTask.setCategory(cat);

    TaskResponse.CategorySummary summary = new TaskResponse.CategorySummary(3L, "仕事");
    TaskResponse expectedResponse =
        new TaskResponse(1L, "資料作成", null, TaskStatus.TODO, null, null, summary, null, null, null);

    when(currentUser.currentUser()).thenReturn(me);
    when(currentUser.currentUserId()).thenReturn(1L);
    when(categories.findByIdAndOwnerId(3L, 1L)).thenReturn(Optional.of(cat));
    when(mapper.toEntity(any(), any(), any())).thenReturn(savedTask);
    when(tasks.save(any(Task.class))).thenReturn(savedTask);
    when(mapper.toResponse(savedTask)).thenReturn(expectedResponse);

    var res = service.create(new TaskCreateRequest("資料作成", null, null, null, 3L));

    assertThat(res.category()).isNotNull();
    assertThat(res.category().id()).isEqualTo(3L);
    assertThat(res.category().name()).isEqualTo("仕事");
  }

  @Test
  void changeStatusでDONEにするとcompletedAtが入る() {
    Task task = new Task();
    task.setStatus(TaskStatus.TODO);
    when(currentUser.currentUserId()).thenReturn(1L);
    when(tasks.findByIdAndOwnerId(9L, 1L)).thenReturn(Optional.of(task));

    // LEARN: changeStatus は task.applyStatus() を呼ぶ(副作用が entity に入る)ので、
    // mapper.toResponse() が呼ばれたときの task は既に DONE に変わっている。
    // ここでは mapper もモックなので、toResponse の戻り値を設定する必要がある。
    TaskResponse doneResponse =
        new TaskResponse(
            9L, "t", null, TaskStatus.DONE, null, null, null, null, null, java.time.Instant.now());
    when(mapper.toResponse(task)).thenReturn(doneResponse);

    var res = service.changeStatus(9L, new TaskStatusUpdateRequest(TaskStatus.DONE));

    assertThat(res.status()).isEqualTo(TaskStatus.DONE);
    assertThat(res.completedAt()).isNotNull();
  }

  @Test
  void 存在しないタスクのgetは404() {
    when(currentUser.currentUserId()).thenReturn(1L);
    when(tasks.findByIdAndOwnerId(1L, 1L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(1L)).isInstanceOf(ResourceNotFoundException.class);
  }
}
