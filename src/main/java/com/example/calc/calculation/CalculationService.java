package com.example.calc.calculation;

import com.example.calc.calculation.dto.CalculationRequest;
import com.example.calc.calculation.dto.CalculationResponse;
import com.example.calc.common.exception.BusinessRuleException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;

/**
 * 計算のユースケース。このアプリで「業務ロジック」と呼べるのはここだけ。
 *
 * <p>LEARN: Controller は HTTP の受け渡しに徹し、実際に「何を計算するか」はこの Service が持つ。 依存(DB / 外部 API)が無いので {@code new
 * CalculationService()} で単体テストできる。
 *
 * <p>LEARN: このクラスに {@code @Transactional} は付けない。DB を触らないのでトランザクション境界が要らない。 「すべての Service
 * にトランザクションが要る」は DB を持つアプリの話で、常に正しいわけではない。
 */
@Service
public class CalculationService {

  /** 割り算の商をどこまで求めるか。10 桁で四捨五入する。 */
  private static final MathContext DIVISION_CONTEXT = new MathContext(10, RoundingMode.HALF_UP);

  public CalculationResponse calculate(CalculationRequest req) {
    BigDecimal result =
        switch (req.operator()) {
          case ADD -> req.left().add(req.right());
          case SUBTRACT -> req.left().subtract(req.right());
          case MULTIPLY -> req.left().multiply(req.right());
          case DIVIDE -> divide(req.left(), req.right());
        };
    return new CalculationResponse(req.left(), req.operator(), req.right(), normalize(result));
  }

  private BigDecimal divide(BigDecimal left, BigDecimal right) {
    // LEARN: 「形は正しいが計算できない」入力。400(入力エラー)ではなく 422 にする。
    if (right.signum() == 0) {
      throw new BusinessRuleException("0 で割ることはできません");
    }
    return left.divide(right, DIVISION_CONTEXT);
  }

  /**
   * {@code 3.00} や {@code 2.0000000000} のような余分な末尾ゼロを落とす。
   *
   * <p>LEARN: {@code stripTrailingZeros()} は {@code 100} を {@code 1E+2} にしてしまうことがあるので、 指数表記になった場合だけ
   * scale を 0 に戻して素直な整数表記にする。
   */
  private BigDecimal normalize(BigDecimal value) {
    BigDecimal stripped = value.stripTrailingZeros();
    return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
  }
}
