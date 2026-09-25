package com.example.calc.calculation.dto;

import jakarta.validation.constraints.Size;

/**
 * メモだけを更新する入力（PATCH 用）。
 *
 * <p>LEARN: PUT と PATCH で入力の型を分けているのが要点。
 *
 * <ul>
 *   <li>PUT は「全置換」なので {@code CalculationRequest}（left / operator / right が全部必須）
 *   <li>PATCH は「部分更新」なので、触る項目だけを持つ専用の DTO
 * </ul>
 *
 * <p>LEARN: {@code memo} に {@code @NotNull} を付けていないので {@code {"memo": null}} を送れば
 * メモを消せる。「省略した」と「null を明示した」を区別したいなら {@code Optional} や JSON Merge Patch
 * まで踏み込むことになるが、学習用にはこの単純さで十分。
 *
 * <p>LEARN: {@code @Size(max = 200)} はエンティティの {@code @Column(length = 200)} と対応させる。 DB
 * の制約と入力検証がずれると 500（DB エラー）になる。400 で返すべき入力を 500 にしないための備え。
 */
public record MemoUpdateRequest(@Size(max = 200) String memo) {}
