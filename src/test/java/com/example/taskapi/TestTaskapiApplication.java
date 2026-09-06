package com.example.taskapi;

import org.springframework.boot.SpringApplication;

/**
 * IDE から「Testcontainers 付きでローカル起動」するためのエントリポイント。
 *
 * <p>LEARN: 本番の {@link TaskapiApplication} をそのまま流用し、テスト用の PostgreSQL コンテナ設定を 足して起動する。compose.yaml
 * を使わずに手早く動かしたいときに便利。
 */
public class TestTaskapiApplication {

  public static void main(String[] args) {
    SpringApplication.from(TaskapiApplication::main)
        .with(TestcontainersConfiguration.class)
        .run(args);
  }
}
