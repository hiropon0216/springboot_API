package com.example.calc.calculation.dto;

import com.example.calc.calculation.Operator;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * 計算 1 件のレスポンス。
 *
 * <p>LEARN: DB に保存するようになったので、レスポンスには「保存されたことの証拠」が増える:
 *
 * <ul>
 *   <li>{@code id} — この 1 件を指す URL（{@code /api/v1/calculations/12}）を作れる
 *   <li>{@code createdAt} / {@code updatedAt} — いつの記録か
 *   <li>{@code memo} — 後から PATCH で付けられる補足
 * </ul>
 *
 * <p>LEARN: エンティティ {@code Calculation} と項目はほぼ同じだが、それでも別の型にする。 同じにしておくと「DB のカラムを足した＝API
 * の契約が変わった」になり、外部に約束していない情報まで 漏れる。変換は {@code CalculationMapper} が 1 か所で行う。
 *
 * <p>LEARN: 時刻は {@link Instant}（UTC の一点）。JSON では {@code "2026-09-25T04:15:30.123456Z"} のような
 * ISO-8601 文字列になる。タイムゾーン付きの表示はクライアントの仕事、と割り切る。
 */
public record CalculationResponse(
    Long id,
    BigDecimal left,
    Operator operator,
    BigDecimal right,
    BigDecimal result,
    String memo,
    Instant createdAt,
    Instant updatedAt) {}
