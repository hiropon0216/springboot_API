# ADR 0005: MapStruct vs 手書きマッパー

- 日付: 2026-09-09
- ステータス: 採用（Task マッパーのみ）
- 対象スプリント: Sprint 3

## コンテキスト

Sprint 1 で `CategoryMapper` を手書きで実装した。Sprint 3 で `TaskMapper` を MapStruct に移行し、両アプローチを比較した。

## 比較

### 手書きマッパー（CategoryMapper）

```java
@Component
public class CategoryMapper {
  CategoryResponse toResponse(Category c) {
    return new CategoryResponse(c.getId(), c.getName(), ...);
  }
}
```

**メリット:**
- コードが直感的で、デバッグしやすい
- フィールドマッピングのロジックが1ファイルに集まる
- IDE でトレースしやすい（生成コードをたどる必要がない）

**デメリット:**
- フィールドが増えると退屈なボイラープレートが増える
- 書き忘れ・コピペミスが起きやすい

### MapStruct（TaskMapper）

```java
@Mapper(componentModel = "spring")
public interface TaskMapper {
  @Mapping(target = "category", source = "category")
  TaskResponse toResponse(Task task);
}
```

**メリット:**
- コンパイル時にコード生成されるため、実行時オーバーヘッドがない
- フィールド名が一致する場合は自動マッピング（書くコードが激減）
- マッピング漏れをコンパイルエラーで検出できる（実行時でなく）
- ネストしたオブジェクト（Category → CategorySummary）も自動解決

**デメリット:**
- 生成コードを読まないと動作を理解しにくい場面がある
- 複雑な業務ロジック（ownerの設定、statusの初期値）は自動マッピングに乗せると危険なため手動に戻した
- `@Mapping` アノテーションが増えると宣言的すぎて読みにくくなる

## 決定

- **Task マッパー**: MapStruct（`toResponse` のような純粋な変換は恩恵が大きい）
- **Category マッパー**: 手書きのまま維持（比較対象として残す。フィールド数が少なく変換が単純）
- **Entity への詰め替え（toEntity / applyUpdate）**: 手動実装（業務ルールがあるため MapStruct の自動化は危険）

## 教訓

MapStruct は「DTO → DTO」「Entity → DTO」のような純粋なフィールドコピーに強い。
業務ルールが混入する変換（owner の設定、status の初期値）は手動で制御する。
