package com.example.taskapi.task;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * {@link Task#applyStatus} の状態遷移ルールを、Spring を起動せず素の JUnit で確認する。
 *
 * <p>LEARN: ドメインのルールを entity のメソッドに閉じ込めておくと、こういう軽いテストで押さえられる。
 */
class TaskStatusTransitionTest {

  @Test
  void todoからdoneにするとcompletedAtが入る() {
    Task task = new Task();
    task.setStatus(TaskStatus.TODO);

    task.applyStatus(TaskStatus.DONE);

    assertThat(task.getStatus()).isEqualTo(TaskStatus.DONE);
    assertThat(task.getCompletedAt()).isNotNull();
  }

  @Test
  void doneからtodoに戻すとcompletedAtがnullに戻る() {
    Task task = new Task();
    task.applyStatus(TaskStatus.DONE);
    assertThat(task.getCompletedAt()).isNotNull();

    task.applyStatus(TaskStatus.TODO);

    assertThat(task.getStatus()).isEqualTo(TaskStatus.TODO);
    assertThat(task.getCompletedAt()).isNull();
  }

  @Test
  void done中にdoneを再指定してもcompletedAtは変わらない() {
    Task task = new Task();
    task.applyStatus(TaskStatus.DONE);
    var firstCompletedAt = task.getCompletedAt();

    task.applyStatus(TaskStatus.DONE);

    assertThat(task.getCompletedAt()).isEqualTo(firstCompletedAt);
  }

  @Test
  void todoからinProgressではcompletedAtは入らない() {
    Task task = new Task();

    task.applyStatus(TaskStatus.IN_PROGRESS);

    assertThat(task.getCompletedAt()).isNull();
  }
}
