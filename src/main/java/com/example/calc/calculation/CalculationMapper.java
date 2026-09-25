package com.example.calc.calculation;

import com.example.calc.calculation.dto.CalculationResponse;
import java.math.BigDecimal;

/**
 * エンティティ → レスポンス DTO の変換。
 *
 * <p>LEARN: 不変条件 #3「内部表現をそのまま公開しない」を実際に守っている場所。 ここを通すことで、DB のカラムを増やしても API のレスポンスは勝手に変わらない（変えたいときは
 * このクラスと DTO を直す、という明示的な作業になる）。
 *
 * <p>LEARN: MapStruct のようなライブラリで自動生成もできるが、項目が少ないうちは手書きで十分。 「変換が 1 か所に集まっている」ことが本質で、手段は問わない。
 *
 * <p>LEARN: Spring の Bean にする必要が無い（状態を持たない・DI する依存が無い）ので static メソッドの ユーティリティにしている。private
 * コンストラクタでインスタンス化を禁止する。
 */
final class CalculationMapper {

  private CalculationMapper() {}

  static CalculationResponse toResponse(Calculation entity) {
    return new CalculationResponse(
        entity.getId(),
        normalize(entity.getLeftOperand()),
        entity.getOperator(),
        normalize(entity.getRightOperand()),
        normalize(entity.getResult()),
        entity.getMemo(),
        entity.getCreatedAt(),
        entity.getUpdatedAt());
  }

  /**
   * 余分な末尾ゼロを落として、素直な表記にする。
   *
   * <p>LEARN: DB のカラムは {@code NUMERIC(38, 10)} なので、{@code 5} を保存して読み戻すと {@code 5.0000000000}
   * になる（スケールが固定だから）。変換せずに返すと、作成直後のレスポンスは {@code 5}、 あとから GET したレスポンスは {@code 5.0000000000}
   * という<strong>同じリソースなのに見た目が違う</strong>状態になる。
   *
   * <p>LEARN: だから「DB の都合」を DTO の境界で吸収する。これも内部表現を公開しないということの一部。
   *
   * <p>LEARN: {@code stripTrailingZeros()} は {@code 100} を {@code 1E+2} にしてしまうことがあるので、 指数表記になった場合だけ
   * scale を 0 に戻す。
   */
  private static BigDecimal normalize(BigDecimal value) {
    BigDecimal stripped = value.stripTrailingZeros();
    return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
  }
}
