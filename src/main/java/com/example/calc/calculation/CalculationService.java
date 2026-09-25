package com.example.calc.calculation;

import com.example.calc.calculation.dto.CalculationRequest;
import com.example.calc.calculation.dto.CalculationResponse;
import com.example.calc.calculation.dto.MemoUpdateRequest;
import com.example.calc.common.exception.BusinessRuleException;
import com.example.calc.common.exception.ResourceNotFoundException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 計算のユースケース。「計算する」＋「履歴を CRUD する」の両方を持つ。
 *
 * <p>LEARN: Controller は HTTP の受け渡しに徹し、「何を計算するか」「いつ保存するか」はこの Service が持つ。 依存は {@link
 * CalculationRepository} だけなので、単体テストではモックに差し替えて {@code new} できる。
 *
 * <p>LEARN: クラスに {@code @Transactional(readOnly = true)} を付け、書き込むメソッドだけ {@code @Transactional}
 * で上書きしている。これで「既定は読み取り専用、書くメソッドは明示」になる。
 *
 * <ul>
 *   <li>トランザクション = 「全部成功か、全部取り消し」の単位。途中で例外が飛べば DB の変更は巻き戻る。
 *   <li>{@code readOnly = true} は Hibernate に「変更検知（dirty check）は不要」と伝える最適化でもある。
 *   <li>境界を Service に置くのが定石。Controller に置くと HTTP の都合が、Repository に置くと 1 SQL
 *       ごとにコミットされてしまい「まとめて成功/失敗」が表現できない。
 * </ul>
 *
 * <p>LEARN: このクラスは HTTP を一切知らない（ステータスコードも JSON も出てこない）。同時に、 戻り値はエンティティではなく DTO にしている。つまり「DB
 * の都合」も外に出さない。両側を遮断するのが層の役目。
 */
@Service
@Transactional(readOnly = true)
public class CalculationService {

  /** 割り算の商をどこまで求めるか。有効数字 10 桁で四捨五入する。 */
  private static final MathContext DIVISION_CONTEXT = new MathContext(10, RoundingMode.HALF_UP);

  /**
   * 保存できる小数点以下の桁数。エンティティの {@code NUMERIC(38, 10)} と揃える。
   *
   * <p>LEARN: DB のスキーマが計算精度の上限を決める、ということ。ここで丸めておかないと 「レスポンスの値と DB に入った値が違う」状態（掛け算で桁が増えたときに起きる）になる。
   */
  private static final int STORAGE_SCALE = 10;

  private final CalculationRepository repository;

  CalculationService(CalculationRepository repository) {
    this.repository = repository;
  }

  /**
   * 計算して履歴に 1 件保存する（POST）。
   *
   * <p>LEARN: {@code @Transactional} を付けたので、0 除算の例外が飛べば INSERT は行われない。 「計算 → 保存」が 1 つの単位になっている。
   */
  @Transactional
  public CalculationResponse create(CalculationRequest req) {
    System.out.printf("[3/5 業務] 計算する: %s %s %s%n", req.left(), req.operator(), req.right());
    BigDecimal result = compute(req);

    Calculation entity = new Calculation(req.left(), req.operator(), req.right(), result);

    // LEARN: save() が INSERT を実行し、DB が採番した id をエンティティに書き戻してくれる。
    // 戻り値（管理された永続エンティティ）を使うのが作法。引数の entity を使い続けるのは避ける。
    Calculation saved = repository.save(entity);
    System.out.printf("[4/5 保存] INSERT 完了: id=%s result=%s%n", saved.getId(), saved.getResult());

    return CalculationMapper.toResponse(saved);
  }

  /**
   * 履歴の一覧（GET コレクション）。新しい順。{@code operator} が指定されればその演算子だけ。
   *
   * <p>LEARN: 一覧に絞り込み条件を足すときは、クエリパラメータ（{@code ?operator=ADD}）にする。 パス（{@code
   * /calculations/add}）にしない。パスは「リソースの場所」、クエリは「絞り込み方」。
   */
  public List<CalculationResponse> findAll(Operator operator) {
    List<Calculation> found =
        operator == null
            ? repository.findAllByOrderByCreatedAtDescIdDesc()
            : repository.findByOperatorOrderByCreatedAtDescIdDesc(operator);
    System.out.printf("[4/5 保存] SELECT 完了: %d 件（operator=%s）%n", found.size(), operator);

    // LEARN: エンティティのリストを、そのまま返さず DTO のリストに変換して返す。
    return found.stream().map(CalculationMapper::toResponse).toList();
  }

  /** 履歴 1 件（GET）。無ければ 404 になる例外を投げる。 */
  public CalculationResponse findById(Long id) {
    return CalculationMapper.toResponse(mustFind(id));
  }

  /**
   * 式を全置換して再計算する（PUT）。
   *
   * <p>LEARN: PUT は「その URL の中身をこの内容で全部置き換える」操作。だから body は left / operator / right が全部必須で、本文に無い
   * {@code memo} は null に戻る。 同じリクエストを何度送っても結果が同じ（冪等）なのが PUT の性質。
   *
   * <p>LEARN: エンティティのフィールドを書き換えるだけで UPDATE 文が飛ぶ（ダーティチェック）。 トランザクション内で取得したエンティティは Hibernate
   * が監視していて、フラッシュのタイミングで 変更を検知し UPDATE を組み立てる。{@code save()} の呼び忘れで困らない代わりに、 「更新したつもりが無いのに UPDATE
   * される」事故も起きうる。下で {@code saveAndFlush} を 呼ぶのは保存のためではなく、返す前に更新時刻を確定させるため。
   */
  @Transactional
  public CalculationResponse replace(Long id, CalculationRequest req) {
    Calculation entity = mustFind(id);
    System.out.printf("[3/5 業務] 再計算する: %s %s %s%n", req.left(), req.operator(), req.right());

    entity.replaceExpression(req.left(), req.operator(), req.right(), compute(req));
    entity.changeMemo(null);

    // LEARN: saveAndFlush で「今すぐ UPDATE を発行」させる。これをしないと @PreUpdate は
    // コミット時（このメソッドを抜けた後）に走るため、まだ古い updatedAt を DTO に詰めてしまう。
    // 「いつ SQL が飛ぶか」を意識しないと、返した JSON と DB の中身がずれる。
    return CalculationMapper.toResponse(repository.saveAndFlush(entity));
  }

  /**
   * メモだけ部分更新する（PATCH）。
   *
   * <p>LEARN: PATCH は「差分だけ送る」操作。left / operator / right は触らないので再計算も起きない。 PUT
   * との違いを「送る項目の数」ではなく「意味」で押さえる: PUT = 置き換え、PATCH = 変更。
   */
  @Transactional
  public CalculationResponse updateMemo(Long id, MemoUpdateRequest req) {
    Calculation entity = mustFind(id);
    entity.changeMemo(req.memo());

    // LEARN: replace と同じ理由で flush する（updatedAt を最新にしてから返す）。
    return CalculationMapper.toResponse(repository.saveAndFlush(entity));
  }

  /**
   * 履歴 1 件を削除する（DELETE）。
   *
   * <p>LEARN: 無い id の削除を「成功扱い（204）」にする設計もありうるが、ここでは 404 にする。
   * どちらでもよいが<strong>決めて仕様に書く</strong>ことが大事。 曖昧なまま実装するとクライアントが困る。
   */
  @Transactional
  public void delete(Long id) {
    Calculation entity = mustFind(id);
    repository.delete(entity);
    System.out.printf("[4/5 保存] DELETE 完了: id=%s%n", id);
  }

  /**
   * id で引き、無ければ 404 用の例外にする。
   *
   * <p>LEARN: {@code findById} が返すのは {@link java.util.Optional}。「無いかもしれない」ことを 型で表している。{@code
   * orElseThrow} で「無い」を例外に変換するのが定石。
   */
  private Calculation mustFind(Long id) {
    return repository
        .findById(id)
        .orElseThrow(
            () -> {
              System.out.printf("[4/5 保存] SELECT したが見つからない: id=%s → 例外を投げる%n", id);
              return new ResourceNotFoundException("計算履歴が見つかりません: id=" + id);
            });
  }

  /** 四則演算の本体。結果は保存できる桁数に丸めてから返す。 */
  private BigDecimal compute(CalculationRequest req) {
    BigDecimal raw =
        switch (req.operator()) {
          case ADD -> req.left().add(req.right());
          case SUBTRACT -> req.left().subtract(req.right());
          case MULTIPLY -> req.left().multiply(req.right());
          case DIVIDE -> divide(req.left(), req.right());
        };
    // LEARN: DB のカラムに収まる桁に丸めてから保存する。表示のための末尾ゼロ落としは
    // CalculationMapper（DTO 境界）の仕事なので、ここではやらない。
    BigDecimal stored = raw.setScale(STORAGE_SCALE, RoundingMode.HALF_UP);
    System.out.printf("[3/5 業務] 結果 = %s%n", stored);
    return stored;
  }

  private BigDecimal divide(BigDecimal left, BigDecimal right) {
    // LEARN: 「形は正しいが計算できない」入力。400（入力エラー）ではなく 422 にする。
    if (right.signum() == 0) {
      // LEARN: ここで「422 を返せ」とは書かない。例外を投げるだけ。
      // どの番号にするかは GlobalExceptionHandler が一括で決める。この分担が要。
      System.out.printf("[3/5 業務] 0 除算 → 例外を投げる（番号はここで決めない）%n");
      throw new BusinessRuleException("0 で割ることはできません");
    }
    return left.divide(right, DIVISION_CONTEXT);
  }
}
