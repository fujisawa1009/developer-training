## 練習問題 模範解答

### 問題1: ロール別の人数を多い順に

```sql
SELECT
  role,
  COUNT(*) AS 人数
FROM users
GROUP BY role
ORDER BY 人数 DESC;
```

---

### 問題2: カテゴリ別の集計 + HAVING

```sql
SELECT
  category,
  COUNT(*)            AS 商品数,
  ROUND(AVG(price), 0) AS 平均価格
FROM products
GROUP BY category
HAVING AVG(price) >= 3000
ORDER BY 平均価格 DESC;
```

**ポイント:**
- `HAVING` はGROUP BY後の集計結果に対して条件を適用する
- `WHERE` は集計前の行に対して適用するため、集計関数（`AVG`など）は使えない

---

### 問題3: エラーの理由と修正

**エラーの理由:**
`GROUP BY department_id` でグループ化しているとき、SELECT句に `name` を含めることができない。`name` はグループ内で複数の異なる値を持つ可能性があり、DBは「どの `name` を表示すべきか」がわからないためエラーになる（集計キー以外のカラムはSELECTできない）。

**修正版（どのnameを表示するかを集計関数で明示）:**

```sql
-- 方法①: name もGROUP BYに含める
SELECT department_id, name, COUNT(*) AS 人数
FROM users
GROUP BY department_id, name;

-- 方法②: 特定の代表値を使う（例: MIN, MAX, 任意の1件）
SELECT department_id, MIN(name) AS 代表者名, COUNT(*) AS 人数
FROM users
GROUP BY department_id;
```

通常は方法①（グループ化したいカラムをすべてGROUP BYに列挙）が正しい。
