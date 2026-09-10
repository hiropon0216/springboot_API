package com.example.calc.calculation;

/**
 * 四則演算の種類。
 *
 * <p>LEARN: 「取りうる値が決まっている」ものは String ではなく enum にする。 リクエストで {@code "operator": "ADD"}
 * と送られた文字列は、Jackson が自動でこの enum に変換する。 定義に無い値({@code "PLUS"} など)は変換に失敗して 400 になる ({@code
 * ResponseEntityExceptionHandler} が壊れた JSON と同じ扱いで処理する)。
 */
public enum Operator {
  ADD,
  SUBTRACT,
  MULTIPLY,
  DIVIDE
}
