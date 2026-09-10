package com.example.calc.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.web.bind.annotation.RestController;

/**
 * 層の依存方向を CI で強制する。
 *
 * <p>LEARN: 今はエンドポイントが 1 本しか無いが、ルールを先に置いておくことで、 将来 Controller が Service を飛ばして何かを直に触るような違反を書いた瞬間に
 * テストが落ちる。人にも AI にも効くガードレール。
 *
 * <p>命名前提: feature パッケージ(今は {@code calculation})の中に {@code XxxController} / {@code XxxService}
 * が並ぶ(package-by-feature)。
 */
@AnalyzeClasses(packages = "com.example.calc", importOptions = ImportOption.DoNotIncludeTests.class)
class LayeredArchitectureTest {

  /** Controller は上位。Service から参照されてはいけない(依存は下向きの一方向)。 */
  @ArchTest
  static final ArchRule controllers_are_not_used_by_services =
      noClasses()
          .that()
          .haveSimpleNameEndingWith("Service")
          .should()
          .dependOnClassesThat()
          .haveSimpleNameEndingWith("Controller")
          .allowEmptyShould(true);

  /** feature パッケージ同士が循環依存してはいけない。 */
  @ArchTest
  static final ArchRule feature_packages_are_free_of_cycles =
      slices().matching("com.example.calc.(*)..").should().beFreeOfCycles().allowEmptyShould(true);

  /**
   * {@code @RestController} は名前に "Controller" を含むクラスにだけ付与できる。
   *
   * <p>LEARN: 誤って Service に {@code @RestController} を付けると、Spring がそれをコントローラとして扱い、
   * 層の境界が崩れる。命名規約をルールで固定する。
   */
  @ArchTest
  static final ArchRule rest_controllers_have_controller_in_name =
      classes()
          .that()
          .areAnnotatedWith(RestController.class)
          .should()
          .haveSimpleNameContaining("Controller")
          .allowEmptyShould(true);
}
