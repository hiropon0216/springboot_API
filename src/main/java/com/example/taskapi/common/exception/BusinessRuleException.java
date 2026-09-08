package com.example.taskapi.common.exception;

/** 形式は正しいが業務ルールに反する操作（例: 不正な状態遷移、他ユーザーのカテゴリ指定）。HTTP 422 に対応。 */
public class BusinessRuleException extends RuntimeException {

  public BusinessRuleException(String message) {
    super(message);
  }
}
