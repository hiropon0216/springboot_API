package com.example.calc.calculation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.calc.calculation.dto.CalculationResponse;
import com.example.calc.common.exception.BusinessRuleException;
import com.example.calc.common.exception.ResourceNotFoundException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * CalculationController の HTTP 挙動を、Service をモックして確認する。
 *
 * <p>LEARN: {@code @WebMvcTest} は web 層（Controller + {@code @RestControllerAdvice} + Jackson +
 * バリデーション）だけをロードする。Service は {@code @MockitoBean} で偽物に差し替えるので、計算も DB も 動かない。ここで見るのは「HTTP
 * として正しく振る舞うか」だけ —— ステータスコード・Location ヘッダ・ JSON の形・エラー応答。
 */
@WebMvcTest(CalculationController.class)
class CalculationControllerTest {

  @Autowired MockMvc mvc;
  @MockitoBean CalculationService service;

  private static CalculationResponse sample(long id) {
    return new CalculationResponse(
        id,
        new BigDecimal("6"),
        Operator.DIVIDE,
        new BigDecimal("3"),
        new BigDecimal("2"),
        null,
        Instant.parse("2026-09-25T00:00:00Z"),
        Instant.parse("2026-09-25T00:00:00Z"));
  }

  @Test
  void 作成は201でLocationヘッダを返す() throws Exception {
    when(service.create(any())).thenReturn(sample(12L));

    mvc.perform(
            post("/api/v1/calculations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":6,\"operator\":\"DIVIDE\",\"right\":3}"))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "http://localhost/api/v1/calculations/12"))
        .andExpect(jsonPath("$.id").value(12))
        .andExpect(jsonPath("$.result").value(2))
        .andExpect(jsonPath("$.createdAt").exists());
  }

  @Test
  void 一覧は200で配列を返す() throws Exception {
    when(service.findAll(null)).thenReturn(List.of(sample(2L), sample(1L)));

    mvc.perform(get("/api/v1/calculations"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].id").value(2));
  }

  @Test
  void 一覧は0件でも200で空配列() throws Exception {
    when(service.findAll(null)).thenReturn(List.of());

    mvc.perform(get("/api/v1/calculations"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void 一覧はoperatorで絞り込める() throws Exception {
    when(service.findAll(Operator.DIVIDE)).thenReturn(List.of(sample(1L)));

    mvc.perform(get("/api/v1/calculations").param("operator", "DIVIDE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));

    verify(service).findAll(Operator.DIVIDE);
  }

  @Test
  void 一覧の不正なoperatorは400() throws Exception {
    mvc.perform(get("/api/v1/calculations").param("operator", "PLUS"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void 取得は200で1件を返す() throws Exception {
    when(service.findById(1L)).thenReturn(sample(1L));

    mvc.perform(get("/api/v1/calculations/1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1));
  }

  @Test
  void 存在しないidの取得は404のProblemDetail() throws Exception {
    when(service.findById(999L)).thenThrow(new ResourceNotFoundException("計算履歴が見つかりません: id=999"));

    mvc.perform(get("/api/v1/calculations/999"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.type").value("urn:problem-type:not-found"))
        .andExpect(jsonPath("$.title").value("見つかりません"));
  }

  @Test
  void idが数値でないときは400() throws Exception {
    mvc.perform(get("/api/v1/calculations/abc")).andExpect(status().isBadRequest());
  }

  @Test
  void 全置換は200で更新後の姿を返す() throws Exception {
    when(service.replace(eq(1L), any())).thenReturn(sample(1L));

    mvc.perform(
            put("/api/v1/calculations/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":6,\"operator\":\"DIVIDE\",\"right\":3}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1));
  }

  @Test
  void 全置換で項目が欠けていれば400() throws Exception {
    // LEARN: PUT は全置換なので「送らなかった項目は変えない」ではなく「必須」。
    mvc.perform(
            put("/api/v1/calculations/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":6,\"right\":3}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.operator").exists());
  }

  @Test
  void 部分更新は200でメモだけ変わる() throws Exception {
    CalculationResponse withMemo =
        new CalculationResponse(
            1L,
            new BigDecimal("6"),
            Operator.DIVIDE,
            new BigDecimal("3"),
            new BigDecimal("2"),
            "家計簿",
            Instant.parse("2026-09-25T00:00:00Z"),
            Instant.parse("2026-09-25T01:00:00Z"));
    when(service.updateMemo(eq(1L), any())).thenReturn(withMemo);

    mvc.perform(
            patch("/api/v1/calculations/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"memo\":\"家計簿\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.memo").value("家計簿"));
  }

  @Test
  void 長すぎるメモは400() throws Exception {
    String tooLong = "あ".repeat(201);

    mvc.perform(
            patch("/api/v1/calculations/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"memo\":\"" + tooLong + "\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.memo").exists());
  }

  @Test
  void 削除は204でbodyなし() throws Exception {
    mvc.perform(delete("/api/v1/calculations/1")).andExpect(status().isNoContent());

    verify(service).delete(1L);
  }

  @Test
  void 存在しないidの削除は404() throws Exception {
    doThrow(new ResourceNotFoundException("計算履歴が見つかりません: id=999")).when(service).delete(999L);

    mvc.perform(delete("/api/v1/calculations/999")).andExpect(status().isNotFound());
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
  void 小数点以下の桁数が多すぎる入力は400() throws Exception {
    // LEARN: DB のカラムは NUMERIC(38,10)。入らない値は入口で 400 にする（500 にしない）。
    mvc.perform(
            post("/api/v1/calculations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":1.00000000001,\"operator\":\"ADD\",\"right\":1}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.left").exists());
  }

  @Test
  void ゼロ除算は422のProblemDetail() throws Exception {
    when(service.create(any())).thenThrow(new BusinessRuleException("0 で割ることはできません"));

    mvc.perform(
            post("/api/v1/calculations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"left\":1,\"operator\":\"DIVIDE\",\"right\":0}"))
        .andExpect(status().is(422))
        .andExpect(jsonPath("$.status").value(422))
        .andExpect(jsonPath("$.type").value("urn:problem-type:business-rule"));
  }
}
