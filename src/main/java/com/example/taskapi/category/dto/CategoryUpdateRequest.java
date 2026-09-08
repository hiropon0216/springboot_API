package com.example.taskapi.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** カテゴリ更新の入力(全項目置き換え)。 */
public record CategoryUpdateRequest(
    @NotBlank @Size(max = 50) String name,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "color は #RRGGBB 形式で指定してください") String color) {}
