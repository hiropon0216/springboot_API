package com.example.calc.common.exception;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * すべてのエラー応答を RFC 7807 {@link ProblemDetail} に統一する。
 *
 * <p>LEARN: エラーの「形」をここ1か所で決める。Controller や Service は例外を投げるだけで、 HTTP ステータスや JSON の組み立ては一切やらない。だから
 * Service を Web 以外から呼んでも壊れず、 エラー応答の仕様変更もこのファイルだけで済む。
 *
 * <p>LEARN: {@code ResponseEntityExceptionHandler} を継承すると、Spring MVC が投げる標準例外 (壊れた JSON、未対応の
 * Content-Type、enum に無い値など)の 400 化 + ProblemDetail 化を再利用できる。 ここで足すのは業務例外(422)と、入力不足のときのフィールド別詳細だけ。
 *
 * <p>このアプリのエラーは実質 2 種類だけ:
 *
 * <ul>
 *   <li>400 — 入力の形が壊れている(項目不足、数値でない、operator が enum に無い)
 *   <li>422 — 形は正しいが計算できない(0 で割った)
 * </ul>
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

  private static final URI TYPE_BUSINESS_RULE = URI.create("urn:problem-type:business-rule");

  /**
   * 業務ルール違反 → 422。このアプリでは 0 除算のときだけ。
   *
   * <p>LEARN: {@code BusinessRuleException} を投げれば、あとはここが受けて 422 の ProblemDetail に変換する。
   */
  @ExceptionHandler(BusinessRuleException.class)
  ProblemDetail handleBusinessRule(BusinessRuleException ex) {
    // LEARN: Spring 7 で UNPROCESSABLE_ENTITY は UNPROCESSABLE_CONTENT に改称された(値は 422 のまま)。
    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage());
    pd.setTitle("計算できません");
    pd.setType(TYPE_BUSINESS_RULE);
    return pd;
  }

  /**
   * バリデーション違反(400)。フィールド名 → メッセージの一覧を {@code errors} に載せる。
   *
   * <p>LEARN: 親クラスの同名メソッドをオーバーライドし、Spring が用意した ProblemDetail に プロパティを足してから返す。{@code left} / {@code
   * operator} / {@code right} のどれが 欠けているかがクライアントに分かる。
   */
  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    ProblemDetail pd = ex.getBody();
    pd.setTitle("入力値が不正です");
    Map<String, String> errors = new LinkedHashMap<>();
    for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
      errors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
    }
    pd.setProperty("errors", errors);
    return handleExceptionInternal(ex, pd, headers, status, request);
  }
}
