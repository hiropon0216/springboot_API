package com.example.calc.calculation;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

  /** Service と同じ並び順（新しい順、同時刻は id の大きい順）。 */
  private static final Sort NEWEST_FIRST =
      Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

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
    // LEARN: DB の timestamp の精度（マイクロ秒）に揃っている＝読み戻しても値が変わらない。
    assertThat(saved.getCreatedAt().getNano() % 1_000).isZero();
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
  void 一覧は新しい順に1ページ分だけ返り総件数も分かる() {
    save("1", Operator.ADD, "1", "2");
    save("2", Operator.ADD, "2", "4");
    save("3", Operator.ADD, "3", "6");

    // LEARN: 2 件ずつに区切った 0 ページ目。SQL は LIMIT 付きの SELECT と COUNT(*) の 2 本が飛ぶ。
    Page<Calculation> first = repository.findAll(PageRequest.of(0, 2, NEWEST_FIRST));

    assertThat(first.getContent()).hasSize(2);
    assertThat(first.getContent().get(0).getResult()).isEqualByComparingTo("6");
    assertThat(first.getTotalElements()).isEqualTo(3);
    assertThat(first.getTotalPages()).isEqualTo(2);

    Page<Calculation> second = repository.findAll(PageRequest.of(1, 2, NEWEST_FIRST));
    assertThat(second.getContent()).hasSize(1);
    assertThat(second.getContent().get(0).getResult()).isEqualByComparingTo("2");
  }

  @Test
  void 演算子で絞り込める() {
    save("1", Operator.ADD, "1", "2");
    save("6", Operator.DIVIDE, "3", "2");
    save("2", Operator.MULTIPLY, "3", "6");

    Page<Calculation> divides =
        repository.findByOperator(Operator.DIVIDE, PageRequest.of(0, 20, NEWEST_FIRST));

    assertThat(divides.getContent()).hasSize(1);
    assertThat(divides.getContent().get(0).getOperator()).isEqualTo(Operator.DIVIDE);
    assertThat(divides.getTotalElements()).isEqualTo(1);
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
