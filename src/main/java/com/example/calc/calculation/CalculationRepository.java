package com.example.calc.calculation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
 * <p>LEARN: メソッド名から SQL を組み立てる仕組み（派生クエリ）もある。 {@code findByOperator} は「operator 列で絞り込む」と解釈され、{@code
 * SELECT ... FROM calculations WHERE operator = ?} が生成される。
 * 名前が仕様になるので、規則から外れた綴りにすると起動時に例外で落ちる（実行前に気づける）。
 *
 * <p>LEARN: 引数に {@link Pageable} を足すと、ページング（{@code LIMIT / OFFSET}）と並び順（{@code ORDER BY}）は Pageable
 * が持ってくる。戻り値を {@link Page} にすると、総件数を出すための {@code SELECT COUNT(*)} も自動で発行される（1 回の呼び出しで SQL は 2
 * 本）。{@code findAll(Pageable)} は {@code JpaRepository} から継承済み。
 *
 * <p>LEARN: {@code @Repository} は無くても動く（{@code JpaRepository} の継承だけで検出される）が、
 * 「これは永続化層」と明示するために付けている。
 */
@Repository
public interface CalculationRepository extends JpaRepository<Calculation, Long> {

  /** ある演算子の履歴だけを 1 ページ分。派生クエリに条件を足し、ページングは Pageable に任せる例。 */
  Page<Calculation> findByOperator(Operator operator, Pageable pageable);
}
