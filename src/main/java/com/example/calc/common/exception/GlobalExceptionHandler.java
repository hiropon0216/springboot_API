package com.example.calc.common.exception;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * すべてのエラー応答を RFC 9457（旧 RFC 7807）の {@link ProblemDetail} に統一する。
 *
 * <p>LEARN: エラーの「形」をここ 1 か所で決める。Controller や Service は例外を投げるだけで、 HTTP ステータスや JSON の組み立ては一切やらない。だから
 * Service を Web 以外から呼んでも壊れず、 エラー応答の仕様変更もこのファイルだけで済む。
 *
 * <p>LEARN: {@code ResponseEntityExceptionHandler} を継承すると、Spring MVC が投げる標準例外 （壊れた JSON、未対応の
 * Content-Type、enum に無い値、{@code /calculations/abc} のような型不一致）の 400 化 + ProblemDetail
 * 化を再利用できる。ここで足すのは業務例外と、入力不足のときのフィールド別詳細だけ。
 *
 * <p>このアプリが意図して返すエラーは 3 種類（＋ 想定外の 500）:
 *
 * <ul>
 *   <li>400 — 入力の形が壊れている（項目不足、数値でない、operator が enum に無い、桁数超過、page / size が範囲外）
 *   <li>404 — URL の形は正しいが、その id の履歴が存在しない
 *   <li>422 — 形は正しいが計算できない（0 で割った、結果が保存できる桁数を超えた）
 *   <li>500 — 想定していない例外（バグ）。これも ProblemDetail で返す
 * </ul>
 *
 * <p>LEARN: 3 つの線引きを言葉で言えるようにしておく。<strong>送り方が間違っている = 400 / 宛先が無い = 404 / 送り方は正しいが実行できない =
 * 422</strong>。
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

  private static final URI TYPE_BUSINESS_RULE = URI.create("urn:problem-type:business-rule");
  private static final URI TYPE_NOT_FOUND = URI.create("urn:problem-type:not-found");

  /**
   * 業務ルール違反 → 422。このアプリでは 0 除算のときだけ。
   *
   * <p>LEARN: {@code BusinessRuleException} を投げれば、あとはここが受けて 422 の ProblemDetail に変換する。
   */
  @ExceptionHandler(BusinessRuleException.class)
  ProblemDetail handleBusinessRule(BusinessRuleException ex) {
    // LEARN: 「形は正しいが実行できない」→ 422。入力の書き方は合っているので 400 ではない。
    // この判断こそが API の仕様であり、フレームワークではなく人間が決めるところ。
    System.out.printf("[5/5 応答] 422 で返す（形は正しいが実行できない）: %s%n", ex.getMessage());

    // LEARN: Spring 7 で UNPROCESSABLE_ENTITY は UNPROCESSABLE_CONTENT に改称された（値は 422 のまま）。
    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage());
    pd.setTitle("計算できません");
    pd.setType(TYPE_BUSINESS_RULE);
    return pd;
  }

  /**
   * リソースが存在しない → 404。
   *
   * <p>LEARN: DB を持つと必ず出てくる分岐。Service が {@code Optional.orElseThrow} で投げた例外が ここに届く。Controller には
   * {@code if (見つからない) return 404} のようなコードが 1 行も無い —— それが「エラー応答の一元化」の効果。
   *
   * <p>LEARN: 404 は「サーバーに問題がある」のではなく「クライアントが指した宛先が無い」。 だから 4xx（クライアントエラー）に属する。
   */
  @ExceptionHandler(ResourceNotFoundException.class)
  ProblemDetail handleNotFound(ResourceNotFoundException ex) {
    System.out.printf("[5/5 応答] 404 で返す（その id の履歴が無い）: %s%n", ex.getMessage());

    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    pd.setTitle("見つかりません");
    pd.setType(TYPE_NOT_FOUND);
    return pd;
  }

  /**
   * 【学習用】リクエストボディを読めなかった場合（400）。親クラスの処理に委譲するだけで、挙動は変えていない。
   *
   * <p>LEARN: 壊れた JSON や、enum に無い {@code operator}（{@code "PLUS"} など）はここに来る。 この時点では {@code
   * CalculationRequest} を組み立てることすらできていないので、 {@code [1/5 受信]} のログも出ない。「どのフィールドが悪いか」を返せないのはそのため。
   */
  @Override
  protected ResponseEntity<Object> handleHttpMessageNotReadable(
      HttpMessageNotReadableException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    System.out.printf("[5/5 応答] 400 で返す（入力を DTO にできなかった。内訳は出せない）%n");
    return super.handleHttpMessageNotReadable(ex, headers, status, request);
  }

  /**
   * バリデーション違反（400）。フィールド名 → メッセージの一覧を {@code errors} に載せる。
   *
   * <p>LEARN: 親クラスの同名メソッドをオーバーライドし、Spring が用意した ProblemDetail に プロパティを足してから返す。{@code left} / {@code
   * operator} / {@code right} / {@code memo} のどれが 悪いかがクライアントに分かる。
   */
  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    // LEARN: @Valid の検証に失敗した。Controller のメソッドは呼ばれてすらいない。
    // だから [2/5] 以降のログは出ない。関所が入口で止めた、ということ。
    ProblemDetail pd = ex.getBody();
    pd.setTitle("入力値が不正です");
    Map<String, String> errors = new LinkedHashMap<>();
    for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
      errors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
    }
    pd.setProperty("errors", errors);

    // LEARN: 「入力の形が違う」→ 400。どの項目が悪いかを errors で返すのが親切な API の条件。
    System.out.printf("[5/5 応答] 400 で返す（入力が不正）: %s%n", errors);
    return handleExceptionInternal(ex, pd, headers, status, request);
  }

  /**
   * クエリパラメータなど、メソッド引数に直接付けた制約の違反（400）。{@code ?size=1000} など。
   *
   * <p>LEARN: {@code @Valid @RequestBody} の違反は上の {@code MethodArgumentNotValidException}、
   * {@code @RequestParam @Max(100) int size} のような引数そのものへの制約違反はこちら （{@code
   * HandlerMethodValidationException}）に来る。入口は違っても、クライアントから見た 形（{@code errors} にパラメータ名 → 理由）は揃えておく。
   */
  @Override
  protected ResponseEntity<Object> handleHandlerMethodValidationException(
      HandlerMethodValidationException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    ProblemDetail pd = ex.getBody();
    pd.setTitle("入力値が不正です");
    Map<String, String> errors = new LinkedHashMap<>();
    for (ParameterValidationResult result : ex.getParameterValidationResults()) {
      String name = result.getMethodParameter().getParameterName();
      for (MessageSourceResolvable error : result.getResolvableErrors()) {
        errors.putIfAbsent(name, error.getDefaultMessage());
      }
    }
    pd.setProperty("errors", errors);

    System.out.printf("[5/5 応答] 400 で返す（パラメータが不正）: %s%n", errors);
    return handleExceptionInternal(ex, pd, headers, status, request);
  }

  /**
   * 想定していない例外 → 500。どのハンドラにも当てはまらなかった例外の最後の受け皿。
   *
   * <p>LEARN: これが無いと、500 だけ Spring Boot 既定の {@code {"timestamp", "status", "error", "path"}}
   * という別の形で返り、「エラーは ProblemDetail に統一」という約束が破れる。 クライアントは 1 種類の形だけを解釈すればよい、という状態を守る。
   *
   * <p>LEARN: {@code detail} には例外のメッセージを<strong>載せない</strong>。SQL やクラス名などの 内部情報が漏れるから。原因は
   * サーバーのログ（スタックトレース付き）にだけ残し、利用者には固定の文言を返す。
   *
   * <p>LEARN: {@code Exception.class} を受けても、Spring 標準の例外（壊れた JSON、405 など）は
   * 親クラスのより具体的なハンドラが先に選ばれるので、ここには来ない。
   */
  @ExceptionHandler(Exception.class)
  ProblemDetail handleUnexpected(Exception ex) {
    // LEARN: 学習ログ（System.out）ではなく、本番でも残るロガーで記録する。logger は親クラスが持っている。
    logger.error("想定していない例外で 500 を返します", ex);

    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "予期しないエラーが発生しました。時間をおいて再度お試しください。");
    pd.setTitle("サーバー内部エラー");
    return pd;
  }
}
