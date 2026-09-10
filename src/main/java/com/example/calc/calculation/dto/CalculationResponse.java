package com.example.calc.calculation.dto;

import com.example.calc.calculation.Operator;
import java.math.BigDecimal;

/**
 * 計算の結果。
 *
 * <p>LEARN: 入力(left / operator / right)をそのまま返しつつ {@code result} を足している。 レスポンスの形は request と別 record
 * にする。今回はたまたま項目が似ているが、 「受け取ってよい項目」と「返してよい項目」は本来別物なので、クラスを分ける習慣にしておく。
 */
public record CalculationResponse(
    BigDecimal left, Operator operator, BigDecimal right, BigDecimal result) {}
