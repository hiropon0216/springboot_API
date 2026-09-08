package com.example.taskapi.category.dto;

import java.time.Instant;

/** カテゴリのレスポンス表現。エンティティとは別物にして、公開する項目を明示的に選ぶ。 */
public record CategoryResponse(
    Long id, String name, String color, Instant createdAt, Instant updatedAt) {}
