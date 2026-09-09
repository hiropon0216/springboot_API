package com.example.taskapi.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * ユーザー登録リクエスト DTO。
 *
 * <p>LEARN: Java record を DTO に使うと、フィールド宣言・コンストラクタ・getter・equals/hashCode/toString が
 * 自動生成される。イミュータブルなので API の入力型として安全。
 */
public record RegisterRequest(
    @Email(message = "有効なメールアドレス形式で入力してください") @NotBlank(message = "メールアドレスは必須です") String email,
    @NotBlank(message = "パスワードは必須です") @Size(min = 8, max = 72, message = "パスワードは8〜72文字で入力してください")
        String password,
    @NotBlank(message = "表示名は必須です") @Size(max = 100, message = "表示名は100文字以内で入力してください")
        String displayName) {}
