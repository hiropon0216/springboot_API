package com.example.calc.calculation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 計算履歴の永続化窓口。
 *
 * <p>LEARN: 実装クラスを書かない。インタフェースを宣言するだけで、Spring Data JPA が起動時に 実装を自動生成して Bean
 * として登録する（プロキシ）。だから「Repository は interface」が原則で、 ArchUnit でもそれを強制している。
 *
 * <p>LEARN: {@link JpaRepository} を継承すると {@code save} / {@code findById} / {@code findAll} / {@code
 * deleteById} / {@code existsById} などが最初から使える。CRUD の SQL を手で書く必要はない。
 *
 * <p>LEARN: メソッド名から SQL を組み立てる仕組み（派生クエリ）もある。 {@code findAllByOrderByCreatedAtDesc} は「全件取得し
 * created_at の降順に並べる」と解釈され、 {@code SELECT ... FROM calculations ORDER BY created_at DESC} が生成される。
 * 名前が仕様になるので、規則から外れた綴りにすると起動時に例外で落ちる（実行前に気づける）。
 *
 * <p>LEARN: {@code @Repository} は無くても動く（{@code JpaRepository} の継承だけで検出される）が、
 * 「これは永続化層」と明示するために付けている。
 */
@Repository
public interface CalculationRepository extends JpaRepository<Calculation, Long> {

  /** 新しい順に全件。同時刻が並んだときの順序を安定させるため id も見る。 */
  List<Calculation> findAllByOrderByCreatedAtDescIdDesc();

  /** ある演算子の履歴だけを新しい順に。派生クエリで条件を足す例。 */
  List<Calculation> findByOperatorOrderByCreatedAtDescIdDesc(Operator operator);
}
