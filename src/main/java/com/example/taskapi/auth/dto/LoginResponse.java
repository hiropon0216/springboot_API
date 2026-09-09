package com.example.taskapi.auth.dto;

/**
 * ログイン成功レスポンス DTO。
 *
 * <p>LEARN: tokenType は常に "Bearer"。クライアントは Authorization: Bearer {accessToken} ヘッダに付ける。 expiresIn
 * はトークンの有効秒数で、クライアントが失効を事前判断するために使う。
 */
public record LoginResponse(String accessToken, String tokenType, long expiresIn) {}
