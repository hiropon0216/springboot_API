package com.example.taskapi.user;

/**
 * 「今リクエストしているユーザー」を返す。
 *
 * <p>LEARN: Service 層はこのインターフェースにだけ依存する。Sprint 1 は認証が無いので固定ユーザーを返す 実装({@link
 * FixedCurrentUserProvider})を使い、Sprint 2 で SecurityContext から解決する実装に差し替える。 呼び出し側のコードは変えなくて済む。
 *
 * <p>このインターフェースを {@code common} でなく {@code user} パッケージに置くのは、{@code common} が 特定 feature
 * に依存しない葉であるべきだから(ArchUnit の循環チェックが効いている)。
 */
public interface CurrentUserProvider {

  User currentUser();

  default Long currentUserId() {
    return currentUser().getId();
  }
}
