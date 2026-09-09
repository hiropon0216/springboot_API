package com.example.taskapi.task;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.taskapi.common.PageResponse;
import com.example.taskapi.common.exception.BusinessRuleException;
import com.example.taskapi.common.exception.ResourceNotFoundException;
import com.example.taskapi.config.SecurityConfig;
import com.example.taskapi.task.dto.TaskResponse;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * LEARN: Sprint 2 から {@code @WithMockUser} と {@code @MockitoBean JwtDecoder} が必要。 SecurityConfig が
 * JWT を要求するが、@WebMvcTest では JwtDecoder Bean が自動登録されないため モックで差し替える。@WithMockUser でテスト用の認証情報を
 * SecurityContext にセット。
 *
 * <p>LEARN: Sprint 3 で {@code GET /tasks} のページングテストを追加。サービスをモックして {@link PageResponse}
 * を返すことで、コントローラのパラメータ解析・シリアライズだけをテストできる。
 */
@WebMvcTest(TaskController.class)
@Import(SecurityConfig.class)
@WithMockUser
@TestPropertySource(
    properties = {
      "app.jwt.secret=test-secret-key-must-be-at-least-256-bits-long-so-we-pad-it-here",
      "app.jwt.expires-in-seconds=3600"
    })
class TaskControllerTest {

  @Autowired MockMvc mvc;
  @MockitoBean TaskService service;
  @MockitoBean JwtDecoder jwtDecoder;

  private static TaskResponse sample() {
    return new TaskResponse(
        1L, "t", null, TaskStatus.TODO, null, null, null, Instant.now(), Instant.now(), null);
  }

  @Test
  void 作成成功は201() throws Exception {
    when(service.create(any())).thenReturn(sample());

    mvc.perform(
            post("/api/v1/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"t\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("TODO"));
  }

  @Test
  void タイトルが空なら400() throws Exception {
    mvc.perform(
            post("/api/v1/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"  \"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.title").exists());
  }

  @Test
  void statusに不正なenum値を送ると400() throws Exception {
    mvc.perform(
            patch("/api/v1/tasks/1/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"WHATEVER\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void 他人のカテゴリ指定は422() throws Exception {
    when(service.create(any()))
        .thenThrow(new BusinessRuleException("カテゴリ(id=9)が存在しないか、自分のものではありません"));

    mvc.perform(
            post("/api/v1/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"t\",\"categoryId\":9}"))
        .andExpect(status().is(422))
        .andExpect(jsonPath("$.status").value(422));
  }

  @Test
  void 存在しないタスクは404() throws Exception {
    when(service.get(eq(7L))).thenThrow(new ResourceNotFoundException("Task", 7L));

    mvc.perform(get("/api/v1/tasks/7")).andExpect(status().isNotFound());
  }

  /**
   * Sprint 2 受け入れ基準: トークンなしで保護エンドポイントを呼ぶと 401。
   *
   * <p>LEARN: {@code @WithAnonymousUser} でクラスレベルの {@code @WithMockUser} を上書きできる。
   * oauth2ResourceServer の BearerTokenAuthenticationFilter が Authorization ヘッダを確認し、 無ければ 401
   * Unauthorized を返す。これで「認証なしアクセスのガード」を層テストで担保する。
   */
  @Test
  @org.springframework.security.test.context.support.WithAnonymousUser
  void 認証なしのアクセスは401() throws Exception {
    mvc.perform(get("/api/v1/tasks")).andExpect(status().isUnauthorized());
  }

  /**
   * Sprint 3: GET /tasks にフィルタパラメータを付けて呼び出すテスト。
   *
   * <p>LEARN: サービスをモックして PageResponse を返すことで、コントローラの「パラメータ受け取り → サービス呼び出し → レスポンスシリアライズ」を検証できる。
   * Pageable の引数マッチングは {@code any(Pageable.class)} で簡略化。
   */
  @Test
  void GETタスク一覧にstatusフィルタを付けると200() throws Exception {
    TaskResponse taskResponse = sample();
    PageResponse<TaskResponse> pageResponse =
        new PageResponse<>(List.of(taskResponse), 0, 20, 1L, 1);

    when(service.list(eq(TaskStatus.TODO), isNull(), isNull(), any(Pageable.class)))
        .thenReturn(pageResponse);

    mvc.perform(get("/api/v1/tasks").param("status", "TODO"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.content[0].status").value("TODO"))
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.page").value(0));
  }

  /**
   * Sprint 3: GET /tasks に不正な status enum を送ると 400。
   *
   * <p>LEARN: {@code ?status=INVALID} はコントローラに届く前に Spring MVC が {@code TaskStatus} に変換しようとして {@code
   * MethodArgumentTypeMismatchException} を投げる。GlobalExceptionHandler がこれを 400 にマッピングする。
   */
  @Test
  void GETタスク一覧に不正なstatus値で400() throws Exception {
    mvc.perform(get("/api/v1/tasks").param("status", "INVALID_STATUS"))
        .andExpect(status().isBadRequest());
  }
}
