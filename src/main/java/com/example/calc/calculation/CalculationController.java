package com.example.calc.calculation;

import com.example.calc.calculation.dto.CalculationRequest;
import com.example.calc.calculation.dto.CalculationResponse;
import com.example.calc.calculation.dto.MemoUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * 計算履歴リソースのエンドポイント。REST の基本 5 操作（一覧・取得・作成・置換・部分更新・削除）を 1 リソースで通す。
 *
 * <p>LEARN: Controller の仕事は「HTTP の通訳」。{@code @RequestBody} で JSON を DTO に、{@code @Valid} で
 * 検証し、Service に渡し、戻り値を JSON にして返す。計算も SQL も一切ここに書かない。
 *
 * <p>LEARN: URL の設計原則は「リソース（名詞・複数形）＋ HTTP メソッド（動詞）」。 {@code /api/v1/calculations} に対して:
 *
 * <table border="1">
 *   <caption>メソッドとステータスの対応</caption>
 *   <tr><th>操作</th><th>メソッド + パス</th><th>成功</th><th>意味</th></tr>
 *   <tr><td>一覧</td><td>GET /calculations</td><td>200</td><td>安全・冪等</td></tr>
 *   <tr><td>取得</td><td>GET /calculations/{id}</td><td>200 / 404</td><td>安全・冪等</td></tr>
 *   <tr><td>作成</td><td>POST /calculations</td><td>201 + Location</td><td>冪等でない（叩くたび増える）</td></tr>
 *   <tr><td>全置換</td><td>PUT /calculations/{id}</td><td>200 / 404</td><td>冪等</td></tr>
 *   <tr><td>部分更新</td><td>PATCH /calculations/{id}</td><td>200 / 404</td><td>冪等でなくてもよい</td></tr>
 *   <tr><td>削除</td><td>DELETE /calculations/{id}</td><td>204 / 404</td><td>冪等</td></tr>
 * </table>
 *
 * <p>LEARN: DB に保存するようになったので POST は 200 ではなく <strong>201 Created</strong> + {@code Location}
 * ヘッダになった。「新しいリソースが、この URL にできた」と伝えるのが 201 の役目。 計算するだけで何も残らなかった頃は 200 が正しかった。
 * <strong>ステータスコードは実装の都合ではなく、リソースに何が起きたかで決まる。</strong>
 */
@RestController
@RequestMapping("/api/v1/calculations")
@Tag(name = "Calculation", description = "四則演算と計算履歴")
public class CalculationController {

  private final CalculationService service;

  CalculationController(CalculationService service) {
    this.service = service;
  }

  /**
   * 計算して履歴に保存する。
   *
   * <p>LEARN: {@code ResponseEntity} を返すと、ステータスコードとヘッダを自分で決められる。 201 の作法は「Location ヘッダに、作られたリソースの
   * URL を入れる」。 クライアントは戻り値の body を待たずに、その URL を叩けば同じものを取得できる。
   */
  @PostMapping
  @Operation(summary = "計算して履歴に保存する", description = "left / operator / right を受け取り、計算結果を 1 件保存して返す")
  @ApiResponse(responseCode = "201", description = "作成成功（Location ヘッダに URL）")
  @ApiResponse(responseCode = "400", description = "入力不足 or 不正な operator or 桁数超過")
  @ApiResponse(responseCode = "422", description = "0 除算")
  public ResponseEntity<CalculationResponse> create(
      @Valid @RequestBody CalculationRequest request, UriComponentsBuilder uriBuilder) {
    // LEARN: ここに来た時点で @Valid の検証は通っている。検証に失敗していればこのメソッドは
    // 呼ばれず、GlobalExceptionHandler へ飛ぶ。
    System.out.printf("[2/5 入口] 検証済みの入力を受け取った → Service に渡す（計算式はここに書かない）%n");

    CalculationResponse response = service.create(request);

    // LEARN: URL を文字列連結で組まず UriComponentsBuilder に任せる。コンテキストパスや
    // ホスト名が変わっても壊れない（引数に宣言するだけで Spring が現在のリクエストから注入する）。
    URI location =
        uriBuilder.path("/api/v1/calculations/{id}").buildAndExpand(response.id()).toUri();

    System.out.printf("[5/5 応答] 201 で返す: Location=%s%n", location);
    return ResponseEntity.created(location).body(response);
  }

  /**
   * 履歴の一覧。
   *
   * <p>LEARN: {@code required = false} の {@code @RequestParam} が任意の絞り込み。 {@code ?operator=ADD}
   * を付けなければ全件。enum に無い値を送れば 400 になる。
   */
  @GetMapping
  @Operation(summary = "履歴を一覧する", description = "新しい順。operator を指定するとその演算子だけに絞り込む")
  @ApiResponse(responseCode = "200", description = "0 件でも 200 と空配列（404 にはしない）")
  @ApiResponse(responseCode = "400", description = "不正な operator")
  public List<CalculationResponse> list(@RequestParam(required = false) Operator operator) {
    System.out.printf("[2/5 入口] 一覧要求（operator=%s）%n", operator);
    List<CalculationResponse> responses = service.findAll(operator);

    // LEARN: 一覧が 0 件なのは「異常」ではないので 200 + 空配列。404 は「その URL
    // が指すリソースが無い」ときで、コレクション自体は存在している。
    System.out.printf("[5/5 応答] 200 で返す: %d 件%n", responses.size());
    return responses;
  }

  /**
   * 履歴 1 件を取得する。
   *
   * <p>LEARN: {@code @PathVariable} は URL の一部を引数として受け取る。{@code {id}} が {@code Long} に 変換できない（{@code
   * /calculations/abc}）場合は Spring が 400 にする。
   */
  @GetMapping("/{id}")
  @Operation(summary = "履歴 1 件を取得する")
  @ApiResponse(responseCode = "200", description = "取得成功")
  @ApiResponse(responseCode = "404", description = "その id の履歴が無い")
  public CalculationResponse get(@PathVariable Long id) {
    System.out.printf("[2/5 入口] 1 件要求: id=%s%n", id);
    CalculationResponse response = service.findById(id);
    System.out.printf("[5/5 応答] 200 で返す: %s%n", response);
    return response;
  }

  /**
   * 式を全置換して再計算する。
   *
   * <p>LEARN: PUT は全置換なので入力は POST と同じ {@code CalculationRequest}（3 項目必須）。 本文に無い {@code memo} は null
   * に戻る。これが「置き換え」の意味。 作成ではないので 201 ではなく 200。
   */
  @PutMapping("/{id}")
  @Operation(
      summary = "式を全置換して再計算する",
      description = "left / operator / right を全て置き換える。memo は null に戻る")
  @ApiResponse(responseCode = "200", description = "更新成功")
  @ApiResponse(responseCode = "400", description = "入力不足 or 不正な operator")
  @ApiResponse(responseCode = "404", description = "その id の履歴が無い")
  @ApiResponse(responseCode = "422", description = "0 除算")
  public CalculationResponse replace(
      @PathVariable Long id, @Valid @RequestBody CalculationRequest request) {
    System.out.printf("[2/5 入口] 全置換要求: id=%s%n", id);
    CalculationResponse response = service.replace(id, request);
    System.out.printf("[5/5 応答] 200 で返す: %s%n", response);
    return response;
  }

  /** メモだけを部分更新する。 */
  @PatchMapping("/{id}")
  @Operation(summary = "メモだけ部分更新する", description = "式は変更しないので再計算も起きない")
  @ApiResponse(responseCode = "200", description = "更新成功")
  @ApiResponse(responseCode = "400", description = "memo が 200 文字を超えた")
  @ApiResponse(responseCode = "404", description = "その id の履歴が無い")
  public CalculationResponse patchMemo(
      @PathVariable Long id, @Valid @RequestBody MemoUpdateRequest request) {
    System.out.printf("[2/5 入口] 部分更新要求: id=%s memo=%s%n", id, request.memo());
    CalculationResponse response = service.updateMemo(id, request);
    System.out.printf("[5/5 応答] 200 で返す: %s%n", response);
    return response;
  }

  /**
   * 履歴 1 件を削除する。
   *
   * <p>LEARN: 削除の成功は 204 No Content（返す中身が無い）。{@code ResponseEntity.noContent()} を 使うと body
   * を持たないレスポンスになる。「消したものを返す」設計もあるが、ここでは 204 に統一。
   */
  @DeleteMapping("/{id}")
  @Operation(summary = "履歴 1 件を削除する")
  @ApiResponse(responseCode = "204", description = "削除成功（body なし）")
  @ApiResponse(responseCode = "404", description = "その id の履歴が無い")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    System.out.printf("[2/5 入口] 削除要求: id=%s%n", id);
    service.delete(id);
    System.out.printf("[5/5 応答] 204 で返す（body なし）%n");
    return ResponseEntity.noContent().build();
  }
}
