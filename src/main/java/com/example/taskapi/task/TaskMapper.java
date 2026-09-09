package com.example.taskapi.task;

import com.example.taskapi.category.Category;
import com.example.taskapi.task.dto.TaskCreateRequest;
import com.example.taskapi.task.dto.TaskResponse;
import com.example.taskapi.task.dto.TaskResponse.CategorySummary;
import com.example.taskapi.task.dto.TaskUpdateRequest;
import com.example.taskapi.user.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * タスク DTO ↔ エンティティの変換。MapStruct によりコンパイル時に実装が自動生成される。
 *
 * <p>LEARN: {@code @Mapper(componentModel = "spring")} を付けると、MapStruct が生成する実装クラス ({@code
 * TaskMapperImpl})に {@code @Component} が付く。Spring がこれを Bean として管理するので、 他の Bean から通常通り
 * {@code @Autowired} / コンストラクタ注入で使える。
 *
 * <p>LEARN: MapStruct vs 手書きマッパー(CategoryMapper と比較):
 *
 * <ul>
 *   <li>手書き(CategoryMapper): コードが直感的でデバッグしやすい。項目が増えると退屈なボイラープレートが増える。
 *   <li>MapStruct: フィールド名が一致する場合は {@code @Mapping} 不要で自動マッピング。定型コードが激減する。
 *       ただしマッピング規則がアノテーションに散らばり、複雑なロジックは表現しにくい。 コンパイル時にエラーになる(実行時でなく)ので安全。
 * </ul>
 *
 * <p>詳細な比較は docs/adr/0005-mapstruct-vs-manual-mapper.md を参照。
 */
@Mapper(componentModel = "spring")
public interface TaskMapper {

  /**
   * Task エンティティ → TaskResponse DTO。
   *
   * <p>LEARN: {@code @Mapping(target = "category", source = "category")} は CategorySummary への 変換を
   * MapStruct に委譲する。{@link #toSummary(Category)} がその変換を担う。 MapStruct
   * はメソッドシグネチャを見てどの変換メソッドを呼ぶか自動で解決する。
   */
  @Mapping(target = "category", source = "category")
  TaskResponse toResponse(Task task);

  /**
   * Category エンティティ → CategorySummary DTO。
   *
   * <p>LEARN: null が渡されると MapStruct は null を返す(NPE にならない)。 Task.category が null(未分類)のケースを自動で処理できる。
   */
  CategorySummary toSummary(Category category);

  // LEARN: エンティティへの詰め替えは手動(デフォルトメソッド)で実装する。
  // owner や status の業務ルール(新規は必ず TODO、owner は currentUser)があるため、
  // MapStruct の自動マッピングに委ねると「誰でも owner を書き換えられる」バグが生じる危険がある。
  // MapStruct の責務は「単純なフィールドコピー」。業務ルールは Service/Mapper に置く。

  /** リクエスト DTO → Task エンティティ。owner と category は解決済みのものを渡す。 */
  default Task toEntity(TaskCreateRequest req, User owner, Category category) {
    Task t = new Task();
    t.setTitle(req.title());
    t.setDescription(req.description());
    t.setPriority(req.priority());
    t.setDueDate(req.dueDate());
    t.setCategory(category);
    t.setOwner(owner);
    // LEARN: status は entity 側の初期値(TODO)のまま。DTO からは受け取らない。
    return t;
  }

  /** 更新リクエストをエンティティに適用。category は解決済みのものを渡す。 */
  default void applyUpdate(Task task, TaskUpdateRequest req, Category category) {
    task.setTitle(req.title());
    task.setDescription(req.description());
    task.setPriority(req.priority());
    task.setDueDate(req.dueDate());
    task.setCategory(category);
  }
}
