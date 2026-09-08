package com.example.taskapi.common.exception;

/**
 * 指定した ID のリソースが存在しない（または現在ユーザーのものではない）。
 *
 * <p>LEARN: 「他人のリソース」も存在秘匿のため同じ 404 にする。呼び出し側は「見つからない」しか分からない。
 */
public class ResourceNotFoundException extends RuntimeException {

  public ResourceNotFoundException(String resource, Object id) {
    super("%s(id=%s) が見つかりません".formatted(resource, id));
  }
}
