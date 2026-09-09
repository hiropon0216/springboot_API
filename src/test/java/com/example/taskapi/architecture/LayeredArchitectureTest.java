package com.example.taskapi.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

/**
 * 層の依存方向を CI で強制する。
 *
 * <p>LEARN: これらは Sprint 0 時点では config クラスしか無いので「素通り」するが、ルールを先に 置いておくことで、以降のスプリントで Controller が
 * Repository を直に呼ぶような違反を書いた瞬間に テストが落ちる。人にも Claude にも効くガードレール。
 *
 * <p>命名前提: 各 feature パッケージ({@code category}, {@code task} など)の中に {@code XxxController} / {@code
 * XxxService} / {@code XxxRepository} が並ぶ(package-by-feature)。
 *
 * <p>LEARN: Sprint 3 でルールを強化した。追加したルールの意図:
 *
 * <ul>
 *   <li>{@code rest_controllers_have_controller_in_name}: {@code @RestController} は名前に Controller
 *       を含む クラスにだけ付与。誤って Service に付ける事故を防ぐ。
 *   <li>{@code services_are_transactional}: Service クラスはクラスレベルで {@code @Transactional} を持つ。
 *       トランザクション境界の一貫性を強制し、書き忘れを防ぐ。
 *   <li>{@code repositories_are_interfaces}: Repository はインターフェースのみ。Spring Data の設計に沿い、
 *       実装クラスを手で作ることを禁止する。
 * </ul>
 */
@AnalyzeClasses(
    packages = "com.example.taskapi",
    importOptions = ImportOption.DoNotIncludeTests.class)
class LayeredArchitectureTest {

  /** Controller は上位。Service / Repository から参照されてはいけない。 */
  @ArchTest
  static final ArchRule controllers_are_not_used_by_lower_layers =
      noClasses()
          .that()
          .haveSimpleNameEndingWith("Service")
          .or()
          .haveSimpleNameEndingWith("Repository")
          .should()
          .dependOnClassesThat()
          .haveSimpleNameEndingWith("Controller")
          .allowEmptyShould(true);

  /** Repository は最下層。Controller から直接触ってはいけない(必ず Service を経由する)。 */
  @ArchTest
  static final ArchRule controllers_do_not_touch_repositories_directly =
      noClasses()
          .that()
          .haveSimpleNameEndingWith("Controller")
          .should()
          .dependOnClassesThat()
          .haveSimpleNameEndingWith("Repository")
          .allowEmptyShould(true);

  /** feature パッケージ同士が循環依存してはいけない。 */
  @ArchTest
  static final ArchRule feature_packages_are_free_of_cycles =
      slices()
          .matching("com.example.taskapi.(*)..")
          .should()
          .beFreeOfCycles()
          .allowEmptyShould(true);

  /**
   * {@code @RestController} は名前に "Controller" を含むクラスにだけ付与できる。
   *
   * <p>LEARN: 命名規約をアーキテクチャルールとして固定する。 誤って Service に {@code @RestController} を付けると、Spring が
   * それをコントローラとして扱い、層の境界が崩れる。
   */
  @ArchTest
  static final ArchRule rest_controllers_have_controller_in_name =
      classes()
          .that()
          .areAnnotatedWith(RestController.class)
          .should()
          .haveSimpleNameContaining("Controller")
          .allowEmptyShould(true);

  /**
   * Service クラスはクラスレベルで {@code @Transactional} を持つこと。
   *
   * <p>LEARN: {@code @Transactional(readOnly = true)} をクラスレベルに置き、書き込みメソッドに {@code @Transactional}
   * を個別付与するパターン。 これによりすべての Service メソッドがトランザクション境界に包まれることが保証される。 ArchUnit でこれを強制することで「トランザクション漏れ」を
   * CI で検出できる。
   *
   * <p>除外: {@code JwtService} は JWT 生成・検証のみ行う純粋なユーティリティで、DB にアクセスしない。 トランザクションは不要なため {@code
   * doNotHaveSimpleName} で除外する。
   */
  @ArchTest
  static final ArchRule services_are_transactional =
      classes()
          .that()
          .haveSimpleNameEndingWith("Service")
          .and()
          .areNotInterfaces()
          .and()
          .doNotHaveSimpleName("JwtService")
          .should()
          .beAnnotatedWith(Transactional.class)
          .allowEmptyShould(true);

  /**
   * Repository はインターフェースのみ(クラス禁止)。
   *
   * <p>LEARN: Spring Data JPA は Repository インターフェースを実装クラスとして扱う。 手で実装クラスを作ると Spring Data の管理外になり、
   * トランザクションや遅延ロードが正しく機能しない危険がある。 このルールで「手書き Repository クラス」を CI で弾く。
   *
   * <p>LEARN: ArchUnit のルール: 「Repository 名を持つものはインターフェースであるべき」。 {@code
   * classes().should().beInterfaces()} で表現する。@Repository アノテーション付きのカスタム実装クラスは除外。
   */
  @ArchTest
  static final ArchRule repositories_are_interfaces =
      classes()
          .that()
          .haveSimpleNameEndingWith("Repository")
          .and()
          .areNotAnnotatedWith(Repository.class)
          .should()
          .beInterfaces()
          .allowEmptyShould(true);
}
