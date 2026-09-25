package com.example.calc.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import jakarta.persistence.Entity;
import org.springframework.web.bind.annotation.RestController;

/**
 * 層の依存方向を CI で強制する。
 *
 * <p>LEARN: DB が入って層が Controller → Service → Repository の 3 段になった。段が増えると 「Controller から Repository
 * を直接呼ぶ」近道を書きたくなるが、それを許すと業務ロジックが Controller に漏れ出し、トランザクション境界も曖昧になる。人にも AI にも効くガードレールとして 機械的に落とす。
 *
 * <p>命名前提: feature パッケージ（今は {@code calculation}）の中に {@code XxxController} / {@code XxxService} /
 * {@code XxxRepository} が並ぶ（package-by-feature）。
 */
@AnalyzeClasses(packages = "com.example.calc", importOptions = ImportOption.DoNotIncludeTests.class)
class LayeredArchitectureTest {

  /** Controller は上位。Service から参照されてはいけない（依存は下向きの一方向）。 */
  @ArchTest
  static final ArchRule controllers_are_not_used_by_services =
      noClasses()
          .that()
          .haveSimpleNameEndingWith("Service")
          .should()
          .dependOnClassesThat()
          .haveSimpleNameEndingWith("Controller")
          .allowEmptyShould(true);

  /**
   * Controller は Repository を直接触らない（必ず Service を経由する）。
   *
   * <p>LEARN: 不変条件 #1 の中核。これを許すと「1 行で済むから」と Controller から DB を叩き始め、 気づいたら業務ロジックが web
   * 層に散っている、という典型的な崩れ方をする。
   */
  @ArchTest
  static final ArchRule controllers_do_not_depend_on_repositories =
      noClasses()
          .that()
          .haveSimpleNameEndingWith("Controller")
          .should()
          .dependOnClassesThat()
          .haveSimpleNameEndingWith("Repository")
          .allowEmptyShould(true);

  /**
   * Repository は interface（Spring Data JPA が実装を生成する）。
   *
   * <p>LEARN: 自分で実装クラスを書き始めたら、それは Repository ではなく別の何か（Service か Adapter）。 名前と実体をずらさないためのルール。
   */
  @ArchTest
  static final ArchRule repositories_are_interfaces =
      classes()
          .that()
          .haveSimpleNameEndingWith("Repository")
          .should()
          .beInterfaces()
          .allowEmptyShould(true);

  /**
   * エンティティを Controller に登場させない（不変条件 #3）。
   *
   * <p>LEARN: 「DB の形」をそのまま API に出さないための機械的な歯止め。Controller が扱うのは DTO だけで、 エンティティ ↔ DTO の変換は Service
   * / Mapper の内側で完結する。
   */
  @ArchTest
  static final ArchRule entities_are_not_exposed_by_controllers =
      noClasses()
          .that()
          .haveSimpleNameEndingWith("Controller")
          .should()
          .dependOnClassesThat()
          .areAnnotatedWith(Entity.class)
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
