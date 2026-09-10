package com.example.calc.calculation;

import com.example.calc.calculation.dto.CalculationRequest;
import com.example.calc.calculation.dto.CalculationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 計算のエンドポイント。エンドポイントはこの1本だけ。
 *
 * <p>LEARN: Controller の仕事は「HTTP の通訳」。{@code @RequestBody} で JSON を DTO に、{@code @Valid} で
 * 検証し、Service に渡し、戻り値を JSON にして返す。四則演算そのものは一切ここに書かない。
 *
 * <p>LEARN: 計算は何も生成しない(サーバー状態が変わらない)ので、REST 的には POST + 200 が素直。 「リソースを作った」わけではないので 201 は使わない。
 */
@RestController
@RequestMapping("/api/v1/calculations")
@Tag(name = "Calculation", description = "四則演算")
public class CalculationController {

  private final CalculationService service;

  CalculationController(CalculationService service) {
    this.service = service;
  }

  @PostMapping
  @Operation(summary = "計算する", description = "left / operator / right を受け取り result を返す")
  @ApiResponse(responseCode = "200", description = "計算結果")
  @ApiResponse(responseCode = "400", description = "入力不足 or 不正な operator")
  @ApiResponse(responseCode = "422", description = "0 除算")
  public CalculationResponse calculate(@Valid @RequestBody CalculationRequest request) {
    return service.calculate(request);
  }
}
