package com.example.taskapi.common.exception;

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
 * <p>LEARN: {@code ResponseEntityExceptionHandler} を継承すると、Spring MVC が投げる標準例外 (バリデーション、JSON
 * パース失敗、405 など)の ProblemDetail 化を再利用できる。ここで足すのは 業務例外のマッピングと、バリデーションエラーのフィールド別詳細だけ。
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

  private static final URI TYPE_NOT_FOUND = URI.create("urn:problem-type:resource-not-found");
  private static final URI TYPE_DUPLICATE = URI.create("urn:problem-type:duplicate-resource");
  private static final URI TYPE_BUSINESS_RULE = URI.create("urn:problem-type:business-rule");

  @ExceptionHandler(ResourceNotFoundException.class)
  ProblemDetail handleNotFound(ResourceNotFoundException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    pd.setTitle("リソースが見つかりません");
    pd.setType(TYPE_NOT_FOUND);
    return pd;
  }

  @ExceptionHandler(DuplicateResourceException.class)
  ProblemDetail handleDuplicate(DuplicateResourceException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    pd.setTitle("リソースの重複");
    pd.setType(TYPE_DUPLICATE);
    return pd;
  }

  @ExceptionHandler(BusinessRuleException.class)
  ProblemDetail handleBusinessRule(BusinessRuleException ex) {
    // 422。Spring 7 で UNPROCESSABLE_ENTITY は UNPROCESSABLE_CONTENT に改称された。
    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage());
    pd.setTitle("業務ルール違反");
    pd.setType(TYPE_BUSINESS_RULE);
    return pd;
  }

  /**
   * バリデーション違反(400)。フィールド名→メッセージの一覧を {@code errors} に載せる。
   *
   * <p>LEARN: 親クラスの同名メソッドをオーバーライドし、Spring が用意した ProblemDetail に プロパティを足してから返す。
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
