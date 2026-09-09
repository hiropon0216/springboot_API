package com.example.taskapi.common;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * ページング結果の汎用ラッパー DTO。
 *
 * <p>LEARN: {@link Page} をそのままコントローラから返さない理由は2つ。
 *
 * <ol>
 *   <li>Spring Data の {@code Page} はシリアライズフィールドが多く、クライアントに余分な情報が漏れる。 また Spring Data
 *       のバージョン変更でフィールド名が変わりえる(APIの安定性が下がる)。
 *   <li>必要なフィールドだけを選んで DTO を定義することで、APIのコントラクトを明示できる。
 * </ol>
 *
 * <p>LEARN: {@code common} パッケージに置く理由: {@code PageResponse} はどのリソース(Task, Category 等)にも
 * 使えるジェネリクスクラス。feature パッケージを横断する共通処理なので {@code common} に置く(package-by-feature の例外)。
 *
 * @param <T> コンテンツの要素型（例: TaskResponse）
 */
public record PageResponse<T>(
    List<T> content, int page, int size, long totalElements, int totalPages) {

  /**
   * Spring Data の {@link Page} から変換するファクトリメソッド。
   *
   * <p>LEARN: static ファクトリメソッドをレコード内に定義することで、変換ロジックを1箇所に集約する。 コントローラは {@code
   * PageResponse.from(page)} と書くだけでよい。
   */
  public static <T> PageResponse<T> from(Page<T> page) {
    return new PageResponse<>(
        page.getContent(),
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages());
  }
}
