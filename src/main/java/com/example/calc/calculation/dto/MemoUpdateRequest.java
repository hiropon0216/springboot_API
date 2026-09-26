package com.example.calc.calculation.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import java.util.Map;

/**
 * メモだけを更新する入力（PATCH 用）。JSON Merge Patch（RFC 7396）の意味で解釈する。
 *
 * <p>LEARN: PUT と PATCH で入力の型を分けているのが要点。
 *
 * <ul>
 *   <li>PUT は「全置換」なので {@code CalculationRequest}（left / operator / right が全部必須）
 *   <li>PATCH は「部分更新」なので、触る項目だけを持つ専用の DTO
 * </ul>
 *
 * <p>LEARN: Merge Patch の規則は「<strong>書いた項目だけ変わる。null を書いたら消える</strong>」。 つまり 3 つの状態を区別しなければならない:
 *
 * <table border="1">
 *   <caption>送った JSON と、この DTO の中身</caption>
 *   <tr><th>送った JSON</th><th>{@code memoSpecified}</th><th>{@code memo}</th><th>意味</th></tr>
 *   <tr><td>{@code {}}</td><td>false</td><td>null</td><td>変更しない</td></tr>
 *   <tr><td>{@code {"memo": null}}</td><td>true</td><td>null</td><td>メモを消す</td></tr>
 *   <tr><td>{@code {"memo": "x"}}</td><td>true</td><td>"x"</td><td>メモを "x" にする</td></tr>
 * </table>
 *
 * <p>LEARN: {@code record MemoUpdateRequest(String memo)} だと「省略」と「null」がどちらも {@code null}
 * になり区別できない（Sprint 6 の不具合: {@code {}} を送るとメモが消えた）。{@code Optional<String>} も 試したが、Jackson 3
 * は項目が無いときも {@code Optional.empty()} を入れるので区別できなかった（テストで判明）。
 *
 * <p>LEARN: そこで JSON をいったん {@link Map} で受ける。Map は「キーが無い」（{@code containsKey} が false）と 「キーはあるが値が
 * null」を最初から区別できるので、Merge Patch の意味をそのまま写せる。 {@code @JsonCreator(mode = DELEGATING)} は「JSON
 * 全体をこのメソッドの引数 1 つに渡して、そこから組み立てる」という指定。
 *
 * <p>LEARN: {@code @Size(max = 200)} はエンティティの {@code @Column(length = 200)} と対応させる。 DB
 * の制約と入力検証がずれると 500（DB エラー）になる。400 で返すべき入力を 500 にしないための備え。
 *
 * @param memoSpecified JSON に {@code memo} のキーが書かれていたか（false なら変更しない）
 * @param memo 新しいメモ。{@code null} はメモを消す意味（{@code memoSpecified} が true のとき）
 */
public record MemoUpdateRequest(
    // LEARN: memoSpecified はサーバー内部の目印で、クライアントが送る項目ではない。
    // OpenAPI（Swagger UI）に載ると「送るべき項目」に見えてしまうので隠す。
    @Schema(hidden = true) boolean memoSpecified,
    @Schema(description = "新しいメモ。null でメモを消す。項目ごと省略すると変更しない", nullable = true) @Size(max = 200)
        String memo) {

  /** PATCH の本文（JSON オブジェクト）から組み立てる。知らないキーは無視する（寛容な受け手）。 */
  @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
  public static MemoUpdateRequest fromJson(Map<String, String> body) {
    return new MemoUpdateRequest(body.containsKey("memo"), body.get("memo"));
  }
}
