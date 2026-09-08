package com.example.taskapi.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * カテゴリ作成の入力。
 *
 * <p>LEARN: 入力用 DTO は record にする。イミュータブルで、Bean Validation のアノテーションを
 * コンパクトに書ける。エンティティを直接受け取らないことで「クライアントが id や owner を詐称する」余地を消す。
 */
public record CategoryCreateRequest(
    @NotBlank @Size(max = 50) String name,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "color は #RRGGBB 形式で指定してください") String color) {}
