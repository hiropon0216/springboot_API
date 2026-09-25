package com.example.calc.calculation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.calc.calculation.dto.CalculationRequest;
import com.example.calc.calculation.dto.MemoUpdateRequest;
import com.example.calc.common.exception.BusinessRuleException;
import com.example.calc.common.exception.ResourceNotFoundException;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * CalculationService のロジックを、Spring も DB も起動せず確認する。
 *
 * <p>LEARN: Repository が依存に加わったが、それをモック（偽物）に差し替えれば {@code new} でテストできる。 「DB
 * を用意しないと業務ロジックをテストできない」状態は設計が悪い兆候。ここでは
 *
 * <ul>
 *   <li>計算が正しいか → このテスト（速い・DB 不要）
 *   <li>DB に正しく入るか → {@link CalculationRepositoryTest}（@DataJpaTest）
 *   <li>HTTP として正しいか → {@link CalculationControllerTest}（@WebMvcTest）
 * </ul>
 *
 * と役割を分けている。これがテストピラミッドの実践。
 */
class CalculationServiceTest {

  private final CalculationRepository repository = mock(CalculationRepository.class);
  private final CalculationService service = new CalculationService(repository);

  /** LEARN: 更新系は saveAndFlush を通るので、モックも「渡したものを返す」ようにしておく。 */
  private void stubSave() {
    when(repository.saveAndFlush(any(Calculation.class))).thenAnswer(inv -> inv.getArgument(0));
  }

  /** LEARN: save() は「渡されたものをそのまま返す」ようにしておく（本物の DB の代わり）。 */
  private BigDecimal result(String left, Operator operator, String right) {
    when(repository.save(any(Calculation.class))).thenAnswer(inv -> inv.getArgument(0));
    return service
        .create(new CalculationRequest(new BigDecimal(left), operator, new BigDecimal(right)))
        .result();
  }

  private static Calculation entity(String left, Operator operator, String right, String result) {
    return new Calculation(
        new BigDecimal(left), operator, new BigDecimal(right), new BigDecimal(result));
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
  void 小数の計算はBigDecimalなので誤差が出ない() {
    assertThat(result("0.1", Operator.ADD, "0.2").toPlainString()).isEqualTo("0.3");
  }

  @Test
  void 保存できる桁数を超えた結果は10桁に丸めて保存する() {
    // 0.00000000005 × 1 は小数 11 桁。NUMERIC(38,10) に収まる形へ丸めてから返す。
    assertThat(result("0.00000000005", Operator.MULTIPLY, "1").scale()).isLessThanOrEqualTo(10);
  }

  @Test
  void ゼロ除算はBusinessRuleExceptionで保存もされない() {
    assertThatThrownBy(() -> result("1", Operator.DIVIDE, "0"))
        .isInstanceOf(BusinessRuleException.class)
        .hasMessageContaining("0 で割る");

    // LEARN: 例外が飛んだら INSERT まで進まない（@Transactional が無くてもこの順序なら呼ばれない）。
    verify(repository, never()).save(any());
  }

  @Test
  void 計算するとリポジトリに保存される() {
    when(repository.save(any(Calculation.class))).thenAnswer(inv -> inv.getArgument(0));

    service.create(new CalculationRequest(BigDecimal.ONE, Operator.ADD, BigDecimal.ONE));

    verify(repository).save(any(Calculation.class));
  }

  @Test
  void 存在しないidの取得はResourceNotFoundException() {
    when(repository.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.findById(999L))
        .isInstanceOf(ResourceNotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void 全置換すると再計算されてメモは消える() {
    Calculation stored = entity("1", Operator.ADD, "1", "2");
    stored.changeMemo("あとで見る");
    when(repository.findById(1L)).thenReturn(Optional.of(stored));
    stubSave();

    var response =
        service.replace(
            1L, new CalculationRequest(new BigDecimal("10"), Operator.DIVIDE, new BigDecimal("4")));

    assertThat(response.result()).isEqualByComparingTo("2.5");
    assertThat(response.operator()).isEqualTo(Operator.DIVIDE);
    // LEARN: PUT は全置換なので、本文に無かった memo は null に戻る。
    assertThat(response.memo()).isNull();
  }

  @Test
  void 部分更新はメモだけ変えて式は触らない() {
    Calculation stored = entity("2", Operator.ADD, "3", "5");
    when(repository.findById(1L)).thenReturn(Optional.of(stored));
    stubSave();

    var response = service.updateMemo(1L, new MemoUpdateRequest("家計簿の計算"));

    assertThat(response.memo()).isEqualTo("家計簿の計算");
    assertThat(response.result()).isEqualByComparingTo("5");
    assertThat(response.operator()).isEqualTo(Operator.ADD);
  }

  @Test
  void 削除はリポジトリのdeleteを呼ぶ() {
    Calculation stored = entity("2", Operator.ADD, "3", "5");
    when(repository.findById(1L)).thenReturn(Optional.of(stored));

    service.delete(1L);

    verify(repository).delete(stored);
  }

  @Test
  void 存在しないidの削除は404で消しに行かない() {
    when(repository.findById(42L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.delete(42L)).isInstanceOf(ResourceNotFoundException.class);
    verify(repository, never()).delete(any(Calculation.class));
  }
}
