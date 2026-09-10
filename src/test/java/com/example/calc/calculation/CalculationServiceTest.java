package com.example.calc.calculation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.calc.calculation.dto.CalculationRequest;
import com.example.calc.common.exception.BusinessRuleException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/**
 * CalculationService の計算ロジックを、Spring を起動せず {@code new} して確認する。
 *
 * <p>LEARN: 依存が無いクラスは、これが一番速くて確実なテスト。DI コンテナも MockMvc も要らない。
 */
class CalculationServiceTest {

  private final CalculationService service = new CalculationService();

  private BigDecimal result(String left, Operator operator, String right) {
    return service
        .calculate(new CalculationRequest(new BigDecimal(left), operator, new BigDecimal(right)))
        .result();
  }

  @Test
  void 足し算() {
    assertThat(result("2", Operator.ADD, "3")).isEqualByComparingTo("5");
  }

  @Test
  void 引き算はマイナスにもなる() {
    assertThat(result("3", Operator.SUBTRACT, "10")).isEqualByComparingTo("-7");
  }

  @Test
  void 掛け算() {
    assertThat(result("4", Operator.MULTIPLY, "2.5")).isEqualByComparingTo("10");
  }

  @Test
  void 割り算_割り切れる() {
    assertThat(result("6", Operator.DIVIDE, "3")).isEqualByComparingTo("2");
  }

  @Test
  void 割り算_割り切れないときは10桁で丸める() {
    assertThat(result("10", Operator.DIVIDE, "3")).isEqualByComparingTo("3.333333333");
  }

  @Test
  void 末尾ゼロは落として素直な整数表記にする() {
    BigDecimal r = result("50.0", Operator.MULTIPLY, "2"); // 100.0 → 100
    assertThat(r.toPlainString()).isEqualTo("100");
  }

  @Test
  void ゼロ除算はBusinessRuleException() {
    assertThatThrownBy(() -> result("1", Operator.DIVIDE, "0"))
        .isInstanceOf(BusinessRuleException.class)
        .hasMessageContaining("0 で割る");
  }
}
