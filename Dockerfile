# syntax=docker/dockerfile:1

# ============================================================
# Stage 1: ビルド
# LEARN: 依存解決とソースのコピーを分けると、ソースだけ変えたときに
# 依存レイヤ(重い)のキャッシュが効く。
# ============================================================
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Windows でチェックアウトすると実行ビットが落ちることがあるため付け直す。
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
# LEARN: イメージビルドの責務は「jar を作る」ことだけ。テスト・Spotless・Checkstyle・ArchUnit は
# CI の責務なので、ここではスキップしてビルドを速く・軽くする。
RUN ./mvnw -B -q clean package -DskipTests -Dcheckstyle.skip -Dspotless.check.skip

# LEARN: Spring Boot の実行可能 jar を「レイヤ」に分解する。依存 → ローダ →
# スナップショット依存 → アプリコード の順で変化頻度が上がるので、
# 変化の少ないものを下(先)のレイヤに置いてキャッシュを効かせる。
# --application-filename でアプリ jar 名を固定(既定は元の jar 名になる)。
RUN java -Djarmode=tools -jar target/*.jar extract --layers \
      --application-filename application.jar --destination extracted

# ============================================================
# Stage 2: 実行イメージ(JRE のみ、非 root)
# ============================================================
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring spring
USER spring:spring

# 変化頻度の低い順にコピー(下のレイヤほどキャッシュが効く)。
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
# extract --layers が生成する薄い jar。名前は固定で application.jar。
ENTRYPOINT ["java", "-jar", "application.jar"]
