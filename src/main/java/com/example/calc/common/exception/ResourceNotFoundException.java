package com.example.calc.common.exception;

/**
 * 指定された id のリソースが存在しない。HTTP 404 に対応する。
 *
 * <p>LEARN: DB を持つと必ず必要になる例外。「URL の形は正しいが、そこに在るはずのものが無い」状態で、 入力エラー（400）でも業務ルール違反（422）でもない。
 *
 * <p>LEARN: 例外クラスを分ける目的は、{@code GlobalExceptionHandler} で HTTP ステータスに 1 対 1 で
 * 対応づけられるようにすること。Service は「無かった」という事実だけを投げ、番号は知らない。
 */
public class ResourceNotFoundException extends RuntimeException {

  public ResourceNotFoundException(String message) {
    super(message);
  }
}
