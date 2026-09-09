package com.example.taskapi.common.exception;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * すべてのエラー応答を RFC 7807 {@link ProblemDetail} に統一する。
 *
 * <p>LEARN: {@code ResponseEntityExceptionHandler} を継承すると、Spring MVC が投げる標準例外 (バリデーション、JSON
 * パース失敗、405 など)の ProblemDetail 化を再利用できる。ここで足すのは 業務例外のマッピングと、バリデーションエラーのフィールド別詳細だけ。
 *
 * <p>LEARN: Sprint 3 で追加した例外ハンドラ:
 *
 * <ul>
 *   <li>{@link MethodArgumentTypeMismatchException}: 不正な enum 値、型変換失敗 → 400
 *   <li>{@link InvalidDataAccessApiUsageException}: 不正な sort プロパティ名 → 400(Spring Data が throw)
 * </ul>
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

  private static final URI TYPE_NOT_FOUND = URI.create("urn:problem-type:resource-not-found");
  private static final URI TYPE_DUPLICATE = URI.create("urn:problem-type:duplicate-resource");
  private static final URI TYPE_BUSINESS_RULE = URI.create("urn:problem-type:business-rule");
  private static final URI TYPE_UNAUTHORIZED = URI.create("urn:problem-type:unauthorized");
  private static final URI TYPE_BAD_REQUEST = URI.create("urn:problem-type:bad-request");

  /**
   * ログイン失敗(401)。
   *
   * <p>LEARN: BadCredentialsException は Spring Security の標準例外。email・パスワード不一致のいずれでも 同じ 401
   * を返すことで、どちらが間違っているかを攻撃者に教えない(存在秘匿)。
   */
  @ExceptionHandler(BadCredentialsException.class)
  ProblemDetail handleBadCredentials(BadCredentialsException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
    pd.setTitle("認証に失敗しました");
    pd.setType(TYPE_UNAUTHORIZED);
    return pd;
  }

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
   * 型変換失敗 → 400(Sprint 3 追加)。
   *
   * <p>LEARN: {@link MethodArgumentTypeMismatchException} は、クエリパラメータや PathVariable の 型変換失敗時に発生する。
   * 代表的なケース: {@code ?status=INVALID_ENUM} で TaskStatus への変換失敗。 Spring MVC が自動で投げるが、デフォルトのハンドラが
   * ProblemDetail を返さないことがあるため明示的に処理する。
   */
  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
    String detail = "パラメータ '%s' の値 '%s' が不正です".formatted(ex.getName(), ex.getValue());
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    pd.setTitle("不正なパラメータ");
    pd.setType(TYPE_BAD_REQUEST);
    return pd;
  }

  /**
   * 不正な sort プロパティ名 → 400(Sprint 3 追加)。
   *
   * <p>LEARN: {@code ?sort=invalidColumn,asc} のように存在しないフィールド名でソートすると、 Spring Data が {@link
   * InvalidDataAccessApiUsageException} を投げる。 これを 400 にマッピングしてクライアントに分かりやすいエラーを返す。
   */
  @ExceptionHandler(InvalidDataAccessApiUsageException.class)
  ProblemDetail handleInvalidDataAccess(InvalidDataAccessApiUsageException ex) {
    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST, "不正なクエリパラメータです: " + ex.getMessage());
    pd.setTitle("不正なクエリ");
    pd.setType(TYPE_BAD_REQUEST);
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
