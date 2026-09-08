package com.example.taskapi.common.exception;

/** 一意制約に反するリソースを作ろうとした（例: 同名カテゴリ）。HTTP 409 に対応。 */
public class DuplicateResourceException extends RuntimeException {

  public DuplicateResourceException(String message) {
    super(message);
  }
}
