package com.example.calc.calculation.dto;

import com.example.calc.calculation.Operator;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * 計算の入力。POST（新規作成）と PUT（全置換）で共用する。
 *
 * <p>LEARN: DTO は「層の境界を越えるためのただの入れ物」。{@code record} にすると不変になり、 コンストラクタ・getter・equals などが自動で用意される。
 *
 * <p>LEARN: {@code @NotNull} は Bean Validation の制約。Controller で {@code @Valid} を付けると、
 * メソッドに入る前に検証され、違反があれば 400（フィールド別エラー付き）になる。3 項目すべて必須。
 *
 * <p>LEARN: 数値は {@code double} ではなく {@link BigDecimal}。{@code 0.1 + 0.2} が {@code
 * 0.30000000000000004} になる二進浮動小数点の誤差を避け、電卓として正しい答えを返すため。
 *
 * <p>LEARN: {@code @Digits(integer = 28, fraction = 10)} は DB のカラム定義 {@code NUMERIC(38, 10)} に
 * 合わせている。DB に入らない値をアプリの入口で 400 として弾くための制約。 これが無いと「検証は通ったのに INSERT で落ちる」＝ 500 になる。
 * <strong>バリデーションはスキーマと対で考える</strong>、というのがここでの学び。
 */
public record CalculationRequest(
    @NotNull @Digits(integer = 28, fraction = 10) BigDecimal left,
    @NotNull Operator operator,
    @NotNull @Digits(integer = 28, fraction = 10) BigDecimal right) {

  /**
   * 【学習用】受け取った入力を表示する。
   *
   * <p>LEARN: この行が出たら「JSON を DTO に変換できた」ということ。逆にこの行が出ずに 400 で終わったら、 変換すらできなかった（壊れた JSON / enum に無い
   * operator）。その 2 つは同じ 400 でも意味が違う。
   *
   * <p>本来 DTO はただの入れ物で、こういう処理は書かない。学習用の一時的なもの。
   */
  public CalculationRequest {
    System.out.printf("[1/5 受信] 入力を DTO にできた: %s %s %s%n", left, operator, right);
  }
}
