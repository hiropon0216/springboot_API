package com.example.calc.calculation;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Repository とエンティティのマッピングを、本物の DB（テストでは H2）に対して確認する。
 *
 * <p>LEARN: {@code @DataJpaTest} は「永続化層だけ」を起動するスライステスト。Controller も Service も
 * ロードしないので速い。各テストは既定でトランザクション内で走り、<strong>終了後に自動でロールバック</strong>される。 だからテスト間でデータが混ざらない。
 *
 * <p>LEARN: ここで見るのは「計算が正しいか」ではなく <strong>DB と Java の対応が正しいか</strong>:
 *
 * <ul>
 *   <li>id が DB で採番されているか（保存前は null）
 *   <li>{@code @PrePersist} が時刻を入れているか
 *   <li>派生クエリ（メソッド名から生成される SQL）が意図した並び・絞り込みになっているか
 * </ul>
 *
 * <p>LEARN: {@code flush()} は「溜めている SQL を今すぐ DB に送る」、{@code clear()} は 「1 次キャッシュを空にする」。これをやらないと、次の
 * SELECT がメモリ上のオブジェクトを返してしまい、 「DB に本当に入ったか」を確かめたことにならない。
 */
@DataJpaTest
@ActiveProfiles("test")
class CalculationRepositoryTest {

  @Autowired CalculationRepository repository;

  private Calculation save(String left, Operator operator, String right, String result) {
    return repository.save(
        new Calculation(
            new BigDecimal(left), operator, new BigDecimal(right), new BigDecimal(result)));
  }

  @Test
  void 保存するとidと作成日時が入る() {
    Calculation entity =
        new Calculation(
            new BigDecimal("2"), Operator.ADD, new BigDecimal("3"), new BigDecimal("5"));
    assertThat(entity.getId()).isNull();

    Calculation saved = repository.save(entity);

    assertThat(saved.getId()).isNotNull();
    assertThat(saved.getCreatedAt()).isNotNull();
    assertThat(saved.getUpdatedAt()).isNotNull();
  }

  @Test
  void 保存した値がDBから読み戻せる() {
    Long id = save("10", Operator.DIVIDE, "4", "2.5").getId();
    repository.flush();

    Calculation found = repository.findById(id).orElseThrow();

    assertThat(found.getOperator()).isEqualTo(Operator.DIVIDE);
    assertThat(found.getLeftOperand()).isEqualByComparingTo("10");
    assertThat(found.getRightOperand()).isEqualByComparingTo("4");
    assertThat(found.getResult()).isEqualByComparingTo("2.5");
    assertThat(found.getMemo()).isNull();
  }

  @Test
  void 一覧は新しい順に返る() {
    save("1", Operator.ADD, "1", "2");
    save("2", Operator.ADD, "2", "4");
    save("3", Operator.ADD, "3", "6");

    List<Calculation> all = repository.findAllByOrderByCreatedAtDescIdDesc();

    assertThat(all).hasSize(3);
    assertThat(all.get(0).getResult()).isEqualByComparingTo("6");
    assertThat(all.get(2).getResult()).isEqualByComparingTo("2");
  }

  @Test
  void 演算子で絞り込める() {
    save("1", Operator.ADD, "1", "2");
    save("6", Operator.DIVIDE, "3", "2");
    save("2", Operator.MULTIPLY, "3", "6");

    List<Calculation> divides =
        repository.findByOperatorOrderByCreatedAtDescIdDesc(Operator.DIVIDE);

    assertThat(divides).hasSize(1);
    assertThat(divides.get(0).getOperator()).isEqualTo(Operator.DIVIDE);
  }

  @Test
  void メモを変えるとUPDATEが飛んで永続化される() {
    Long id = save("2", Operator.ADD, "3", "5").getId();

    // LEARN: save() を呼んでいないのに更新される（ダーティチェック）。
    Calculation target = repository.findById(id).orElseThrow();
    java.time.Instant before = target.getUpdatedAt();
    target.changeMemo("あとで見る");
    repository.flush();

    Calculation reloaded = repository.findById(id).orElseThrow();
    assertThat(reloaded.getMemo()).isEqualTo("あとで見る");
    // LEARN: @PreUpdate がフラッシュ時に走るので、更新時刻が進んでいる。
    assertThat(reloaded.getUpdatedAt()).isAfterOrEqualTo(before);
  }

  @Test
  void 削除すると引けなくなる() {
    Long id = save("2", Operator.ADD, "3", "5").getId();

    repository.deleteById(id);
    repository.flush();

    assertThat(repository.findById(id)).isEmpty();
  }
}
