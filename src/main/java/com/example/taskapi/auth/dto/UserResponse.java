package com.example.taskapi.auth.dto;

import java.time.Instant;

/**
 * ユーザー情報レスポンス DTO。
 *
 * <p>LEARN: entity(User)をそのまま返すとパスワードハッシュなど内部情報が露出する。 DTO で必要なフィールドだけ選んで返す（アーキテクチャ不変条件 3 番）。
 */
public record UserResponse(
    Long id, String email, String displayName, String role, Instant createdAt) {}
