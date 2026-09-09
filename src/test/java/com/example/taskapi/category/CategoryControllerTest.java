package com.example.taskapi.category;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.taskapi.category.dto.CategoryResponse;
import com.example.taskapi.common.exception.DuplicateResourceException;
import com.example.taskapi.common.exception.ResourceNotFoundException;
import com.example.taskapi.config.SecurityConfig;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * CategoryController の HTTP 挙動を、Service をモックして確認する。
 *
 * <p>LEARN: {@code @WebMvcTest} は web 層(Controller + {@code @RestControllerAdvice} + Jackson +
 * バリデーション)だけをロードする。Service や DB は出てこないので速い。エラー整形(ProblemDetail)が ちゃんと効くかもここで見る。
 *
 * <p>LEARN: Sprint 2 から SecurityConfig が JWT を要求するので、{@code @WithMockUser} で SecurityContext
 * にユーザーをセットして認証済み状態を偽装する。Service はモックなので {@code CurrentUserProvider} は動かない。JwtDecoder は Bean
 * として必要なため {@code @MockitoBean} で差し替える。
 */
@WebMvcTest(CategoryController.class)
@Import(SecurityConfig.class)
@WithMockUser // LEARN: クラスレベルで付けると全テストメソッドに適用。認証済みユーザーとして扱われる。
@TestPropertySource(
    properties = {
      // LEARN: @WebMvcTest は application.yml を読まないので JWT 設定を直接指定する。
      "app.jwt.secret=test-secret-key-must-be-at-least-256-bits-long-so-we-pad-it-here",
      "app.jwt.expires-in-seconds=3600"
    })
class CategoryControllerTest {

  @Autowired MockMvc mvc;
  @MockitoBean CategoryService service;

  // LEARN: @WebMvcTest では JwtDecoder が application context に登録されていないため、
  // MockitoBean で差し替える。実際のトークン検証は行わず、@WithMockUser の認証情報を使う。
  @MockitoBean JwtDecoder jwtDecoder;

  @Test
  void 作成成功は201とLocationヘッダ() throws Exception {
    when(service.create(any()))
        .thenReturn(new CategoryResponse(10L, "仕事", "#4C6EF5", Instant.now(), Instant.now()));

    mvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"仕事\",\"color\":\"#4C6EF5\"}"))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "/api/v1/categories/10"))
        .andExpect(jsonPath("$.id").value(10))
        .andExpect(jsonPath("$.name").value("仕事"));
  }

  @Test
  void 名前が空なら400でフィールドエラーが返る() throws Exception {
    mvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\",\"color\":null}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("入力値が不正です"))
        .andExpect(jsonPath("$.errors.name").exists());
  }

  @Test
  void colorの形式が不正なら400() throws Exception {
    mvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"色\",\"color\":\"red\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.color").exists());
  }

  @Test
  void 存在しないIDは404のProblemDetail() throws Exception {
    when(service.get(eq(99L))).thenThrow(new ResourceNotFoundException("Category", 99L));

    mvc.perform(get("/api/v1/categories/99"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.type").value("urn:problem-type:resource-not-found"));
  }

  @Test
  void 名前重複は409() throws Exception {
    when(service.create(any())).thenThrow(new DuplicateResourceException("カテゴリ名『仕事』は既に存在します"));

    mvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"仕事\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  void 削除は204() throws Exception {
    mvc.perform(delete("/api/v1/categories/3")).andExpect(status().isNoContent());
  }

  /**
   * Sprint 2 受け入れ基準: トークンなしで保護エンドポイントを呼ぶと 401。
   *
   * <p>LEARN: {@code @WithMockUser} はクラスレベルに付いているが、{@code @WithAnonymousUser} を
   * メソッドレベルに付けると匿名ユーザーでのリクエストを模倣できる。oauth2ResourceServer フィルターが Authorization ヘッダを見つけられず 401 を返す。
   */
  @Test
  @org.springframework.security.test.context.support.WithAnonymousUser
  void 認証なしのアクセスは401() throws Exception {
    mvc.perform(get("/api/v1/categories")).andExpect(status().isUnauthorized());
  }
}
