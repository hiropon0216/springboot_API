package com.example.calc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 計算 API のエントリポイント。
 *
 * <p>LEARN: {@code @SpringBootApplication} が付いたクラスのパッケージ(ここでは {@code com.example.calc}) 配下が、Bean
 * の自動スキャン対象になる。だから {@code calc} / {@code config} / {@code common} の {@code @RestController} /
 * {@code @Service} / {@code @Configuration} が拾われる。
 */
@SpringBootApplication
public class CalcApiApplication {

  public static void main(String[] args) {
    SpringApplication.run(CalcApiApplication.class, args);
  }
}
