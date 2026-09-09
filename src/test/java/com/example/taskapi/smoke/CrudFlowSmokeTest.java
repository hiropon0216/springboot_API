package com.example.taskapi.smoke;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Docker 無しで「Controller → Service → Repository → DB」を1本通すスモークテスト。
 *
 * <p>LEARN: 本番相当の統合テスト(実 PostgreSQL / Testcontainers)は別途あるが、Docker が使えない環境でも "とりあえず全レイヤが 繋がって動く"
 * ことを確認できるよう、PostgreSQL 互換モードの H2 で流す。HTTP クライアントは JDK 標準の {@link HttpClient}(PATCH
 * も扱える)。1メソッドにシナリオをまとめ、順序依存を明示している。
 *
 * <p>LEARN: Sprint 2 から JWT 認証が必要。BeforeEach でユーザー登録 → ログイン → トークン取得を行い、 各リクエストに Authorization:
 * Bearer ヘッダを付ける。これで SecurityCurrentUserProvider が機能する。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("h2smoke")
class CrudFlowSmokeTest {

  @Value("${local.server.port}")
  int port;

  private final HttpClient client = HttpClient.newHttpClient();
  private final JsonMapper json = JsonMapper.builder().build();

  // LEARN: テスト用のユーザー情報。毎回ランダムにしてもよいが固定で十分。
  private static final String TEST_EMAIL = "smoke@example.com";
  private static final String TEST_PASSWORD = "smoke-password-123";
  private static final String TEST_DISPLAY_NAME = "Smoke User";

  private String bearerToken;

  @BeforeEach
  void registerAndLogin() throws Exception {
    // LEARN: @BeforeEach で毎回登録を試みる。H2 は create-drop なのでテストごとにクリーンだが、
    // 同一テスト実行内で複数のテストメソッドがある場合は2回目の登録で 409 が返ることもある。
    // ここでは登録失敗(409)を無視してログインに進む。
    send(
        "POST",
        "/api/v1/auth/register",
        null,
        """
        {"email":"%s","password":"%s","displayName":"%s"}
        """
            .formatted(TEST_EMAIL, TEST_PASSWORD, TEST_DISPLAY_NAME));

    // ログインしてトークンを取得
    bearerToken = loginAndGetToken(TEST_EMAIL, TEST_PASSWORD);
    assertThat(bearerToken).isNotBlank();
  }

  /**
   * Sprint 2 受け入れ基準: トークンなしで保護エンドポイントを呼ぶと 401。
   *
   * <p>LEARN: Authorization ヘッダを付けずにリクエストすると、Spring Security の oauth2ResourceServer フィルターが 401
   * を返す。ProblemDetail 形式かは確認済み (GlobalExceptionHandler とは別に Security フィルター層が返すが仕様上許容)。
   */
  @Test
  void トークンなしで保護エンドポイントを呼ぶと401() throws Exception {
    // token = null で送る(Authorization ヘッダなし)
    Res res = send("GET", "/api/v1/tasks", null, null);
    assertThat(res.status).isEqualTo(401);
  }

  /**
   * Sprint 2 受け入れ基準: ユーザー A のトークンでユーザー B のリソースを GET すると 404。
   *
   * <p>LEARN: 存在秘匿(Security through obscurity ではなく意図的な設計)として、 他人のリソースには 403 ではなく 404 を返す。
   * 攻撃者に「存在するが権限がない」情報を与えない。 TaskService#findOwned は findByIdAndOwnerId(id, currentUserId) を使うので、
   * 他人の id を指定しても「見つからない」として ResourceNotFoundException → 404 になる。
   */
  @Test
  void 他人のリソースへのアクセスは404() throws Exception {
    // ユーザー B を登録してタスクを作成
    String userBEmail = "userB-smoke@example.com";
    String userBPassword = "userB-password-123";
    send(
        "POST",
        "/api/v1/auth/register",
        null,
        """
        {"email":"%s","password":"%s","displayName":"User B"}
        """
            .formatted(userBEmail, userBPassword));
    String tokenB = loginAndGetToken(userBEmail, userBPassword);

    // ユーザー B でタスク作成
    Res taskB = send("POST", "/api/v1/tasks", tokenB, "{\"title\":\"B のタスク\"}");
    assertThat(taskB.status).isEqualTo(201);
    long taskBId = taskB.body.get("id").asLong();

    // ユーザー A(bearerToken)でユーザー B のタスクを取得 → 404
    Res res = send("GET", "/api/v1/tasks/" + taskBId, bearerToken, null);
    assertThat(res.status).isEqualTo(404);
  }

  @Test
  void カテゴリとタスクのCRUDが一通り動く() throws Exception {
    // --- カテゴリ一覧は最初は空 ---
    Res list = get("/api/v1/categories");
    assertThat(list.status).isEqualTo(200);
    assertThat(list.body.isArray()).isTrue();
    assertThat(list.body).isEmpty();

    // --- カテゴリ作成: 201 + Location ---
    Res created =
        send("POST", "/api/v1/categories", bearerToken, "{\"name\":\"仕事\",\"color\":\"#4C6EF5\"}");
    assertThat(created.status).isEqualTo(201);
    long categoryId = created.body.get("id").asLong();
    assertThat(created.location).isEqualTo("/api/v1/categories/" + categoryId);

    // --- 同名は 409 ---
    assertThat(send("POST", "/api/v1/categories", bearerToken, "{\"name\":\"仕事\"}").status)
        .isEqualTo(409);

    // --- 名前が空なら 400 + フィールドエラー ---
    Res invalid = send("POST", "/api/v1/categories", bearerToken, "{\"name\":\"\"}");
    assertThat(invalid.status).isEqualTo(400);
    assertThat(invalid.body.at("/errors/name").isMissingNode()).isFalse();

    // --- タスク作成(カテゴリ指定): 201、レスポンスに category 要約 ---
    Res task =
        send(
            "POST",
            "/api/v1/tasks",
            bearerToken,
            "{\"title\":\"牛乳を買う\",\"categoryId\":" + categoryId + ",\"priority\":\"HIGH\"}");
    assertThat(task.status).isEqualTo(201);
    long taskId = task.body.get("id").asLong();
    assertThat(task.body.get("status").asString()).isEqualTo("TODO");
    assertThat(task.body.at("/category/name").asString()).isEqualTo("仕事");

    // --- 存在しない(=自分のでない)カテゴリ指定は 422 ---
    assertThat(
            send("POST", "/api/v1/tasks", bearerToken, "{\"title\":\"x\",\"categoryId\":999999}")
                .status)
        .isEqualTo(422);

    // --- ステータス DONE で completedAt が入る ---
    Res done =
        send("PATCH", "/api/v1/tasks/" + taskId + "/status", bearerToken, "{\"status\":\"DONE\"}");
    assertThat(done.status).isEqualTo(200);
    assertThat(done.body.get("status").asString()).isEqualTo("DONE");
    assertThat(done.body.get("completedAt").isNull()).isFalse();

    // --- TODO に戻すと completedAt が消える ---
    Res back =
        send("PATCH", "/api/v1/tasks/" + taskId + "/status", bearerToken, "{\"status\":\"TODO\"}");
    assertThat(back.body.get("completedAt").isNull()).isTrue();

    // --- 一覧に出る(ページングレスポンス: content / totalElements フィールドを確認) ---
    // LEARN: Sprint 3 から GET /tasks は PageResponse 形式を返す。
    // content 配列と totalElements フィールドが必須。
    Res tasks = get("/api/v1/tasks");
    assertThat(tasks.body.has("content")).isTrue();
    assertThat(tasks.body.has("totalElements")).isTrue();
    assertThat(tasks.body.get("content").isArray()).isTrue();
    assertThat(tasks.body.get("content"))
        .anySatisfy(n -> assertThat(n.get("id").asLong()).isEqualTo(taskId));

    // --- ページングパラメータ付き: size=5&page=0 でも content / totalElements が返る ---
    Res paged = get("/api/v1/tasks?size=5&page=0");
    assertThat(paged.status).isEqualTo(200);
    assertThat(paged.body.has("content")).isTrue();
    assertThat(paged.body.has("totalElements")).isTrue();
    assertThat(paged.body.get("size").asInt()).isEqualTo(5);

    // --- status=TODO フィルタ: DONE にする前のタスクが絞り込まれる ---
    // (この時点では back = TODO に戻したので1件ヒットするはず)
    Res filtered = get("/api/v1/tasks?status=TODO");
    assertThat(filtered.status).isEqualTo(200);
    assertThat(filtered.body.get("content").isArray()).isTrue();
    assertThat(filtered.body.get("content"))
        .anySatisfy(n -> assertThat(n.get("status").asText()).isEqualTo("TODO"));

    // --- 存在しない ID は 404 ---
    assertThat(get("/api/v1/tasks/888888").status).isEqualTo(404);

    // --- カテゴリ削除: 204。タスクは残り、category は null になる ---
    assertThat(send("DELETE", "/api/v1/categories/" + categoryId, bearerToken, null).status)
        .isEqualTo(204);

    Res afterDelete = get("/api/v1/tasks/" + taskId);
    assertThat(afterDelete.status).isEqualTo(200);
    assertThat(afterDelete.body.get("category").isNull()).isTrue();
  }

  /**
   * ログインして JWT アクセストークンを返すヘルパー。
   *
   * <p>LEARN: POST /api/v1/auth/login → 200 + {"accessToken": "...", "tokenType": "Bearer", ...}
   */
  private String loginAndGetToken(String email, String password) throws Exception {
    Res res =
        send(
            "POST",
            "/api/v1/auth/login",
            null,
            """
            {"email":"%s","password":"%s"}
            """
                .formatted(email, password));
    assertThat(res.status).isEqualTo(200);
    return res.body.get("accessToken").asText();
  }

  private Res get(String path) throws IOException, InterruptedException {
    return send("GET", path, bearerToken, null);
  }

  private Res send(String method, String path, String token, String body)
      throws IOException, InterruptedException {
    HttpRequest.Builder b =
        HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header("Content-Type", "application/json")
            .method(method, body == null ? BodyPublishers.noBody() : BodyPublishers.ofString(body));

    // LEARN: 認証が必要なリクエストには Authorization: Bearer {token} ヘッダを付ける。
    // /api/v1/auth/** は permitAll() なのでトークン不要。
    if (token != null) {
      b.header("Authorization", "Bearer " + token);
    }

    HttpResponse<String> res = client.send(b.build(), BodyHandlers.ofString());
    JsonNode node =
        (res.body() == null || res.body().isBlank())
            ? tools.jackson.databind.node.NullNode.getInstance()
            : json.readTree(res.body());
    return new Res(res.statusCode(), node, res.headers().firstValue("Location").orElse(null));
  }

  private record Res(int status, JsonNode body, String location) {}
}
