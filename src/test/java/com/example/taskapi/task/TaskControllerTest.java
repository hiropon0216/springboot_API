package com.example.taskapi.task;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.taskapi.common.exception.BusinessRuleException;
import com.example.taskapi.common.exception.ResourceNotFoundException;
import com.example.taskapi.config.SecurityConfig;
import com.example.taskapi.task.dto.TaskResponse;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TaskController.class)
@Import(SecurityConfig.class)
class TaskControllerTest {

  @Autowired MockMvc mvc;
  @MockitoBean TaskService service;

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
}
