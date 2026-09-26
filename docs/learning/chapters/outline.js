// 全 26 章の目次（ADR 0009）。本文がまだ無い章は「準備中」として表示される。
// kind: "impl" = 実装を見ながら学ぶ / "lecture" = 座学（実装に無い知識を実例で）/ "mixed" = 両方 / "summary" = まとめ
window.CALC_OUTLINE = [
  { part: 1, partTitle: "前提をそろえる" },
  { no: 1, title: "API・HTTP・JSON", kind: "impl" },
  { no: 2, title: "Spring Boot の役割と DI", kind: "impl" },
  { no: 3, title: "最低限のアノテーション地図", kind: "impl" },
  { no: 4, title: "1 リクエストの旅：全体の地図", kind: "impl" },

  { part: 2, partTitle: "外側の設計（契約）" },
  { no: 5, title: "リソース設計：URL・メソッド・ステータス", kind: "impl" },
  { no: 6, title: "エラー設計：ProblemDetail", kind: "impl" },
  { no: 7, title: "一覧と部分更新：ページング・Merge Patch", kind: "impl" },
  { no: 8, title: "OpenAPI：API の契約書", kind: "mixed" },
  { no: 9, title: "ブラウザからの呼び出し：CORS・バージョニング", kind: "impl" },

  { part: 3, partTitle: "内側の構造" },
  { no: 10, title: "層と依存方向", kind: "impl" },
  { no: 11, title: "境界の型：DTO・エンティティ・Mapper", kind: "impl" },
  { no: 12, title: "トランザクション", kind: "impl" },
  { no: 13, title: "外部 API を呼ぶ", kind: "lecture" },

  { part: 4, partTitle: "データベース" },
  { no: 14, title: "DB のつなぎ方の基本", kind: "impl" },
  { no: 15, title: "ORM と JPA", kind: "impl" },
  { no: 16, title: "スキーマ管理：ddl-auto と Flyway", kind: "mixed" },
  { no: 17, title: "リレーションと N+1・インデックス", kind: "lecture" },

  { part: 5, partTitle: "セキュリティ" },
  { no: 18, title: "認証・認可", kind: "lecture" },
  { no: 19, title: "API セキュリティの基本", kind: "lecture" },

  { part: 6, partTitle: "品質と配達" },
  { no: 20, title: "テスト戦略", kind: "impl" },
  { no: 21, title: "ガードレール", kind: "impl" },
  { no: 22, title: "Docker", kind: "impl" },
  { no: 23, title: "CI/CD", kind: "impl" },
  { no: 24, title: "設定と運用・可観測性", kind: "mixed" },

  { part: 7, partTitle: "AI 駆動と、この先" },
  { no: 25, title: "AI 駆動開発の回し方", kind: "impl" },
  { no: 26, title: "総まとめ：全体の地図と、次に学ぶこと", kind: "summary" }
];
