## 練習問題 模範解答

### 問題1: SELECT DISTINCT の実行結果予想

```sql
SELECT DISTINCT role FROM users ORDER BY role;
```

**想定される実行結果:**

```text
   role
──────────
 admin
 instructor
 learner
```

`DISTINCT` で重複を除去し、`ORDER BY role` でアルファベット昇順に並ぶ。`users` テーブルに存在するロール種別が1行ずつ表示される。

---

### 問題2: 別名をつけるSELECT文

```sql
SELECT
  name  AS "名前",
  email AS "メール"
FROM users;
```

またはシングルクォートでも可（PostgreSQLでは `AS` は省略可）:

```sql
SELECT
  name  "名前",
  email "メール"
FROM users;
```

**実行結果のイメージ:**

```text
 名前      | メール
-----------+---------------------
 山田 太郎  | yamada@example.com
 鈴木 花子  | suzuki@example.com
```

---

### 問題3: SELECT * を本番コードで使うべきでない理由

1. **不要なデータ転送が発生する**: テーブルのすべてのカラムを取得するため、ネットワーク帯域やメモリを無駄に消費する。特に大量データや画像URLなどの大きな値が含まれる場合、パフォーマンスに影響する。

2. **テーブル変更に弱い**: 後でカラムが追加・削除された場合、`SELECT *` のクエリはその変更に気づけず、アプリケーション側で予期しない動作（余分なカラム、カラム順の変化）が起こりうる。必要なカラムを明示することで、変更の影響を早期に検出できる。
