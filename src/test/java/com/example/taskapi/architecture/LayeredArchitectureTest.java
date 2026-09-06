package com.example.taskapi.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * 層の依存方向を CI で強制する。
 *
 * <p>LEARN: これらは Sprint 0 時点では config クラスしか無いので「素通り」するが、ルールを先に 置いておくことで、以降のスプリントで Controller が
 * Repository を直に呼ぶような違反を書いた瞬間に テストが落ちる。人にも Claude にも効くガードレール。
 *
 * <p>命名前提: 各 feature パッケージ({@code category}, {@code task} など)の中に {@code XxxController} / {@code
 * XxxService} / {@code XxxRepository} が並ぶ(package-by-feature)。
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
}
