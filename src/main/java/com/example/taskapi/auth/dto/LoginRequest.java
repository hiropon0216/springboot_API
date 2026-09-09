package com.example.taskapi.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** ログインリクエスト DTO。email と password のみ受け取る。 */
public record LoginRequest(
    @NotBlank(message = "メールアドレスは必須です") String email,
    @NotBlank(message = "パスワードは必須です") String password) {}
