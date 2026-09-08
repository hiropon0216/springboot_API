package com.example.taskapi.smoke;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.taskapi.user.Role;
import com.example.taskapi.user.User;
import com.example.taskapi.user.UserRepository;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("h2smoke")
class CrudFlowSmokeTest {

  @Autowired UserRepository users;

  @Value("${local.server.port}")
  int port;

  private final HttpClient client = HttpClient.newHttpClient();
  private final JsonMapper json = JsonMapper.builder().build();

  @BeforeEach
  void seedDevUser() {
    // FixedCurrentUserProvider が dev@example.com を引くので用意しておく。
    if (users.findByEmail("dev@example.com").isEmpty()) {
      User u = new User();
      u.setEmail("dev@example.com");
      u.setPassword("{noop}x");
      u.setDisplayName("Dev");
      u.setRole(Role.USER);
      users.save(u);
    }
  }

  @Test
  void カテゴリとタスクのCRUDが一通り動く() throws Exception {
    // --- カテゴリ一覧は最初は空 ---
    Res list = get("/api/v1/categories");
    assertThat(list.status).isEqualTo(200);
    assertThat(list.body.isArray()).isTrue();
    assertThat(list.body).isEmpty();

    // --- カテゴリ作成: 201 + Location ---
    Res created = send("POST", "/api/v1/categories", "{\"name\":\"仕事\",\"color\":\"#4C6EF5\"}");
    assertThat(created.status).isEqualTo(201);
    long categoryId = created.body.get("id").asLong();
    assertThat(created.location).isEqualTo("/api/v1/categories/" + categoryId);

    // --- 同名は 409 ---
    assertThat(send("POST", "/api/v1/categories", "{\"name\":\"仕事\"}").status).isEqualTo(409);

    // --- 名前が空なら 400 + フィールドエラー ---
    Res invalid = send("POST", "/api/v1/categories", "{\"name\":\"\"}");
    assertThat(invalid.status).isEqualTo(400);
    assertThat(invalid.body.at("/errors/name").isMissingNode()).isFalse();

    // --- タスク作成(カテゴリ指定): 201、レスポンスに category 要約 ---
    Res task =
        send(
            "POST",
            "/api/v1/tasks",
            "{\"title\":\"牛乳を買う\",\"categoryId\":" + categoryId + ",\"priority\":\"HIGH\"}");
    assertThat(task.status).isEqualTo(201);
    long taskId = task.body.get("id").asLong();
    assertThat(task.body.get("status").asString()).isEqualTo("TODO");
    assertThat(task.body.at("/category/name").asString()).isEqualTo("仕事");

    // --- 存在しない(=自分のでない)カテゴリ指定は 422 ---
    assertThat(send("POST", "/api/v1/tasks", "{\"title\":\"x\",\"categoryId\":999999}").status)
        .isEqualTo(422);

    // --- ステータス DONE で completedAt が入る ---
    Res done = send("PATCH", "/api/v1/tasks/" + taskId + "/status", "{\"status\":\"DONE\"}");
    assertThat(done.status).isEqualTo(200);
    assertThat(done.body.get("status").asString()).isEqualTo("DONE");
    assertThat(done.body.get("completedAt").isNull()).isFalse();

    // --- TODO に戻すと completedAt が消える ---
    Res back = send("PATCH", "/api/v1/tasks/" + taskId + "/status", "{\"status\":\"TODO\"}");
    assertThat(back.body.get("completedAt").isNull()).isTrue();

    // --- 一覧に出る ---
    Res tasks = get("/api/v1/tasks");
    assertThat(tasks.body).anySatisfy(n -> assertThat(n.get("id").asLong()).isEqualTo(taskId));

    // --- 存在しない ID は 404 ---
    assertThat(get("/api/v1/tasks/888888").status).isEqualTo(404);

    // --- カテゴリ削除: 204。タスクは残り、category は null になる ---
    assertThat(send("DELETE", "/api/v1/categories/" + categoryId, null).status).isEqualTo(204);

    Res afterDelete = get("/api/v1/tasks/" + taskId);
    assertThat(afterDelete.status).isEqualTo(200);
    assertThat(afterDelete.body.get("category").isNull()).isTrue();
  }

  private Res get(String path) throws IOException, InterruptedException {
    return send("GET", path, null);
  }

  private Res send(String method, String path, String body)
      throws IOException, InterruptedException {
    HttpRequest.Builder b =
        HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header("Content-Type", "application/json")
            .method(method, body == null ? BodyPublishers.noBody() : BodyPublishers.ofString(body));
    HttpResponse<String> res = client.send(b.build(), BodyHandlers.ofString());
    JsonNode node =
        (res.body() == null || res.body().isBlank())
            ? tools.jackson.databind.node.NullNode.getInstance()
            : json.readTree(res.body());
    return new Res(res.statusCode(), node, res.headers().firstValue("Location").orElse(null));
  }

  private record Res(int status, JsonNode body, String location) {}
}
