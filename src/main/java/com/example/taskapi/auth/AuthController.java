package com.example.taskapi.auth;

import com.example.taskapi.auth.dto.LoginRequest;
import com.example.taskapi.auth.dto.LoginResponse;
import com.example.taskapi.auth.dto.RegisterRequest;
import com.example.taskapi.auth.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 認証エンドポイント。
 *
 * <p>LEARN: /api/v1/auth/** は SecurityConfig で permitAll() にしているため、 未認証リクエストでもアクセスできる。
 * それ以外のエンドポイントは JWT が必要。
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth", description = "ユーザー登録・ログイン")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  /** 新規ユーザーを登録する。201 Created + UserResponse を返す。 */
  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "ユーザー登録")
  public UserResponse register(@Valid @RequestBody RegisterRequest req) {
    return authService.register(req);
  }

  /** ログインしてアクセストークンを返す。200 OK + LoginResponse を返す。 */
  @PostMapping("/login")
  @Operation(summary = "ログイン")
  public LoginResponse login(@Valid @RequestBody LoginRequest req) {
    return authService.login(req);
  }
}
