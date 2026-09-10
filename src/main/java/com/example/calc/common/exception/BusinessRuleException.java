package com.example.calc.common.exception;

/**
 * 形式は正しいが業務ルールに反する操作（例: 0 で割る）。HTTP 422 に対応する。
 *
 * <p>LEARN: 「入力の形が壊れている」(→ 400) と「形は正しいが実行できない」(→ 422) を分ける。 {@code
 * {"left":6,"operator":"DIVIDE","right":0}} は JSON としてもバリデーション的にも正しいが、 数学的に計算できない。これが 422。
 */
public class BusinessRuleException extends RuntimeException {

  public BusinessRuleException(String message) {
    super(message);
  }
}
