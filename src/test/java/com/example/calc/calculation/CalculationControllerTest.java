package com.example.calc.calculation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.calc.calculation.dto.CalculationResponse;
import com.example.calc.common.exception.BusinessRuleException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * CalculationController の HTTP 挙動を、Service をモックして確認する。
 *
 * <p>LEARN: {@code @WebMvcTest} は web 層(Controller + {@code @RestControllerAdvice} + Jackson +
 * バリデーション)だけをロードする。Service は {@code @MockitoBean} で偽物に差し替えるので、 計算そのものは検証しない。ここで見るのは「HTTP
 * として正しく振る舞うか」だけ。
 */
@WebMvcTest(CalculationController.class)
class CalculationControllerTest {

  @Autowired MockMvc mvc;
  @MockitoBean CalculationService service;

  @Test
  void 計算成功は200でresultを返す() throws Exception {
    when(service.calculate(any()))
        .thenReturn(
            new CalculationResponse(
                new BigDecimal("6"), Operator.DIVIDE, new BigDecimal("3"), new BigDecimal("2")));

    mvc.perform(
            post("/api/v1/calculations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":6,\"operator\":\"DIVIDE\",\"right\":3}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.result").value(2))
        .andExpect(jsonPath("$.operator").value("DIVIDE"));
  }

  @Test
  void operator欠落は400でフィールドエラー() throws Exception {
    mvc.perform(
            post("/api/v1/calculations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":6,\"right\":3}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("入力値が不正です"))
        .andExpect(jsonPath("$.errors.operator").exists());
  }

  @Test
  void enumに無いoperatorは400() throws Exception {
    mvc.perform(
            post("/api/v1/calculations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":6,\"operator\":\"PLUS\",\"right\":3}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void ゼロ除算は422のProblemDetail() throws Exception {
    when(service.calculate(any())).thenThrow(new BusinessRuleException("0 で割ることはできません"));

    mvc.perform(
            post("/api/v1/calculations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":1,\"operator\":\"DIVIDE\",\"right\":0}"))
        .andExpect(status().is(422))
        .andExpect(jsonPath("$.status").value(422))
        .andExpect(jsonPath("$.type").value("urn:problem-type:business-rule"));
  }
}
