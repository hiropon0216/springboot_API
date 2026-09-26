package com.example.calc.learning;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * 学習アプリ（docs/learning）のコードへのリンクが切れていないことを確かめる。
 *
 * <p>LEARN: 教材は「実物を見ながら学ぶ」のが前提なので、コードを直したときにリンクが黙って壊れるのが一番困る。 章ファイルの {@code code("パス", "目印")}
 * をすべて拾い、ファイルが存在し、目印の文字列がその中にあることを検査する。 {@code ./mvnw verify} と CI で毎回走るので、リンクを壊す変更はビルドが赤くなって気づける。
 *
 * <p>LEARN: ブラウザ（file://）からはリポジトリのファイルを読めないので、「VS Code で開く」に使う行番号は {@code chapters/anchors.js}
 * に書き出しておく。このテストはその一覧が最新かどうかも見る。 古ければ次のコマンドで作り直す:
 *
 * <pre>./mvnw test -Dtest=LearningLinksTest -Dlearning.writeAnchors=true</pre>
 *
 * <p>目印の行の決め方: コメント以外の行を優先し、無ければコメント行（javadoc の表など）を使う。 コメントとみなすのは Java の * // /* と、YAML・Dockerfile
 * の #。
 */
class LearningLinksTest {

  private static final Path LEARNING = Path.of("docs", "learning");
  private static final Path CHAPTERS = LEARNING.resolve("chapters");
  private static final Path ANCHORS = CHAPTERS.resolve("anchors.js");

  /** code("path", "anchor" …) / code('path', 'anchor' …)。引数は文字列リテラルで書く約束。 */
  private static final Pattern CODE_CALL =
      Pattern.compile("\\bcode\\(\\s*(['\"])(.*?)\\1\\s*,\\s*(['\"])(.*?)\\3");

  /** コースごとの章ファイルの置き場所（chapters/ からの相対）。"" は REST API 編、"agile/" はアジャイル編（ADR 0010）。 */
  private static final List<String> COURSE_DIRS = List.of("", "agile/");

  private static final Pattern SCRIPT_TAG =
      Pattern.compile("<script src=\"chapters/((?:agile/)?ch\\d+\\.js)\"></script>");

  private record Ref(String chapterFile, String path, String anchor) {}

  @Test
  void 章ファイルのリンク先ファイルと目印がすべて実在する() throws IOException {
    List<String> errors = new ArrayList<>();
    for (Ref ref : collectRefs()) {
      Path file = Path.of(ref.path());
      if (ref.anchor().contains("\\")) {
        // LEARN: "…\"…" のようにエスケープすると、正規表現が目印を途中で切ってしまう。' で囲む約束（AUTHORING.md）。
        errors.add(ref.chapterFile() + ": 目印に \\ を使っている（' で囲んで書く）→ " + ref.anchor());
      } else if (!Files.isRegularFile(file)) {
        errors.add(ref.chapterFile() + ": ファイルが無い → " + ref.path());
      } else if (resolveLine(file, ref.anchor()) < 0) {
        errors.add(ref.chapterFile() + ": 目印が見つからない → " + ref.path() + " 「" + ref.anchor() + "」");
      }
    }
    assertThat(errors).as("学習アプリのリンク切れ").isEmpty();
  }

  @Test
  void 行番号の一覧anchors_jsが最新() throws IOException {
    String expected = renderAnchors();
    if (Boolean.getBoolean("learning.writeAnchors")) {
      Files.writeString(ANCHORS, expected, StandardCharsets.UTF_8);
    }
    String actual = Files.exists(ANCHORS) ? read(ANCHORS) : "";
    assertThat(normalize(actual))
        .as(
            "chapters/anchors.js が古い。次で作り直す: "
                + "./mvnw test -Dtest=LearningLinksTest -Dlearning.writeAnchors=true")
        .isEqualTo(normalize(expected));
  }

  @Test
  void index_htmlが読み込む章ファイルと実在する章ファイルが一致する() throws IOException {
    TreeSet<String> loaded = new TreeSet<>();
    Matcher m = SCRIPT_TAG.matcher(read(LEARNING.resolve("index.html")));
    while (m.find()) {
      loaded.add(m.group(1));
    }
    assertThat(loaded).as("index.html の <script src=chapters/chNN.js>").isEqualTo(chapterFiles());
  }

  // ===== 以下、補助 =====

  /** 章ファイルの一覧（chapters/ からの相対パス。例: ch01.js / agile/ch01.js）。 */
  private static TreeSet<String> chapterFiles() throws IOException {
    TreeSet<String> names = new TreeSet<>();
    for (String dir : COURSE_DIRS) {
      Path base = CHAPTERS.resolve(dir);
      if (!Files.isDirectory(base)) {
        continue;
      }
      try (Stream<Path> files = Files.list(base)) {
        files
            .map(p -> p.getFileName().toString())
            .filter(name -> name.matches("ch\\d+\\.js"))
            .forEach(name -> names.add(dir + name));
      }
    }
    return names;
  }

  private static List<Ref> collectRefs() throws IOException {
    List<Ref> refs = new ArrayList<>();
    for (String name : chapterFiles()) {
      Matcher m = CODE_CALL.matcher(read(CHAPTERS.resolve(name)));
      while (m.find()) {
        refs.add(new Ref(name, m.group(2), m.group(4)));
      }
    }
    return refs;
  }

  /** 目印の行番号（1 始まり）。見つからなければ -1。 */
  private static int resolveLine(Path file, String anchor) throws IOException {
    List<String> lines = read(file).lines().toList();
    int firstAny = -1;
    for (int i = 0; i < lines.size(); i++) {
      String line = lines.get(i);
      if (!line.contains(anchor)) {
        continue;
      }
      if (firstAny < 0) {
        firstAny = i + 1;
      }
      if (!isComment(file, line)) {
        return i + 1;
      }
    }
    return firstAny;
  }

  /** コメント行か。Java は * // /*、YAML と Dockerfile は #（Markdown の # は見出しなので対象外）。 */
  private static boolean isComment(Path file, String line) {
    String name = file.getFileName().toString();
    String t = line.strip();
    if (name.endsWith(".java")) {
      return t.startsWith("*") || t.startsWith("//") || t.startsWith("/*");
    }
    if (name.endsWith(".yml") || name.endsWith(".yaml") || name.equals("Dockerfile")) {
      return t.startsWith("#");
    }
    return false;
  }

  private static String renderAnchors() throws IOException {
    Map<String, Integer> lines = new TreeMap<>();
    for (Ref ref : collectRefs()) {
      Path file = Path.of(ref.path());
      if (Files.isRegularFile(file)) {
        int line = resolveLine(file, ref.anchor());
        if (line > 0) {
          lines.put(ref.path() + "#" + ref.anchor(), line);
        }
      }
    }
    StringBuilder sb = new StringBuilder();
    sb.append("// 自動生成（LearningLinksTest）。手で編集しない。\n");
    sb.append("// 更新: ./mvnw test -Dtest=LearningLinksTest -Dlearning.writeAnchors=true\n");
    sb.append("window.CALC_ANCHORS = {\n");
    lines.forEach(
        (key, line) ->
            sb.append("  \"")
                .append(key.replace("\\", "\\\\").replace("\"", "\\\""))
                .append("\": ")
                .append(line)
                .append(",\n"));
    sb.append("};\n");
    return sb.toString();
  }

  private static String read(Path p) throws IOException {
    return Files.readString(p, StandardCharsets.UTF_8);
  }

  /** Windows の改行（CRLF）で取り出されても比較できるようにそろえる。 */
  private static String normalize(String s) {
    return s.replace("\r\n", "\n");
  }
}
