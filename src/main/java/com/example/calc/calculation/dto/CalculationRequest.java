package com.example.calc.calculation.dto;

import com.example.calc.calculation.Operator;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * 計算の入力。
 *
 * <p>LEARN: DTO は「層の境界を越えるためのただの入れ物」。{@code record} にすると不変になり、 コンストラクタ・getter・equals などが自動で用意される。
 *
 * <p>LEARN: {@code @NotNull} は Bean Validation の制約。Controller で {@code @Valid} を付けると、
 * メソッドに入る前に検証され、違反があれば 400 (フィールド別エラー付き)になる。 3 項目すべて必須。値の大小や小数点以下の桁数はここでは縛らない。
 *
 * <p>LEARN: 数値は {@code double} ではなく {@link BigDecimal}。{@code 0.1 + 0.2} が {@code
 * 0.30000000000000004} になる二進浮動小数点の誤差を避け、電卓として正しい答えを返すため。
 */
public record CalculationRequest(
    @NotNull BigDecimal left, @NotNull Operator operator, @NotNull BigDecimal right) {}
